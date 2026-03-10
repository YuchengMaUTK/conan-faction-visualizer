/**
 * Download all avatar images from conan-data.json to public/avatars/
 * and update the JSON to use local paths.
 *
 * Usage: npx tsx scripts/download-avatars.ts
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const DATA_PATH = 'public/conan-data.json';
const AVATARS_DIR = 'public/avatars';

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (location) {
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(location, dest).then(resolve, reject);
        }
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  // Ensure avatars directory exists
  if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  // Collect all unique avatar URLs with their persona_id
  const avatarMap = new Map<string, { url: string; ext: string }>();

  for (const entity of data.entities) {
    for (const persona of entity.personas) {
      if (!persona.avatar || !persona.avatar.startsWith('http')) continue;
      const url = persona.avatar;
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      avatarMap.set(persona.persona_id, { url, ext });
    }
  }

  console.log(`Found ${avatarMap.size} avatars to download.\n`);

  let success = 0;
  let failed = 0;

  for (const [personaId, { url, ext }] of avatarMap) {
    const filename = `${personaId}${ext}`;
    const dest = path.join(AVATARS_DIR, filename);

    // Skip if already downloaded
    if (fs.existsSync(dest)) {
      console.log(`  ✓ ${personaId} (already exists)`);
      success++;
      continue;
    }

    process.stdout.write(`  ↓ ${personaId}... `);
    try {
      await downloadFile(url, dest);
      console.log('OK');
      success++;
    } catch (err: any) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }
    // Be polite
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDownloaded: ${success}, Failed: ${failed}\n`);

  // Update conan-data.json: replace remote URLs with local paths
  let updated = 0;
  for (const entity of data.entities) {
    for (const persona of entity.personas) {
      const info = avatarMap.get(persona.persona_id);
      if (!info) continue;
      const filename = `${persona.persona_id}${info.ext}`;
      const localDest = path.join(AVATARS_DIR, filename);
      if (fs.existsSync(localDest)) {
        // Use path relative to public/ so Vite serves it correctly
        persona.avatar = `avatars/${filename}`;
        updated++;
      }
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${updated} avatar paths in ${DATA_PATH}`);
}

main().catch(console.error);
