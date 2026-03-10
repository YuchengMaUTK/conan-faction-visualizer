/**
 * Fetch character avatar URLs from Detective Conan Wiki.
 * Each character page has a profile image in the infobox table.
 * 
 * Usage: npx tsx scripts/fetch-avatars.ts
 */

const WIKI_BASE = 'https://www.detectiveconanworld.com/wiki';

// Map our character IDs to their wiki page names
const CHARACTER_WIKI_PAGES: Record<string, string> = {
  shinichi: 'Shinichi_Kudo',
  ran: 'Ran_Mouri',
  conan: 'Conan_Edogawa',
  heiji: 'Heiji_Hattori',
  kazuha: 'Kazuha_Toyama',
  akai: 'Shuichi_Akai',
  amuro: 'Rei_Furuya',
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
};

async function fetchAvatarUrl(wikiPage: string): Promise<string | null> {
  const url = `${WIKI_BASE}/${wikiPage}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`  HTTP ${resp.status} for ${wikiPage}`);
      return null;
    }
    const html = await resp.text();

    // Find the profile image in the infobox - look for the first image in the character table
    // Pattern: <img ... src="/wiki/images/thumb/..." alt="...Profile..." />
    // or: <a href="/wiki/File:..." class="image"><img ... src="..." /></a>
    const imgMatch = html.match(/class="image"[^>]*>\s*<img[^>]+src="([^"]+)"/);
    if (imgMatch) {
      let imgUrl = imgMatch[1];
      if (imgUrl.startsWith('/')) {
        imgUrl = `https://www.detectiveconanworld.com${imgUrl}`;
      }
      return imgUrl;
    }

    // Fallback: look for any image in the infobox table
    const tableMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const tableHtml = tableMatch[1];
      const tableImgMatch = tableHtml.match(/<img[^>]+src="([^"]+)"/);
      if (tableImgMatch) {
        let imgUrl = tableImgMatch[1];
        if (imgUrl.startsWith('/')) {
          imgUrl = `https://www.detectiveconanworld.com${imgUrl}`;
        }
        return imgUrl;
      }
    }

    // Last resort: find any wiki image
    const anyImgMatch = html.match(/src="(\/wiki\/images\/[^"]+)"/);
    if (anyImgMatch) {
      return `https://www.detectiveconanworld.com${anyImgMatch[1]}`;
    }

    console.error(`  No image found for ${wikiPage}`);
    return null;
  } catch (err) {
    console.error(`  Error fetching ${wikiPage}:`, err);
    return null;
  }
}

async function main() {
  console.log('Fetching avatar URLs from Detective Conan Wiki...\n');

  const results: Record<string, string> = {};

  for (const [charId, wikiPage] of Object.entries(CHARACTER_WIKI_PAGES)) {
    process.stdout.write(`  ${charId} (${wikiPage})... `);
    const avatarUrl = await fetchAvatarUrl(wikiPage);
    if (avatarUrl) {
      results[charId] = avatarUrl;
      console.log(`OK: ${avatarUrl.slice(0, 80)}...`);
    } else {
      console.log('FAILED');
    }
    // Be polite - wait 500ms between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nFetched ${Object.keys(results).length}/${Object.keys(CHARACTER_WIKI_PAGES).length} avatars.\n`);

  // Output as JSON for easy copy-paste into conan-data.json
  console.log('Avatar URL mapping:');
  console.log(JSON.stringify(results, null, 2));

  // Also update conan-data.json directly
  const fs = await import('fs');
  const dataPath = 'public/conan-data.json';
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let updated = 0;
  for (const char of data.characters) {
    if (results[char.id]) {
      char.avatar = results[char.id];
      updated++;
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\nUpdated ${updated} character avatars in ${dataPath}`);
}

main().catch(console.error);
