import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { templates } from "./templates.js";
import { uploadReferenceImage, deleteReferenceImage, generateSceneImage } from "./aiService.js";
import fsPromises from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for file uploads
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/templates", (req, res) => {
  const summarizedTemplates = templates.map((t) => ({
    id: t.id,
    gender: t.gender,
    title: t.title,
    subtitle: t.subtitle,
    icon: t.icon,
    description: t.description,
    sceneCount: t.scenes.length,
  }));
  res.json(summarizedTemplates);
});

app.post("/api/generate-book", upload.single("photo"), async (req, res) => {
  const { templateId, childName } = req.body;
  const photo = req.file;
  let browser;
  let refImage = null;

  if (!templateId || !childName) {
    if (photo) fs.unlinkSync(photo.path);
    return res.status(400).json({ error: "Missing required fields (templateId, childName)" });
  }

  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    if (photo) fs.unlinkSync(photo.path);
    return res.status(400).json({ error: "Invalid templateId" });
  }

  try {
    const photoPath = photo && fs.existsSync(photo.path) ? photo.path : null;
    if (!photoPath) {
      throw new Error("No valid photo uploaded");
    }
    
    console.log("Uploading reference image once to AI Studio...");
    refImage = await uploadReferenceImage(photoPath);

    console.log("Generating scenes via Interactions API...");
    const sceneResults = [];
    
    for (let i = 0; i < template.scenes.length; i++) {
      const scene = template.scenes[i];
      console.log(`Generating scene ${i + 1}/10: ${scene.prompt}...`);
      
      const base64Img = await generateSceneImage(refImage.uri, refImage.mimeType, scene.prompt);
      
      sceneResults.push({
        caption: scene.text,
        imageUri: base64Img
      });
      
      // 2.5 second delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    // Step 2: Build HTML for Puppeteer
    let scenesHtml = "";
    for (const result of sceneResults) {
      scenesHtml += `
        <div class="scene-page">
          <img class="scene-image" src="${result.imageUri}" />
          <div class="scene-caption">${result.caption}</div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap" rel="stylesheet">
          <style>
              @page { size: A4; margin: 0; }
              body { 
                  font-family: 'Cairo', sans-serif; 
                  margin: 0; 
                  padding: 0; 
                  background-color: white;
              }
              .cover-page { 
                  height: 296mm; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  page-break-after: always; 
                  text-align: center; 
                  padding: 40px;
                  box-sizing: border-box;
              }
              .scene-page { 
                  height: 296mm; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: flex-start; 
                  padding: 40px; 
                  box-sizing: border-box; 
                  page-break-after: always; 
                  text-align: center; 
              }
              .scene-image { 
                  max-width: 90%; 
                  max-height: 700px; 
                  margin-top: 50px; 
                  margin-bottom: 40px; 
                  border: 2px solid #000; 
                  object-fit: contain;
              }
              .scene-caption { 
                  font-size: 24px; 
                  font-weight: 700; 
              }
              .cover-title-main { font-size: 56px; font-weight: 700; margin-bottom: 10px; }
              .cover-title-sub { font-size: 42px; font-weight: 700; margin-bottom: 20px; }
              .cover-subtitle { font-size: 28px; margin-bottom: 40px; }
              .magic-title { font-size: 24px; color: #555; }
          </style>
      </head>
      <body>
          <div class="cover-page">
              <div class="cover-title-main">${childName}</div>
              <div class="cover-title-sub">${template.title}</div>
              <div class="cover-subtitle">${template.subtitle}</div>
              <div class="magic-title">كتاب التلوين السحري ✨</div>
          </div>
          ${scenesHtml}
      </body>
      </html>
    `;

    // Step 3: Render PDF using Puppeteer
    console.log("Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage' ]
    });
    const page = await browser.newPage();
    
    // Set content and wait for load. Timeout increased to 90s for base64 strings.
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 90000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // let images paint
    
    console.log("Generating PDF stream...");
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=coloring-book.pdf`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error("Error generating PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  } finally {
    if (browser) await browser.close();
    
    if (refImage && refImage.name) {
      console.log("Cleaning up reference image from Google servers...");
      await deleteReferenceImage(refImage.name);
    }
    
    if (photo && fs.existsSync(photo.path)) {
      fs.unlinkSync(photo.path);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
