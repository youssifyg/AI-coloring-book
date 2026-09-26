import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'templates');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function createDummy(name) {
  const svg = `
    <svg width="800" height="1131">
      <rect width="100%" height="100%" fill="white" />
      <text x="400" y="100" font-size="40" text-anchor="middle" fill="black">Dummy Template: ${name}</text>
      <!-- Stick figure body connected to X:400, Y:400 -->
      <line x1="400" y1="400" x2="400" y2="700" stroke="black" stroke-width="10" />
      <line x1="400" y1="500" x2="250" y2="600" stroke="black" stroke-width="10" />
      <line x1="400" y1="500" x2="550" y2="600" stroke="black" stroke-width="10" />
      <line x1="400" y1="700" x2="300" y2="900" stroke="black" stroke-width="10" />
      <line x1="400" y1="700" x2="500" y2="900" stroke="black" stroke-width="10" />
      <!-- Outline for head placement expectation -->
      <circle cx="400" cy="275" r="125" fill="none" stroke="#ccc" stroke-width="2" stroke-dasharray="5,5" />
    </svg>
  `;
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, name + '.png'));
}

createDummy('template_girl').then(() => createDummy('template_boy')).then(() => console.log('Dummies created')).catch(console.error);
