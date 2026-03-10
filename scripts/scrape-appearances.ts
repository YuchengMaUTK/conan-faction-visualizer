/**
 * Scrape character appearance counts from Detective Conan Wiki.
 *
 * Usage:  npx tsx scripts/scrape-appearances.ts
 *
 * For each character whose wiki page name is known, fetches the
 * "{Name}_Appearances" page and extracts Manga chapter count and
 * Anime episode count, then patches conan-data.json in-place.
 */

const WIKI = 'https://www.detectiveconanworld.com/wiki';

/** Map character id → wiki page name (used to build Appearances URL) */
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
  rum: 'Rum',
  hakuba: 'Saguru_Hakuba',
  aoko: 'Aoko_Nakamori',
  matsuda: 'Jinpei_Matsuda',
  hagiwara: 'Kenji_Hagiwara',
  chiba: 'Kazunobu_Chiba',
  miike: 'Naeko_Miike',
  sera: 'Masumi_Sera',
  subaru: 'Subaru_Okiya',
  // New characters
  kogoro: 'Kogoro_Mouri',
  agasa: 'Hiroshi_Agasa',
  ayumi: 'Ayumi_Yoshida',
  mitsuhiko: 'Mitsuhiko_Tsuburaya',
  genta: 'Genta_Kojima',
  chianti: 'Chianti',
  korn: 'Korn',
  kir: 'Kir',
};

interface Counts {
  manga: number | null;
  anime: number | null;
}

async function fetchAppearances(wikiName: string): Promise<Counts> {
  const url = `${WIKI}/${wikiName}_Appearances`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { manga: null, anime: null };
    const html = await res.text();

    // Extract "Total number of appearances: **N**" per section
    // Manga section comes first, then Anime
    const totals = [...html.matchAll(/Total number of appearances:\s*<b>(\d+)<\/b>/g)];

    // The page structure: first total = Manga, second total = Anime
    const manga = totals[0] ? parseInt(totals[0][1]) : null;
    const anime = totals[1] ? parseInt(totals[1][1]) : null;

    return { manga, anime };
  } catch {
    console.error(`  Failed to fetch ${url}`);
    return { manga: null, anime: null };
  }
}

async function main() {
  const fs = await import('fs');
  const path = await import('path');

  const dataPath = path.resolve(__dirname, '../public/conan-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log('Scraping appearance counts from Detective Conan Wiki...\n');

  for (const char of data.characters) {
    const wikiName = WIKI_NAMES[char.id];
    if (!wikiName) {
      console.log(`  [SKIP] ${char.id} — no wiki mapping`);
      continue;
    }

    console.log(`  Fetching ${char.name} (${wikiName})...`);
    const counts = await fetchAppearances(wikiName);

    if (counts.anime !== null) {
      console.log(`    Episodes: ${char.appearanceCount.episodeCount} → ${counts.anime}`);
      char.appearanceCount.episodeCount = counts.anime;
    }
    if (counts.manga !== null) {
      console.log(`    Chapters (as mentionCount): ${char.appearanceCount.mentionCount} → ${counts.manga}`);
      char.appearanceCount.mentionCount = counts.manga;
    }

    // Rate limit: be polite to the wiki
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
  console.log('\n✅ Updated conan-data.json');
}

main();
