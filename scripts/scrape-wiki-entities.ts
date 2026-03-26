/**
 * Auto-discover characters from Detective Conan Wiki category pages
 * and merge them into conan-data.json as Entity/Persona objects.
 *
 * Usage: npx tsx scripts/scrape-wiki-entities.ts
 */

import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import {
  WIKI_URL,
  fetchPage,
  delay,
  loadData,
  saveData,
  extractAvatar,
  extractAppearanceCounts,
  extractCodename,
  extractI18nNames,
  downloadAvatar,
  slugify,
} from './lib/wiki-utils.ts';
import type { Entity, Persona, Faction, SubFaction } from '../src/types/index.ts';

// ── Category pages to crawl ────────────────────────────────
interface CategoryDef {
  page: string;
  faction: Faction;
  sub_faction: SubFaction;
}

const CATEGORIES: CategoryDef[] = [
  { page: 'Black_Organization', faction: 'BLACK', sub_faction: 'BO_CORE' },
  { page: 'Tokyo_Metropolitan_Police', faction: 'RED', sub_faction: 'TOKYO_MPD' },
  { page: 'FBI', faction: 'RED', sub_faction: 'FBI' },
  { page: 'CIA', faction: 'RED', sub_faction: 'CIA' },
  { page: 'Characters', faction: 'RED', sub_faction: 'DETECTIVE' },
];

// Pages/prefixes that are not characters
const SKIP_PREFIXES = ['File:', 'Category:', 'Template:', 'Special:', 'Help:', 'Talk:', 'User:', 'index.php'];
const SKIP_PAGES = new Set([
  'Main_Page', 'Characters', 'Black_Organization', 'FBI',
  'CIA', 'Tokyo_Metropolitan_Police', 'Detective_Conan',
  'Law_Enforcement', 'Minor_law_enforcement', 'Unnamed_law_enforcers',
  'Police_Organization', 'Detective_Boys', 'Public_Security_Bureau',
  'Tokyo_Metropolitan_Police_Department', 'Karasuma_Group',
  'Federal_Bureau_of_Investigation', 'Central_Intelligence_Agency',
  'Secret_Intelligence_Service', 'Japanese_intelligence_agencies',
  'Witness_Protection_Program', 'Magic_Kaito', 'Magic_Kaito_Organization',
  'APTX_4869', 'Silver_Bullet', 'Silver_Bullet_(drug)', 'Nanatsu_no_Ko',
  'Night_Baron', 'Kamen_Yaiba', 'Shirohato_Pharmaceuticals',
  'Haido_Central_Hospital', 'Unsolved_Mysteries', 'Midnight_Crow',
  'Gosho_Aoyama', 'Viz_Media', 'Sherlock_Holmes', 'Scar_Akai',
]);

// Patterns that indicate non-character pages (case-insensitive match on wiki page name)
const SKIP_PATTERNS = [
  /^Volume_\d/i,
  /^List_of_/i,
  /^Magic_Kaito_Volume/i,
  /^Shogakukan/i,
  /timeline$/i,
  /Murder_Case/i,
  /^The_.*(?:Mystery|Case|Trap|Secret|Omen|Return|Nightmare|Chaser|Stage|Omission|Skyscraper|Hostages|Sky|Submarine|Century|Street|Heaven|Flames|Legend|Wall|Eyes|Love|Password|Broadcast|Party|Nocturne|Witness|Band|Passenger|Train|Bomb)/i,
  /^(?:Clash_of|Contact_with|Reunion_with|Search_for|Head-to-Head|On_the_Trail)/i,
  /^(?:Black_Impact|Black_History|Black_Iron|Shinichi_Kudo_Returns|Shinichi_Kudo's_New_York)/i,
  /^(?:Captured_in|Crossroad_in|Countdown_to|Dimensional_Sniper|Time_Travel)/i,
  /^(?:Lupin_III|Conan_in_a|Conan_and_Ebizo|Conan_vs\.|Detective_Boys_vs)/i,
  /^Metropolitan_Police_Detective_Love_Story/i,
  /^(?:A_Dangerous|A_Jewel|A_Video_Letter|Co-Investigating)/i,
  /^(?:Festival_Dolls|Find_the_Buttock|Hidden_Bathroom|Kobayashi-sensei)/i,
  /^(?:Megure's_Sealed|Inspector_Shiratori,|Taiko_Meijin|Chiba's_Difficult)/i,
  /^(?:Just_Like_a|Jodie's_Memories|Chianti's_Last|Akemi_Miyano's_Time)/i,
  /^(?:The_Gathering|The_Girl_from|The_Jet-Black|The_Black_Organization|The_Four_Porsches)/i,
  /^(?:The_Scarlet_Bullet|The_Scarlet_Return|The_Crisis|The_Shadow|The_Shinkansen|The_Spirit|The_Strange|The_Unfriendly)/i,
  /^(?:The_Darkness|The_Ex-Boyfriend|The_Life-Threatening|The_Lost_Ship|The_Mansion|The_Marriage|The_Osaka|The_Phantom|The_Red_Horse|The_Scar_that|The_Target|The_Time-Bombed|The_Trembling|The_Truth)/i,
  /^(?:Heiji_Hattori_and_the|Case_from|Game_Company|Roller_Coaster)/i,
  /^(?:Gin_and_Shuichi|Wataru_Takagi_and_Miwako|Ninzaburo_Shiratori_and_Sumiko|Kazunobu_Chiba_and_Naeko|Shukichi_Haneda_and_Yumi)/i,
  /"The_Criminal"/i,
  /^The_17-Year/i,
  /^The_Secret_Rushed/i,
  /^The_Betrayal/i,
  /^The_Birthday/i,
];

// ── Types ──────────────────────────────────────────────────

// Wiki pages that are alternate identities of existing entities — built dynamically from data
function buildAliasIndex(entities: Entity[]): Map<string, Entity> {
  const map = new Map<string, Entity>();
  for (const e of entities) {
    for (const p of e.personas) {
      map.set(p.name.en.replace(/ /g, '_'), e);
    }
  }
  return map;
}

interface DiscoveredChar {
  wikiPage: string;
  name: string;
  faction: Faction;
  sub_faction: SubFaction;
}

interface ScrapedDetail {
  avatar: string | null;
  episodes: number | null;
  codename: string | null;
  ja?: string;
  ja_romaji?: string;
  zh?: string;
}

// ── Helpers ────────────────────────────────────────────────

/** True if text looks like a character name (has a space or CJK chars) */
function looksLikeName(text: string): boolean {
  return text.includes(' ') || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

/** Extract character links from a category/wiki page */
function extractCharLinks($: cheerio.CheerioAPI): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  // Scope to main content area
  let content = $('#mw-content-text, .mw-parser-output').first();
  if (!content.length) content = $('body');
  content.find('a[href^="/wiki/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim();
    if (href && text) links.push({ href, text });
  });
  return links;
}

/** Filter raw links down to likely character pages */
function filterCharLinks(links: { href: string; text: string }[]): { wikiPage: string; name: string }[] {
  const results: { wikiPage: string; name: string }[] = [];
  for (const { href, text } of links) {
    const page = decodeURIComponent(href.replace('/wiki/', ''));
    if (SKIP_PREFIXES.some(p => page.startsWith(p))) continue;
    if (SKIP_PAGES.has(page)) continue;
    if (page.includes('#')) continue;
    if (SKIP_PATTERNS.some(p => p.test(page))) continue;
    if (!looksLikeName(text)) continue;
    results.push({ wikiPage: page, name: text });
  }
  return results;
}

// ── Core logic ─────────────────────────────────────────────

/** Crawl all category pages and return discovered characters */
async function discoverCharacters(): Promise<DiscoveredChar[]> {
  const all: DiscoveredChar[] = [];

  for (const cat of CATEGORIES) {
    const url = `${WIKI_URL}/${cat.page}`;
    console.log(`📂 Crawling ${cat.page} …`);
    const html = await fetchPage(url);
    if (!html) { console.log('   ⚠ page not found'); continue; }

    const $ = cheerio.load(html);
    const chars = filterCharLinks(extractCharLinks($));
    for (const c of chars) {
      all.push({ ...c, faction: cat.faction, sub_faction: cat.sub_faction });
    }
    console.log(`   found ${chars.length} links`);
    await delay(500);
  }
  return all;
}

/** Deduplicate by wikiPage (case-insensitive). BLACK wins over RED. */
function deduplicate(chars: DiscoveredChar[]): DiscoveredChar[] {
  const map = new Map<string, DiscoveredChar>();
  for (const c of chars) {
    const key = c.wikiPage.toLowerCase();
    const existing = map.get(key);
    if (!existing || (c.faction === 'BLACK' && existing.faction !== 'BLACK')) {
      map.set(key, c);
    }
  }
  return [...map.values()];
}

/** Check if a wiki page is a real character page (has character infobox) */
function isCharacterPage($: cheerio.CheerioAPI): boolean {
  // Character pages have an infobox with fields like Gender, Age, Japanese name, etc.
  const infobox = $('table.infobox');
  if (!infobox.length) return false;
  const text = infobox.text().toLowerCase();
  return /\b(gender|age|japanese name|first appearance|status|aliases)\b/.test(text);
}

/** Fetch per-character details from their wiki page. Returns null if not a character. */
async function fetchDetails(wikiPage: string): Promise<ScrapedDetail | null> {
  const html = await fetchPage(`${WIKI_URL}/${wikiPage}`);
  if (!html) return null;
  const $ = cheerio.load(html);
  if (!isCharacterPage($)) return null;
  const { episodes } = extractAppearanceCounts($);
  const i18n = extractI18nNames($);
  return { avatar: extractAvatar($), episodes, codename: extractCodename($), ...i18n };
}

/** Build a new Entity from a discovered character + scraped details */
function buildEntity(c: DiscoveredChar, d: ScrapedDetail): Entity {
  const id = slugify(c.wikiPage);
  const displayName = c.wikiPage.replace(/_/g, ' ');
  const trueName: Record<string, string> = { en: displayName };
  if (d.ja) trueName.ja = d.ja;
  if (d.ja_romaji) trueName.ja_romaji = d.ja_romaji;
  if (d.zh) trueName.zh = d.zh;

  const persona: Persona = {
    persona_id: `p_${id}`,
    name: { ...trueName },
    faction: c.faction,
    sub_faction: c.sub_faction,
    avatar: d.avatar ?? '',
    codename: d.codename ?? undefined,
    is_default_display: true,
  };
  return {
    entity_id: `e_${id}`,
    true_name: trueName as Entity['true_name'],
    status: 'alive',
    base_appearances: d.episodes ?? 0,
    wiki_url: `${WIKI_URL}/${c.wikiPage}`,
    personas: [persona],
  };
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🚀 Scraping wiki entities …\n');

  // 1. Discover characters from category pages
  const raw = await discoverCharacters();
  const chars = deduplicate(raw);
  console.log(`\n🔎 ${chars.length} unique characters discovered\n`);

  // 2. Fetch per-character details (concurrency 3, 500ms gap)
  const limit = pLimit(3);
  const details = new Map<string, ScrapedDetail>();
  let done = 0;
  let skipped = 0;

  await Promise.all(
    chars.map(c =>
      limit(async () => {
        const d = await fetchDetails(c.wikiPage);
        if (d) {
          details.set(c.wikiPage, d);
        } else {
          skipped++;
        }
        done++;
        if (done % 10 === 0) console.log(`   ${done}/${chars.length} fetched (${skipped} non-character pages skipped)`);
        await delay(500);
      }),
    ),
  );

  console.log(`\n🧹 ${skipped} non-character pages filtered out by infobox check`);
  console.log(`👤 ${details.size} confirmed characters\n`);

  // 3. Merge with existing data
  const data = loadData();
  const entities: Entity[] = data.entities ?? [];
  const byUrl = new Map<string, Entity>();
  for (const e of entities) {
    if (e.wiki_url) byUrl.set(e.wiki_url.toLowerCase(), e);
  }

  let updated = 0;
  let added = 0;
  let aliasSkipped = 0;

  // Build alias index from existing personas so we auto-detect alternate identities
  const aliasIndex = buildAliasIndex(entities);

  for (const c of chars) {
    const d = details.get(c.wikiPage);
    if (!d) continue; // filtered out as non-character

    const url = `${WIKI_URL}/${c.wikiPage}`.toLowerCase();
    const existing = byUrl.get(url);

    if (existing) {
      // Only patch non-curated fields
      if (d.episodes != null) existing.base_appearances = d.episodes;
      if (d.avatar) {
        const defPersona = existing.personas.find(p => p.is_default_display) ?? existing.personas[0];
        if (defPersona && !defPersona.avatar) defPersona.avatar = d.avatar;
      }
      // Fill in missing i18n names (don't overwrite existing)
      if (d.ja && !existing.true_name.ja) existing.true_name.ja = d.ja;
      if (d.ja_romaji && !existing.true_name.ja_romaji) existing.true_name.ja_romaji = d.ja_romaji;
      if (d.zh && !existing.true_name.zh) (existing.true_name as any).zh = d.zh;
      updated++;
    } else {
      // Check if this wiki page matches an existing persona name (alternate identity)
      const aliasEntity = aliasIndex.get(c.wikiPage);
      if (aliasEntity) {
        // Merge appearance count: take the max across all identity pages
        if (d.episodes != null && d.episodes > aliasEntity.base_appearances) {
          aliasEntity.base_appearances = d.episodes;
        }
        aliasSkipped++;
        continue;
      }
      entities.push(buildEntity(c, d));
      added++;
    }
  }

  data.entities = entities;

  // 4b. For multi-persona entities, fetch appearance counts from alias wiki pages
  //     and take the max across all personas
  const multiPersona = entities.filter(e => e.personas.length > 1);
  if (multiPersona.length > 0) {
    console.log(`\n🔄 Checking alias pages for ${multiPersona.length} multi-persona entities …`);
    for (const entity of multiPersona) {
      for (const p of entity.personas) {
        const aliasPage = p.name.en.replace(/ /g, '_');
        // Skip if this is the same as the entity's own wiki page
        if (entity.wiki_url?.endsWith(`/${aliasPage}`)) continue;
        const html = await fetchPage(`${WIKI_URL}/${aliasPage}`);
        if (!html) continue;
        const $ = cheerio.load(html);
        const { episodes } = extractAppearanceCounts($);
        if (episodes != null && episodes > entity.base_appearances) {
          console.log(`   ${entity.true_name.en}: ${entity.base_appearances} → ${episodes} (from ${aliasPage})`);
          entity.base_appearances = episodes;
        }
        await delay(500);
      }
    }
  }

  // 4. Generate JOIN events for entities without any characterEvents
  const events: any[] = data.characterEvents ?? [];
  const entitiesWithEvents = new Set(events.map((e: any) => e.entity_id));
  const newEvents = entities
    .filter(e => !entitiesWithEvents.has(e.entity_id))
    .map(e => ({
      id: `evt-auto-${e.entity_id}`,
      entity_id: e.entity_id,
      type: 'JOIN',
      episodeIndex: 1,
      chapterIndex: 1,
      description: `${e.true_name.en} first appearance`,
    }));
  data.characterEvents = [...events, ...newEvents];

  // 5. Download remote avatars to local public/avatars/
  console.log('\n📥 Downloading avatars …');
  const dlLimit = pLimit(5);
  let dlCount = 0;
  const dlTasks: Promise<void>[] = [];
  for (const entity of entities) {
    for (const persona of entity.personas) {
      if (!persona.avatar || !persona.avatar.startsWith('http')) continue;
      dlTasks.push(dlLimit(async () => {
        const local = await downloadAvatar(persona.persona_id, persona.avatar);
        if (local) { persona.avatar = local; dlCount++; }
        await delay(300);
      }));
    }
  }
  await Promise.all(dlTasks);
  console.log(`   ${dlCount} avatars downloaded`);

  data.metadata.lastUpdated = new Date().toISOString().split('T')[0];
  saveData(data);

  console.log(`\n✅ Done — updated: ${updated}, added: ${added}, aliases skipped: ${aliasSkipped}, total: ${entities.length}, new events: ${newEvents.length}`);
}

main().catch(console.error);
