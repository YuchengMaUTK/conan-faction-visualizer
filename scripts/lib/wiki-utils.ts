import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WIKI_BASE = 'https://www.detectiveconanworld.com';
export const WIKI_URL = `${WIKI_BASE}/wiki`;
export const DATA_PATH = path.resolve(__dirname, '../../public/conan-data.json');

export async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function loadData(): any {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

export function saveData(data: any): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
}

export const AVATARS_DIR = path.resolve(__dirname, '../../public/avatars');

/** Download a remote URL to a local file */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(dest));
}

/** Download a remote avatar to public/avatars/ and return the local path, or null on failure */
export async function downloadAvatar(personaId: string, remoteUrl: string): Promise<string | null> {
  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
  const ext = path.extname(new URL(remoteUrl).pathname) || '.jpg';
  const filename = `${personaId}${ext}`;
  const dest = path.join(AVATARS_DIR, filename);
  if (fs.existsSync(dest)) return `avatars/${filename}`;
  try {
    await downloadFile(remoteUrl, dest);
    return `avatars/${filename}`;
  } catch {
    return null;
  }
}

// Extract avatar URL from a wiki page using cheerio
// 3-tier strategy: profile image > character-name image > first infobox image
export function extractAvatar($: cheerio.CheerioAPI): string | null {
  // Tier 1: Profile image in infobox
  const profileImg = $('table.infobox img[src*="/wiki/images/"]').first();
  if (profileImg.length) {
    const src = profileImg.attr('src');
    if (src) return src.startsWith('http') ? src : `${WIKI_BASE}${src}`;
  }
  // Tier 2: Any image in the article with /wiki/images/
  const articleImg = $('#mw-content-text img[src*="/wiki/images/"]').first();
  if (articleImg.length) {
    const src = articleImg.attr('src');
    if (src) return src.startsWith('http') ? src : `${WIKI_BASE}${src}`;
  }
  return null;
}

// Extract episode and chapter appearance counts from infobox "Appearances:" row
export function extractAppearanceCounts($: cheerio.CheerioAPI): { episodes: number | null; chapters: number | null } {
  const result = { episodes: null as number | null, chapters: null as number | null };
  $('table.infobox th').each((_, el) => {
    if (!/appearances/i.test($(el).text())) return;
    const td = $(el).next('td');
    if (!td.length) return;
    // Content is like: "Chapters: <a>344</a><br>Episodes: <a>566</a><br>..."
    // Take the FIRST occurrence of each label (manga chapters / anime episodes)
    const html = td.html() ?? '';
    const chapMatch = html.match(/Chapters:\s*<a[^>]*>(\d+)<\/a>/i);
    const epMatch = html.match(/Episodes:\s*<a[^>]*>(\d+)<\/a>/i);
    if (chapMatch) result.chapters = parseInt(chapMatch[1], 10);
    if (epMatch) result.episodes = parseInt(epMatch[1], 10);
  });
  return result;
}

// Extract codename from infobox (for Black Organization members)
export function extractCodename($: cheerio.CheerioAPI): string | null {
  let codename: string | null = null;
  $('table.infobox th').each((_, el) => {
    if (/codename|code name/i.test($(el).text())) {
      codename = $(el).next('td').text().trim() || null;
    }
  });
  return codename;
}

// Extract multilingual names from a character wiki page
export interface I18nNames {
  ja?: string;       // Japanese name (kanji/kana)
  ja_romaji?: string; // Romanized Japanese
  zh?: string;        // Chinese name
}

export function extractI18nNames($: cheerio.CheerioAPI): I18nNames {
  const result: I18nNames = {};

  // Japanese name from infobox: "工藤 新一 (Kudō Shin'ichi)"
  $('table.infobox th').each((_, el) => {
    if (/japanese name/i.test($(el).text())) {
      const cell = $(el).next('td');
      const full = cell.text().trim();
      // Split "工藤 新一 (Kudō Shin'ichi)" into kanji and romaji
      const m = full.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (m) {
        result.ja = m[1].trim();
        result.ja_romaji = m[2].trim();
      } else {
        result.ja = full;
      }
    }
  });

  // Chinese name from "In other languages" table
  $('table.wikitable').each((_, table) => {
    const headers = $(table).find('th').map((__, th) => $(th).text().trim().toLowerCase()).get();
    if (!headers.some(h => h.includes('language'))) return;
    $(table).find('tr').each((__, row) => {
      const cells = $(row).find('td');
      if (!cells.length) return;
      const lang = cells.first().text().trim().toLowerCase();
      if (lang.includes('chinese') && lang.includes('simplified')) {
        // Format varies: "Given Name" + "Family Name" columns, or just "Name"
        if (cells.length >= 3) {
          const family = cells.eq(2).text().trim().replace(/\s+\S+$/, ''); // strip pinyin
          const given = cells.eq(1).text().trim().replace(/\s+\S+$/, '');
          if (family && given) result.zh = `${family}${given}`;
          else if (given) result.zh = given;
        } else if (cells.length >= 2) {
          result.zh = cells.eq(1).text().trim().replace(/\s+\S+$/, '');
        }
      }
    });
  });

  return result;
}

// Slugify a wiki page name to create an ID
export function slugify(wikiPage: string): string {
  return wikiPage.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
