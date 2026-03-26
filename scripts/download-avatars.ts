/**
 * Download all avatar images from conan-data.json to public/avatars/
 * and update the JSON to use local paths.
 *
 * Usage: npx tsx scripts/download-avatars.ts
 */

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import pLimit from 'p-limit';
import { loadData, saveData, delay } from './lib/wiki-utils.ts';

const AVATARS_DIR = 'public/avatars';

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(dest));
}

async function main() {
  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

  const data = loadData();
  const limit = pLimit(5);

  // Collect all unique avatar URLs with their persona_id
  const avatarMap = new Map<string, { url: string; ext: string }>();
  for (const entity of data.entities) {
    for (const persona of entity.personas) {
      if (!persona.avatar || !persona.avatar.startsWith('http')) continue;
      const ext = path.extname(new URL(persona.avatar).pathname) || '.jpg';
      avatarMap.set(persona.persona_id, { url: persona.avatar, ext });
    }
  }

  console.log(`Found ${avatarMap.size} avatars to download.\n`);

  let success = 0;
  let failed = 0;

  const tasks = [...avatarMap.entries()].map(([personaId, { url, ext }]) =>
    limit(async () => {
      const filename = `${personaId}${ext}`;
      const dest = path.join(AVATARS_DIR, filename);

      if (fs.existsSync(dest)) {
        console.log(`  ✓ ${personaId} (already exists)`);
        success++;
        return;
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
      await delay(300);
    })
  );

  await Promise.all(tasks);
  console.log(`\nDownloaded: ${success}, Failed: ${failed}\n`);

  // Update conan-data.json: replace remote URLs with local paths
  let updated = 0;
  for (const entity of data.entities) {
    for (const persona of entity.personas) {
      const info = avatarMap.get(persona.persona_id);
      if (!info) continue;
      const filename = `${persona.persona_id}${info.ext}`;
      if (fs.existsSync(path.join(AVATARS_DIR, filename))) {
        persona.avatar = `avatars/${filename}`;
        updated++;
      }
    }
  }

  saveData(data);
  console.log(`Updated ${updated} avatar paths in conan-data.json`);
}

main().catch(console.error);
