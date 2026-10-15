import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
let _aiClient = null;

function getAIClient() {
    if (!_aiClient) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not defined in process.env");
        }
        _aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return _aiClient;
}

export async function uploadReferenceImage(localImagePath) {
    try {
        const ai = getAIClient();
        const uploadedFile = await ai.files.upload({ file: localImagePath });
        return uploadedFile;
    } catch (error) {
        console.error('Runtime Failure Details:', error);
        throw error;
    }
}

export async function deleteReferenceImage(fileName) {
    try {
        const ai = getAIClient();
        await ai.files.delete({ name: fileName });
    } catch (error) {
        console.error('Runtime Failure Details:', error);
    }
}

export async function validateAndExtractCharacter(referenceFileUri, mimeType) {
    const prompt = "Analyze this photo of a child. Return a strict, detailed physical descriptor string of the child to maintain character consistency in an illustrated children's book: exact age group, gender, face shape, skin tone, hairstyle, hair length, hair texture (straight, curly, wavy), hair color, eye shape, eye color, and any distinctive facial features (e.g., glasses, freckles, dimples, bangs). Output ONLY a concise, clear description in 2-3 sentences focusing strictly on visual character traits.";

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
                prompt,
                { fileData: { fileUri: referenceFileUri, mimeType: mimeType || 'image/jpeg' } }
            ]
        });

        if (!response || !response.text) {
            throw new Error("No description text returned from vision model");
        }

        return response.text.trim();
    } catch (error) {
        console.error('Runtime Failure Details in validateAndExtractCharacter:', error);
        const errMsg = error.message || String(error);
        const isQuotaOrAuth = 
            error.status === 429 ||
            error.status === 402 ||
            error.status === 401 ||
            error.status === 403 ||
            errMsg.includes('429') ||
            errMsg.includes('402') ||
            errMsg.includes('401') ||
            errMsg.includes('403') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('prepayment credits') ||
            errMsg.includes('API_KEY_INVALID');

        if (isQuotaOrAuth) {
            const quotaError = new Error("API_QUOTA_OR_AUTH_FAILED: " + errMsg);
            quotaError.status = error.status || 429;
            throw quotaError;
        }

        throw error;
    }
}

export async function withRetry(fn, maxRetries = 3) {
    const delays = [4000, 8000, 15000];
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fn();
            if (!response || !response.output_image || !response.output_image.data) {
                throw new Error("API returned response without valid output_image data");
            }
            return response;
        } catch (error) {
            lastError = error;
            console.error(`Runtime Failure Details (Attempt ${attempt}/${maxRetries}):`, error.message || error);

            const errMsg = (
                (error.message || '') + ' ' +
                (error.statusText || '') + ' ' +
                (error.details || '') + ' ' +
                String(error)
            ).toLowerCase();

            const isNonRetryable = 
                error.status === 402 ||
                error.status === 429 ||
                error.status === 401 ||
                error.status === 403 ||
                errMsg.includes('402') || 
                errMsg.includes('429') || 
                errMsg.includes('401') || 
                errMsg.includes('403') || 
                errMsg.includes('resource_exhausted') || 
                errMsg.includes('prepayment credits') || 
                errMsg.includes('depleted') ||
                errMsg.includes('quota') ||
                errMsg.includes('api_quota_or_auth_failed') ||
                errMsg.includes('api_key_invalid');

            if (isNonRetryable) {
                console.warn(`[withRetry] Fatal non-retryable error detected (${error.status || 'quota/credit exhaustion'}). Aborting immediately without retry.`);
                throw error;
            }

            if (attempt < maxRetries) {
                const delayMs = delays[attempt - 1] || 10000;
                console.log(`Waiting ${delayMs}ms before retry attempt ${attempt + 1}...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError ? (lastError.message || lastError) : 'Unknown error'}`);
}

export async function generateCoverImage(coverPrompt, referenceFileUri, mimeType, characterLockDescription) {
    const fullPrompt = `Vibrant, full-color 3D Disney/Pixar style children's book cover illustration, rich colors, high resolution, print quality, vertical portrait layout. CRITICAL CHARACTER LOCK: Use the reference image. The main character MUST have these exact features: ${characterLockDescription}. Keep the exact same facial structure and hairstyle. SCENE: ${coverPrompt}. Single unified framing, no text inside the generated image.`;

    const ai = getAIClient();
    const response = await withRetry(() => ai.interactions.create({
        model: 'gemini-3.1-flash-image',
        input: [
            { type: 'text', text: fullPrompt },
            { type: 'image', uri: referenceFileUri, mime_type: mimeType || 'image/jpeg' }
        ]
    }));

    return `data:${response.output_image.mime_type};base64,${response.output_image.data}`;
}

export async function generateSceneImage(scenePrompt, referenceFileUri, mimeType, characterLockDescription) {
    const fullPrompt = `High resolution, print-ready black and white coloring book page for kids, crisp bold clean vector line art, pure white background (#FFFFFF), zero grayscale, no shading, no solid black fills. CRITICAL CHARACTER LOCK: Use the provided reference image. The main character MUST strictly match these exact facial and hair features in every single page: ${characterLockDescription}. SCENE: ${scenePrompt}. CRITICAL CONSTRAINTS: SINGLE panel, ONE frame only, full body or clear medium shot, large clear outlines suitable for children to color.`;

    const ai = getAIClient();
    const response = await withRetry(() => ai.interactions.create({
        model: 'gemini-3.1-flash-image',
        input: [
            { type: 'text', text: fullPrompt },
            { type: 'image', uri: referenceFileUri, mime_type: mimeType || 'image/jpeg' }
        ]
    }));

    return `data:${response.output_image.mime_type};base64,${response.output_image.data}`;
}
