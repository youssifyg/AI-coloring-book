import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, 'templates');
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

const themes = {
  princess: { char: "fairy tale princess girl", scenes: ["standing at castle gates", "wearing a sparkling tiara", "holding a magic wand", "having a tea party", "with a magical unicorn", "reading a giant spellbook", "dancing in a royal ballroom", "riding a pumpkin carriage", "feeding a little friendly dragon", "waving from a castle balcony"] },
  space_girl: { char: "astronaut girl", scenes: ["standing on the moon", "floating in zero gravity space", "piloting a rocket ship", "meeting a friendly alien", "driving a moon rover", "looking at the ringed planet Saturn", "planting a flag on a new planet", "high-fiving a robot", "flying with a futuristic jetpack", "looking through a telescope at stars"] },
  safari_girl: { char: "safari explorer girl", scenes: ["standing near the jungle edge", "watching a friendly lion", "feeding a gentle elephant", "looking up at a tall giraffe", "swinging on a jungle vine", "riding a wooden boat on a river", "standing near a baby hippo", "exploring ancient stone ruins", "looking at a squawking parrot", "sitting by a warm campfire"] },
  superhero: { char: "superhero boy with cape", scenes: ["standing on a tall building roof", "flying super fast in the sky", "lifting a heavy car with one hand", "facing a giant robot villain", "shooting safe lasers from his hands", "waving to citizens cheering", "running super fast leaving a trail", "high-fiving a friendly police officer", "standing proudly at sunset", "reading a comic book in a secret base"] },
  pirate: { char: "brave pirate boy", scenes: ["standing proudly on a pirate ship", "with a friendly parrot on his shoulder", "sailing a ship through big crashing waves", "looking through a brass telescope", "digging a hole on a sandy beach", "opening a shiny treasure chest", "sword fighting playfully on the beach", "standing near a friendly giant octopus", "eating a large tropical fruit", "sailing the ship into a beautiful sunset"] },
  dino_boy: { char: "dinosaur explorer boy", scenes: ["looking at giant dinosaur footprints", "feeding leaves to a tall Brachiosaurus", "hiding behind a rock from a T-Rex", "riding on the back of a Triceratops", "standing near a prehistoric smoking volcano", "finding a nest of dinosaur eggs", "smiling at a hatching baby dinosaur", "walking in a thick prehistoric jungle", "sketching a Stegosaurus in a notebook", "waving goodbye to his dinosaur friends"] }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function run() {
  const tasks = [];
  for (const [themeId, themeData] of Object.entries(themes)) {
    for (let i = 0; i < 10; i++) {
      tasks.push({ themeId, i, char: themeData.char, sceneDesc: themeData.scenes[i] });
    }
  }

  console.log(`Downloading ${tasks.length} templates sequentially to avoid 429...`);
  
  for (const task of tasks) {
    const dest = path.join(templatesDir, `${task.themeId}_${task.i + 1}.png`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Skipping ${task.themeId}_${task.i + 1}.png (already exists)`);
      continue;
    }
    
    const prompt = `Black and white coloring book page, crisp bold vector outlines, pure white background, no shading, 2D line art. Cute young ${task.char}, ${task.sceneDesc}, facing forward looking at camera.`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&nologo=true`;
    
    console.log(`Downloading ${task.themeId}_${task.i + 1}.png...`);
    try {
      await downloadImage(url, dest);
      await delay(1000); // Wait 1s between requests to avoid rate limits
    } catch (e) {
      console.error(`Failed to download ${dest}`, e.message);
      await delay(2000);
    }
  }
  console.log("All 60 templates processed successfully!");
}

run();
