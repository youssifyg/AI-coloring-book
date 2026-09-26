import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    console.log("Testing Google Image Generation API...");
    try {
        const response = await ai.models.generateImages({
            model: 'gemini-3-pro-image', // Testing the model name
            prompt: 'A simple black and white line art of a cat',
            config: { numberOfImages: 1, aspectRatio: "3:4", outputMimeType: "image/png" }
        });
        console.log("✅ SUCCESS! Image generated. Base64 length:", response.generatedImages[0].image.imageBytes.length);
    } catch (e) {
        console.error("❌ ERROR DETAILS:");
        console.error(e);
        
        // If model name is invalid, let's list available models to find the correct Imagen model ID
        console.log("\nFetching available models to find the correct Imagen ID...");
        try {
            // Note: with @google/genai SDK, models.list() returns an async iterable
            for await (const m of await ai.models.list()) {
                if (m.name.toLowerCase().includes('image') || m.name.toLowerCase().includes('gemini')) {
                    console.log("Available Model:", m.name);
                }
            }
        } catch (listErr) {
            console.error("Failed to list models:", listErr.message);
        }
    }
}
test();
