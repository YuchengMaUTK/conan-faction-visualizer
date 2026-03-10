/**
 * Scrape character appearance counts from Detective Conan Wiki.
 * Fetches the main character page and extracts chapter/episode counts
 * from the Statistics infobox (e.g. "Chapters: 41", "Episodes: 30").
 *
 * Usage:  npx tsx scripts/scrape-appearances.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIKI = 'https://www.detectiveconanworld.com/wiki';

const WIKI_NAMES: Record<string, string> = {
  shinichi: 'Shinichi_Kudo',
  ran: 'Ran_Mouri',
  conan: 'Conan_Edogawa',
  heiji: 'Heiji_Hattori',
  kazuha: 'Kazuha_Toyama',
  akai: 'Shuichi_Akai',
  amuro: 'Toru_Amuro',
  gin: 'Gin',
  vodka: 'Vodka',
  vermouth: 'Vermouth',
  haibara: 'Ai_Haibara',
  jodie: 'Jodie_Starling',
  sato: 'Miwako_Sato',
  takagi: 'Wataru_Takagi',
  miyano_akemi: 'Akemi_Miyano',
  rum: 'Kanenori_Wakita',
  hakuba: 'Saguru_Hakuba',
  aoko: 'Aoko_Nakamori',
  matsuda: 'Jinpei_Matsuda',
  hagiwara: 'Kenji_Hagiwara',
  chiba: 'Kazunobu_Chiba',
  miike: 'Naeko_Miike',
  sera: 'Masumi_Sera',
  subaru: 'Subaru_Okiya',
  kogoro: 'Kogoro_Mouri',
  agasa: 'Hiroshi_Agasa',
  ayumi: 'Ayumi_Yoshida',
  mitsuhiko: 'Mitsuhiko_Tsuburaya',
  genta: 'Genta_Kojima',
  chianti: 'Chianti',
  korn: 'Korn',
  kir: 'Kir',
};

interface Counts { chapters: number | null; episodes: number | null; }

async function fetchFromMainPage(wikiName: string): Promise<Counts> {
  const url = `${WIKI}/${wikiName}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { chapters: null, episodes: null };
    const html = await res.text();

    // Look for "Appearances:" section in the infobox, then extract
    // "Chapters: <a>N</a>" and "Episodes: <a>N</a>"
    // Pattern: Chapters:\s*<a[^>]*>(\d+)</a>
    const chapterMatches = [...html.matchAll(/Chapters:\s*<a[^>]*>(\d+)<\/a>/g)];
    const episodeMatches = [...html.matchAll(/Episodes:\s*<a[^>]*>(\d+)<\/a>/g)];

    // Take the first (largest) chapter count and first episode count
    const chapters = chapterMatches.length > 0
      ? Math.max(...chapterMatches.map(m => parseInt(m[1])))
      : null;
    const episodes = episodeMatches.length > 0
      ? Math.max(...episodeMatches.map(m => parseInt(m[1])))
      : null;

    return { chapters, episodes };
  } catch {
    console.error(`  Failed to fetch ${url}`);
    return { chapters: null, episodes: null };
  }
}

async function main() {
  const dataPath = resolve(__dirname, '../public/conan-data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  console.log('Scraping appearance counts from Detective Conan Wiki...\n');

  for (const char of data.characters) {
    const wikiName = WIKI_NAMES[char.id];
    if (!wikiName) {
      console.log(`  [SKIP] ${char.id} — no wiki mapping`);
      continue;
    }

    console.log(`  Fetching ${char.name} (${wikiName})...`);
    const counts = await fetchFromMainPage(wikiName);

    if (counts.episodes !== null) {
      console.log(`    Episodes: ${char.appearanceCount.episodeCount} → ${counts.episodes}`);
      char.appearanceCount.episodeCount = counts.episodes;
    } else {
      console.log(`    Episodes: not found, keeping ${char.appearanceCount.episodeCount}`);
    }
    if (counts.chapters !== null) {
      console.log(`    Chapters: ${char.appearanceCount.mentionCount} → ${counts.chapters}`);
      char.appearanceCount.mentionCount = counts.chapters;
    } else {
      console.log(`    Chapters: not found, keeping ${char.appearanceCount.mentionCount}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
  console.log('\n✅ Updated conan-data.json');
}

main();
