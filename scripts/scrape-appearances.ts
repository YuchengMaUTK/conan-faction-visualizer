/**
 * Scrape character appearance counts from Detective Conan Wiki.
 * Fetches each character's wiki page and extracts chapter/episode counts
 * from the Statistics infobox.
 *
 * Usage:  npx tsx scripts/scrape-appearances.ts
 */

import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { fetchPage, delay, loadData, saveData, extractAppearanceCounts } from './lib/wiki-utils.ts';

const limit = pLimit(3);

async function main() {
  const data = loadData();
  console.log('Scraping appearance counts from Detective Conan Wiki...\n');

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
      const counts = extractAppearanceCounts($);

      const old = entity.base_appearances;
      if (counts.episodes !== null) {
        entity.base_appearances = counts.episodes;
        console.log(`    Episodes: ${old} → ${counts.episodes}`);
        updated++;
      } else {
        console.log(`    Episodes: not found, keeping ${old}`);
        failed++;
      }
    })
  );

  await Promise.all(tasks);

  saveData(data);
  console.log(`\n✅ Done — updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
}

main();
