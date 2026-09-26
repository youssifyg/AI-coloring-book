import Replicate from "replicate";
import dotenv from "dotenv";

dotenv.config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "placeholder",
});

export async function generateImage(prompt, photoUrl) {
  if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === "your_replicate_api_token_here") {
    console.log("No valid Replicate API token found, simulating image generation.");
    return null;
  }

  const prefix = "black and white coloring book page for children, crisp clean outlines, bold vector lines, pure white background, no shading, no gradients, no grey, 2D linework, coloring book sheet. ";
  const fullPrompt = prefix + prompt;

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: fullPrompt,
        }
      }
    );
    
    if (Array.isArray(output) && output.length > 0) {
      return output[0];
    }
    
    return typeof output === "string" ? output : null;
  } catch (error) {
    console.error("Error generating image with Replicate:", error);
    return null;
  }
}
