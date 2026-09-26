import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function uploadReferenceImage(localImagePath) {
    try {
        const uploadedFile = await ai.files.upload({ file: localImagePath });
        return uploadedFile;
    } catch (error) {
        console.error("Failed to upload reference image:", error);
        throw error;
    }
}

export async function deleteReferenceImage(fileName) {
    try {
        await ai.files.delete({ name: fileName });
    } catch (error) {
        console.error("Failed to delete reference image:", error);
    }
}

export async function generateSceneImage(fileUri, fileMimeType, scenePrompt) {
    const strictPrompt = `High quality black and white coloring book page for kids, crisp bold vector outlines, pure white background, no shading.
    CRITICAL INSTRUCTION: Use the provided reference image to draw the main character. The character's face, hair, and essence MUST strongly resemble the child in the photo.
    SCENE: ${scenePrompt}.
    CRITICAL CONSTRAINTS: SINGLE panel, ONE frame only. DO NOT split the screen. DO NOT duplicate the character. Draw only ONE unified scene with ONE main character.`;

    try {
        const response = await ai.interactions.create({
            model: 'gemini-3.1-flash-image',
            input: [
                { text: strictPrompt, type: 'text' },
                { uri: fileUri, mime_type: fileMimeType || 'image/jpeg', type: 'image' }
            ]
        });
        return `data:${response.output_image.mime_type};base64,${response.output_image.data}`;
    } catch (e) {
        console.error("Generation failed:", e.message);
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
}
