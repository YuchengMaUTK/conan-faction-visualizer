/**
 * Scrape character profile images from Detective Conan Wiki.
 * Extracts the profile image URL from each character's wiki page
 * and updates conan-data.json avatar fields.
 *
 * Usage:  npx tsx scripts/scrape-avatars.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIKI_BASE = 'https://www.detectiveconanworld.com';
const WIKI = `${WIKI_BASE}/wiki`;

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

async function fetchProfileImage(wikiName: string): Promise<string | null> {
  const url = `${WIKI}/${wikiName}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();

    // Match the profile image in the infobox — typically the first large image
    // Pattern: src="/wiki/images/thumb/...Profile...(jpg|png)"
    const profileMatch = html.match(/src="(\/wiki\/images\/thumb\/[^"]*Profile[^"]*\.(jpg|png))"/i);
    if (profileMatch) return `${WIKI_BASE}${profileMatch[1]}`;

    // Fallback: first image with character name in the infobox area
    const namePattern = wikiName.replace(/_/g, '[_ ]');
    const re = new RegExp(`src="(/wiki/images/thumb/[^"]*${namePattern}[^"]*\\.(jpg|png))"`, 'i');
    const fallback = html.match(re);
    if (fallback) return `${WIKI_BASE}${fallback[1]}`;

    // Last resort: first infobox image
    const anyMatch = html.match(/class="infobox"[\s\S]*?src="(\/wiki\/images\/thumb\/[^"]*\.(jpg|png))"/i);
    if (anyMatch) return `${WIKI_BASE}${anyMatch[1]}`;

    return null;
  } catch {
    console.error(`  Failed to fetch ${url}`);
    return null;
  }
}

async function main() {
  const dataPath = resolve(__dirname, '../public/conan-data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  console.log('Scraping profile images from Detective Conan Wiki...\n');

  for (const char of data.characters) {
    const wikiName = WIKI_NAMES[char.id];
    if (!wikiName) {
      console.log(`  [SKIP] ${char.id}`);
      continue;
    }

    console.log(`  Fetching ${char.name} (${wikiName})...`);
    const imageUrl = await fetchProfileImage(wikiName);

    if (imageUrl) {
      console.log(`    ✅ ${imageUrl.slice(0, 80)}...`);
      char.avatar = imageUrl;
    } else {
      console.log(`    ❌ No image found, keeping current`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
  console.log('\n✅ Updated conan-data.json with wiki avatars');
}

main();
