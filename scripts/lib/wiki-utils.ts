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

// Check if a character is a Black Organization member based on Occupation field
export function isBlackOrgMember($: cheerio.CheerioAPI): boolean {
  let result = false;
  $('table.infobox th').each((_, el) => {
    if (/^occupation/i.test($(el).text().trim())) {
      const td = $(el).next('td');
      if (/black organization/i.test(td.text())) result = true;
    }
  });
  return result;
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

// Common Traditional → Simplified Chinese character mappings (for Japanese kanji conversion)
const TRAD_TO_SIMP: Record<string, string> = {
  '與':'与','東':'东','絲':'丝','並':'并','義':'义','樂':'乐','書':'书','買':'买','亂':'乱',
  '雲':'云','亞':'亚','產':'产','親':'亲','來':'来','價':'价','優':'优','傳':'传','傷':'伤',
  '備':'备','兒':'儿','黨':'党','關':'关','興':'兴','養':'养','內':'内','農':'农','決':'决',
  '況':'况','準':'准','幾':'几','劉':'刘','則':'则','創':'创','動':'动','務':'务','勝':'胜',
  '區':'区','華':'华','協':'协','單':'单','歷':'历','衛':'卫','廠':'厂','參':'参','雙':'双',
  '變':'变','號':'号','葉':'叶','聯':'联','聽':'听','問':'问','園':'园','國':'国','圖':'图',
  '團':'团','場':'场','壞':'坏','報':'报','壓':'压','夢':'梦','頭':'头','奪':'夺','獎':'奖',
  '對':'对','導':'导','將':'将','爾':'尔','堯':'尧','層':'层','歲':'岁','島':'岛','師':'师',
  '幣':'币','廣':'广','莊':'庄','應':'应','開':'开','異':'异','張':'张','彈':'弹','歸':'归',
  '當':'当','錄':'录','從':'从','復':'复','態':'态','懷':'怀','戰':'战','戲':'戏','護':'护',
  '報':'报','擔':'担','據':'据','損':'损','換':'换','擊':'击','擴':'扩','擁':'拥','擇':'择',
  '數':'数','條':'条','楊':'杨','極':'极','構':'构','標':'标','樣':'样','機':'机','權':'权',
  '歡':'欢','殘':'残','氣':'气','決':'决','沒':'没','濟':'济','滅':'灭','準':'准','潔':'洁',
  '滿':'满','漢':'汉','點':'点','煩':'烦','營':'营','環':'环','現':'现','瑪':'玛','產':'产',
  '畫':'画','異':'异','當':'当','療':'疗','發':'发','監':'监','盡':'尽','確':'确','禮':'礼',
  '積':'积','稱':'称','種':'种','穩':'稳','競':'竞','節':'节','範':'范','築':'筑','類':'类',
  '紅':'红','約':'约','純':'纯','紙':'纸','練':'练','組':'组','經':'经','結':'结','給':'给',
  '統':'统','繼':'继','續':'续','維':'维','綠':'绿','網':'网','總':'总','線':'线','編':'编',
  '緣':'缘','縣':'县','義':'义','習':'习','聖':'圣','職':'职','聯':'联','腦':'脑','臨':'临',
  '舉':'举','節':'节','藝':'艺','蘇':'苏','術':'术','補':'补','裝':'装','複':'复','規':'规',
  '視':'视','覺':'觉','觀':'观','記':'记','許':'许','設':'设','試':'试','話':'话','語':'语',
  '說':'说','課':'课','調':'调','論':'论','議':'议','護':'护','變':'变','讓':'让','豐':'丰',
  '負':'负','財':'财','質':'质','貿':'贸','費':'费','資':'资','賽':'赛','趙':'赵','車':'车',
  '軍':'军','軟':'软','輕':'轻','輸':'输','辦':'办','達':'达','過':'过','運':'运','還':'还',
  '進':'进','連':'连','選':'选','適':'适','遠':'远','邊':'边','鄭':'郑','醫':'医','釋':'释',
  '鑒':'鉴','長':'长','門':'门','間':'间','閱':'阅','際':'际','陣':'阵','陽':'阳','階':'阶',
  '隨':'随','險':'险','電':'电','響':'响','頁':'页','順':'顺','須':'须','領':'领','題':'题',
  '風':'风','飛':'飞','養':'养','馬':'马','驗':'验','體':'体','魚':'鱼','鳥':'鸟','點':'点',
  '齊':'齐','齒':'齿','龍':'龙','龜':'龟',
  // Specific to Conan character names
  '宮':'宫','藤':'藤','澤':'泽','濱':'滨','島':'岛','橋':'桥','邊':'边','瀨':'濑',
  '淵':'渊','陸':'陆','廳':'厅','縣':'县','將':'将','實':'实','寬':'宽','學':'学',
  '櫻':'樱','鶴':'鹤','龍':'龙','藏':'藏','壹':'壹','貳':'贰','參':'参',
  '渡':'渡','辺':'边','辻':'辻','畑':'畑','塚':'冢','﨑':'崎','髙':'高',
  '蘭':'兰','國':'国','廣':'广','實':'实','學':'学','與':'与','萬':'万',
};

/** Convert Japanese kanji name to Simplified Chinese (skip if contains katakana) */
export function jaToZh(ja: string): string | null {
  // Skip names with katakana (foreign names that need manual translation)
  if (/[\u30A0-\u30FF]/.test(ja)) return null;
  // Remove spaces and convert char by char
  let result = '';
  for (const ch of ja.replace(/\s+/g, '')) {
    result += TRAD_TO_SIMP[ch] ?? ch;
  }
  return result;
}
