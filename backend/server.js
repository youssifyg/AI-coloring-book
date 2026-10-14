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
import {
  uploadReferenceImage,
  deleteReferenceImage,
  validateAndExtractCharacter,
  generateCoverImage,
  generateSceneImage
} from "./aiService.js";
import fsPromises from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.GEMINI_API_KEY) {
  console.error('CRITICAL ERROR: GEMINI_API_KEY is not defined in process.env');
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const cairoFontPath = path.join(__dirname, "fonts", "Cairo-Variable.ttf");
let cairoFontBase64 = "";
if (fs.existsSync(cairoFontPath)) {
  cairoFontBase64 = fs.readFileSync(cairoFontPath).toString("base64");
}

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
    if (photo) await fsPromises.unlink(photo.path).catch(() => {});
    return res.status(400).json({ error: "Missing required fields (templateId, childName)" });
  }

  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    if (photo) await fsPromises.unlink(photo.path).catch(() => {});
    return res.status(400).json({ error: "Invalid templateId" });
  }

  try {
    const photoPath = photo ? photo.path : null;
    if (!photoPath) {
      throw new Error("No valid photo uploaded");
    }
    
    console.log("Uploading reference image once to AI Studio...");
    refImage = await uploadReferenceImage(photoPath);

    // Pre-flight check & Character Lock
    let characterLockDescription = "";
    try {
      console.log("Validating API quota and extracting character lock...");
      characterLockDescription = await validateAndExtractCharacter(refImage.uri, refImage.mimeType);
      console.log("Character Lock extracted:", characterLockDescription);
    } catch (preflightError) {
      console.error("Runtime Failure Details (Pre-flight Quota/Auth):", preflightError);
      return res.status(429).json({
        error: "عفواً، رصيد الـ API غير كافٍ حالياً أو تم تجاوز الحد المسموح في Google Studio. لم يتم البدء في العملية.",
        details: preflightError.message
      });
    }

    // Step 1: Generate Full-Color Cover Image
    console.log("Generating full-color cover image...");
    const coverImageUri = await generateCoverImage(
      template.coverPrompt || template.description,
      refImage.uri,
      refImage.mimeType,
      characterLockDescription
    );
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Step 2: Generate Coloring Scenes
    console.log("Generating coloring scenes via Interactions API...");
    const sceneResults = [];
    
    for (let i = 0; i < template.scenes.length; i++) {
      const scene = template.scenes[i];
      console.log(`Generating scene ${i + 1}/${template.scenes.length}: ${scene.prompt}...`);
      
      const base64Img = await generateSceneImage(
        scene.prompt,
        refImage.uri,
        refImage.mimeType,
        characterLockDescription
      );
      
      sceneResults.push({
        caption: scene.text,
        imageUri: base64Img
      });
      
      // 2.5 second delay to respect API rate limits
      if (i < template.scenes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    // Step 3: Build HTML for Puppeteer
    let scenesHtml = "";
    for (const result of sceneResults) {
      scenesHtml += `
        <div class="scene-page">
          <img class="scene-image" src="${result.imageUri}" alt="Coloring Page" />
          <div class="scene-caption">${escapeHtml(result.caption)}</div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&display=swap" rel="stylesheet">
          <style>
              @page { size: A4; margin: 0; }
              ${cairoFontBase64 ? `
              @font-face {
                  font-family: 'Cairo';
                  src: url('data:font/truetype;charset=utf-8;base64,${cairoFontBase64}') format('truetype');
                  font-weight: 100 900;
                  font-style: normal;
              }` : ''}
              body { 
                  font-family: 'Cairo', sans-serif; 
                  margin: 0; 
                  padding: 0; 
                  background-color: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
              }
              .cover-page { 
                  position: relative;
                  width: 210mm;
                  height: 296mm; 
                  padding: 0;
                  margin: 0;
                  overflow: hidden;
                  page-break-after: always; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: space-between; 
                  align-items: center; 
                  box-sizing: border-box;
              }
              .cover-bg-image {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  position: absolute;
                  top: 0;
                  left: 0;
                  z-index: 1;
              }
              .cover-banner {
                  z-index: 2;
                  background: rgba(255, 255, 255, 0.88);
                  border: 4px solid #222;
                  border-radius: 20px;
                  padding: 20px 40px;
                  margin-top: 35px;
                  text-align: center;
                  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
                  max-width: 80%;
                  box-sizing: border-box;
              }
              .cover-child-name {
                  font-size: 52px;
                  font-weight: 800;
                  color: #1a1a1a;
                  margin-bottom: 8px;
                  line-height: 1.2;
              }
              .cover-story-title {
                  font-size: 36px;
                  font-weight: 700;
                  color: #333333;
                  margin-bottom: 6px;
                  line-height: 1.3;
              }
              .cover-story-subtitle {
                  font-size: 24px;
                  font-weight: 600;
                  color: #555555;
              }
              .cover-bottom-badge {
                  z-index: 2;
                  background: rgba(255, 255, 255, 0.92);
                  border: 3px solid #333;
                  border-radius: 25px;
                  padding: 10px 30px;
                  margin-bottom: 35px;
                  font-size: 24px;
                  font-weight: 700;
                  color: #222;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              }
              .scene-page { 
                  height: 296mm; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: flex-start; 
                  padding: 15px 20px; 
                  box-sizing: border-box; 
                  page-break-after: always; 
                  text-align: center; 
              }
              .scene-image { 
                  width: 96%; 
                  height: 920px; 
                  max-height: 245mm; 
                  margin-top: 10px; 
                  margin-bottom: 12px; 
                  border: 3px solid #000; 
                  border-radius: 8px;
                  object-fit: contain;
              }
              .scene-caption { 
                  font-size: 26px; 
                  font-weight: 700; 
                  color: #111;
              }
          </style>
      </head>
      <body>
          <div class="cover-page">
              <img class="cover-bg-image" src="${coverImageUri}" alt="Cover Background" />
              <div class="cover-banner">
                  <div class="cover-child-name">${escapeHtml(childName)}</div>
                  <div class="cover-story-title">${escapeHtml(template.title)}</div>
                  <div class="cover-story-subtitle">${escapeHtml(template.subtitle)}</div>
              </div>
              <div class="cover-bottom-badge">كتاب التلوين السحري ✨</div>
          </div>
          ${scenesHtml}
      </body>
      </html>
    `;

    // Step 4: Render PDF using Puppeteer
    console.log("Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage' ]
    });
    const page = await browser.newPage();
    
    // Set high resolution viewport (150-300 DPI equivalent) for print sharpness
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    
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
    console.error('Runtime Failure Details:', error);
    if (!res.headersSent) {
      const isQuotaOrAuth = 
        error.status === 402 ||
        error.status === 429 ||
        error.message?.includes('402') || 
        error.message?.includes('429') || 
        error.message?.includes('RESOURCE_EXHAUSTED') || 
        error.message?.includes('depleted') ||
        error.message?.includes('API_QUOTA_OR_AUTH_FAILED');

      const statusCode = isQuotaOrAuth ? 429 : 500;
      const userMessage = isQuotaOrAuth
        ? "عفواً، رصيد الـ API غير كافٍ حالياً أو تم تجاوز الحد المسموح في Google Studio. لم يتم البدء في العملية."
        : "فشل في إنشاء كتاب التلوين. يرجى التحقق من الرصيد أو المحاولة لاحقاً.";

      res.status(statusCode).json({ error: userMessage, details: error.message });
    }
  } finally {
    if (browser) await browser.close();
    
    if (refImage && refImage.name) {
      console.log("Cleaning up reference image from Google servers...");
      await deleteReferenceImage(refImage.name);
    }
    
    if (photo) {
      await fsPromises.unlink(photo.path).catch(() => {});
    }
  }
});

app.use((err, req, res, next) => {
  console.error('Runtime Failure Details:', err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
