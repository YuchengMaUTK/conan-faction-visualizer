/**
 * Scrape character profile images from Detective Conan Wiki.
 * Extracts the profile image URL from each character's wiki page
 * and updates conan-data.json avatar fields.
 *
 * Usage:  npx tsx scripts/scrape-avatars.ts
 */

import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { fetchPage, delay, loadData, saveData, extractAvatar, WIKI_URL } from './lib/wiki-utils.ts';

const limit = pLimit(3);

async function main() {
  const data = loadData();
  console.log('Scraping profile images from Detective Conan Wiki...\n');

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const tasks = data.entities.map((entity: any) =>
    limit(async () => {
      if (!entity.wiki_url) {
        console.log(`  [SKIP] ${entity.entity_id} — no wiki_url`);
        skipped++;
        return;
      }

      console.log(`  Fetching ${entity.true_name.en} ...`);
      const html = await fetchPage(entity.wiki_url);
      await delay(500);

      if (!html) {
        console.log(`    ❌ Failed to fetch page`);
        failed++;
        return;
      }

      const $ = cheerio.load(html);
      const avatarUrl = extractAvatar($);

      if (!avatarUrl) {
        console.log(`    ❌ No image found`);
        failed++;
        return;
      }

      // Update avatar on all personas
      for (const persona of entity.personas ?? []) {
        persona.avatar = avatarUrl;
      }
      console.log(`    ✅ ${avatarUrl.slice(0, 80)}...`);
      updated++;
    })
  );

  await Promise.all(tasks);

  saveData(data);
  console.log(`\n✅ Done — updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
}

main();
