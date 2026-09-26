import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
        console.log("Preparing test image...");
        const testImgPath = 'test-reference.png';
        if (!fs.existsSync(testImgPath)) {
            // Write a tiny 1x1 test image
            fs.writeFileSync(testImgPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", 'base64'));
        }
        
        console.log("Uploading reference image...");
        const uploadedFile = await ai.files.upload({ file: testImgPath });
        console.log("Uploaded URI:", uploadedFile.uri);
        console.log("Uploaded MimeType:", uploadedFile.mimeType);
        
        const fullPrompt = "High quality black and white coloring book page for kids, crisp bold vector outlines, pure white background, no shading, no grayscale. Subject: A cute young child, exploring space. Style: simple line art, 2D vector, clean.";
        
        console.log("\nCalling ai.interactions.create with gemini-3.1-flash-image...");
        const interaction = await ai.interactions.create({
          model: "gemini-3.1-flash-image",
          input: [
            { type: "text", text: fullPrompt },
            { type: "image", uri: uploadedFile.uri, mime_type: uploadedFile.mimeType },
          ],
        });
        
        console.log("\n--- RAW INTERACTION OBJECT ---");
        console.dir(interaction, { depth: null });
        console.log("------------------------------\n");
        
        if (interaction.output_image && interaction.output_image.data) {
            console.log("✅ output_image.data IS present. Length:", interaction.output_image.data.length);
        } else {
            console.log("❌ output_image.data IS MISSING.");
        }
    } catch(e) {
        console.error("\n❌ TEST FAILED:");
        console.error(e);
    }
}

test();
