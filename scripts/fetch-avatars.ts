/**
 * Fetch character avatar URLs from Detective Conan Wiki
 * and update persona avatars in conan-data.json.
 *
 * Usage: npx tsx scripts/fetch-avatars.ts
 */

import { fetchPage, delay, loadData, saveData, extractAvatar, WIKI_URL } from './lib/wiki-utils.ts';
import pLimit from 'p-limit';
import * as cheerio from 'cheerio';

async function main() {
  console.warn('Note: Consider using scrape-wiki-entities.ts for comprehensive character scraping.');
  console.log('Fetching avatar URLs from Detective Conan Wiki...\n');

  const data = loadData();
  const limit = pLimit(3);
  let updated = 0;
  let failed = 0;

  const tasks = data.entities
    .filter((e: any) => e.wiki_url)
    .map((entity: any) =>
      limit(async () => {
        const url = entity.wiki_url.startsWith('http') ? entity.wiki_url : `${WIKI_URL}/${entity.wiki_url}`;
        process.stdout.write(`  ${entity.entity_id} ... `);

        const html = await fetchPage(url);
        if (!html) {
          console.log('FAILED (fetch)');
          failed++;
          return;
        }

        const $ = cheerio.load(html);
        const avatarUrl = extractAvatar($);
        if (!avatarUrl) {
          console.log('FAILED (no image)');
          failed++;
          return;
        }

        // Update all personas for this entity
        for (const persona of entity.personas) {
          persona.avatar = avatarUrl;
        }
        updated++;
        console.log(`OK: ${avatarUrl.slice(0, 80)}...`);

        await delay(500);
      })
    );

  await Promise.all(tasks);
  console.log(`\nUpdated: ${updated}, Failed: ${failed}\n`);

  saveData(data);
  console.log('Saved updated avatars to conan-data.json');
}

main().catch(console.error);
