/**
 * Scrape all characters from Detective Conan Wiki automatically.
 * This script crawls the wiki to find all characters and builds a complete database.
 *
 * Usage: npx tsx scripts/scrape-all-characters.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIKI_BASE = 'https://www.detectiveconanworld.com';
const WIKI = `${WIKI_BASE}/wiki`;

// Character categories to scrape from
const CHARACTER_CATEGORIES = [
  'Black_Organization',
  'Tokyo_Metropolitan_Police', 
  'FBI',
  'CIA',
  'Detective_Boys',
  'Detectives',
  'Law_Enforcement'
];

// Main character list pages to scrape
const CHARACTER_LIST_PAGES = [
  'Characters',
  'List_of_characters',
  'Main_characters'
];

interface ScrapedCharacter {
  name: string;
  nameEn?: string;
  wikiPage: string;
  faction?: 'RED' | 'BLACK';
  subFaction?: string;
  avatar?: string;
  codename?: string;
  appearanceCount?: {
    episodeCount: number;
    mentionCount: number;
  };
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    console.log(`  Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    ❌ HTTP ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.log(`    ❌ Error: ${error}`);
    return null;
  }
}

async function scrapeBlackOrganization(): Promise<ScrapedCharacter[]> {
  console.log('\n🕵️ Scraping Black Organization members...');
  const html = await fetchPage(`${WIKI}/Black_Organization`);
  if (!html) return [];

  const characters: ScrapedCharacter[] = [];
  
  // Extract character links from the Black Organization page
  // Look for links in the members section
  const memberSections = [
    /Executive members[\s\S]*?(?=<h[234]|$)/i,
    /Other members[\s\S]*?(?=<h[234]|$)/i,
    /Deceased[\s\S]*?(?=<h[234]|$)/i,
    /Former[\s\S]*?(?=<h[234]|$)/i,
    /Spies for other organizations[\s\S]*?(?=<h[234]|$)/i
  ];

  for (const sectionRegex of memberSections) {
    const sectionMatch = html.match(sectionRegex);
    if (sectionMatch) {
      const sectionHtml = sectionMatch[0];
      
      // Find character links: <a href="/wiki/Character_Name" title="Character Name">
      const linkMatches = sectionHtml.matchAll(/<a href="\/wiki\/([^"]+)"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/g);
      
      for (const match of linkMatches) {
        const wikiPage = match[1];
        const title = match[2];
        const linkText = match[3];
        
        // Skip non-character pages
        if (wikiPage.includes('File:') || wikiPage.includes('Category:') || 
            wikiPage.includes('Template:') || wikiPage.includes('#')) {
          continue;
        }
        
        // Determine if this is likely a character
        if (title && !title.includes('edit') && !title.includes('File:')) {
          characters.push({
            name: linkText,
            nameEn: title,
            wikiPage: wikiPage,
            faction: 'BLACK',
            subFaction: 'BO_CORE'
          });
        }
      }
    }
  }

  console.log(`  Found ${characters.length} Black Organization characters`);
  return characters;
}

async function scrapePoliceCharacters(): Promise<ScrapedCharacter[]> {
  console.log('\n👮 Scraping Police characters...');
  const html = await fetchPage(`${WIKI}/Tokyo_Metropolitan_Police`);
  if (!html) return [];

  const characters: ScrapedCharacter[] = [];
  
  // Look for character links in the police page
  const linkMatches = html.matchAll(/<a href="\/wiki\/([^"]+)"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/g);
  
  for (const match of linkMatches) {
    const wikiPage = match[1];
    const title = match[2];
    const linkText = match[3];
    
    // Skip non-character pages
    if (wikiPage.includes('File:') || wikiPage.includes('Category:') || 
        wikiPage.includes('Template:') || wikiPage.includes('#') ||
        wikiPage.includes('Tokyo_Metropolitan_Police')) {
      continue;
    }
    
    // Check if this looks like a person's name (has both first and last name or Japanese characters)
    if (title && (title.includes(' ') || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title))) {
      characters.push({
        name: linkText,
        nameEn: title,
        wikiPage: wikiPage,
        faction: 'RED',
        subFaction: 'POLICE'
      });
    }
  }

  console.log(`  Found ${characters.length} Police characters`);
  return characters;
}

async function scrapeFBICharacters(): Promise<ScrapedCharacter[]> {
  console.log('\n🔍 Scraping FBI characters...');
  const html = await fetchPage(`${WIKI}/FBI`);
  if (!html) return [];

  const characters: ScrapedCharacter[] = [];
  
  const linkMatches = html.matchAll(/<a href="\/wiki\/([^"]+)"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/g);
  
  for (const match of linkMatches) {
    const wikiPage = match[1];
    const title = match[2];
    const linkText = match[3];
    
    if (wikiPage.includes('File:') || wikiPage.includes('Category:') || 
        wikiPage.includes('Template:') || wikiPage.includes('#') ||
        wikiPage.includes('FBI')) {
      continue;
    }
    
    if (title && (title.includes(' ') || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title))) {
      characters.push({
        name: linkText,
        nameEn: title,
        wikiPage: wikiPage,
        faction: 'RED',
        subFaction: 'FBI'
      });
    }
  }

  console.log(`  Found ${characters.length} FBI characters`);
  return characters;
}

async function scrapeMainCharacters(): Promise<ScrapedCharacter[]> {
  console.log('\n⭐ Scraping main characters...');
  const html = await fetchPage(`${WIKI}/Characters`);
  if (!html) return [];

  const characters: ScrapedCharacter[] = [];
  
  // Look for character infoboxes and character lists
  const linkMatches = html.matchAll(/<a href="\/wiki\/([^"]+)"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/g);
  
  for (const match of linkMatches) {
    const wikiPage = match[1];
    const title = match[2];
    const linkText = match[3];
    
    if (wikiPage.includes('File:') || wikiPage.includes('Category:') || 
        wikiPage.includes('Template:') || wikiPage.includes('#')) {
      continue;
    }
    
    if (title && (title.includes(' ') || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title))) {
      characters.push({
        name: linkText,
        nameEn: title,
        wikiPage: wikiPage,
        faction: 'RED',
        subFaction: 'DETECTIVE'
      });
    }
  }

  console.log(`  Found ${characters.length} main characters`);
  return characters;
}

async function fetchCharacterDetails(character: ScrapedCharacter): Promise<ScrapedCharacter> {
  const url = `${WIKI}/${character.wikiPage}`;
  const html = await fetchPage(url);
  
  if (!html) return character;

  // Extract profile image
  const profileMatch = html.match(/src="(\/wiki\/images\/thumb\/[^"]*Profile[^"]*\.(jpg|png))"/i) ||
                      html.match(/src="(\/wiki\/images\/thumb\/[^"]*\.(jpg|png))"/i);
  
  if (profileMatch) {
    character.avatar = `${WIKI_BASE}${profileMatch[1]}`;
  }

  // Extract appearance counts from Statistics section
  const chapterMatches = [...html.matchAll(/Chapters:\s*<a[^>]*>(\d+)<\/a>/g)];
  const episodeMatches = [...html.matchAll(/Episodes:\s*<a[^>]*>(\d+)<\/a>/g)];

  if (chapterMatches.length > 0 || episodeMatches.length > 0) {
    character.appearanceCount = {
      episodeCount: episodeMatches.length > 0 ? Math.max(...episodeMatches.map(m => parseInt(m[1]))) : 0,
      mentionCount: chapterMatches.length > 0 ? Math.max(...chapterMatches.map(m => parseInt(m[1]))) : 0
    };
  }

  // Extract codename if it's a Black Organization member
  if (character.faction === 'BLACK') {
    const codenameMatch = html.match(/Codename[^:]*:\s*([^<\n]+)/i);
    if (codenameMatch) {
      character.codename = codenameMatch[1].trim();
    }
  }

  return character;
}

function deduplicateCharacters(characters: ScrapedCharacter[]): ScrapedCharacter[] {
  const seen = new Set<string>();
  const unique: ScrapedCharacter[] = [];

  for (const char of characters) {
    const key = char.wikiPage.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(char);
    }
  }

  return unique;
}

function convertToDataFormat(characters: ScrapedCharacter[]) {
  return characters.map((char, index) => ({
    id: char.wikiPage.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name: char.name,
    nameEn: char.nameEn || char.name,
    codename: char.codename || null,
    faction: char.faction || 'RED',
    subFaction: char.subFaction || 'DETECTIVE',
    avatar: char.avatar || '',
    appearanceCount: char.appearanceCount || {
      episodeCount: 0,
      mentionCount: 0
    },
    isDualIdentity: false
  }));
}

async function main() {
  console.log('🚀 Starting comprehensive character scraping from Detective Conan Wiki...\n');

  let allCharacters: ScrapedCharacter[] = [];

  // Scrape different character categories
  const blackOrgChars = await scrapeBlackOrganization();
  await delay(1000);
  
  const policeChars = await scrapePoliceCharacters();
  await delay(1000);
  
  const fbiChars = await scrapeFBICharacters();
  await delay(1000);
  
  const mainChars = await scrapeMainCharacters();
  await delay(1000);

  // Combine all characters
  allCharacters = [...blackOrgChars, ...policeChars, ...fbiChars, ...mainChars];
  
  // Remove duplicates
  allCharacters = deduplicateCharacters(allCharacters);
  
  console.log(`\n📊 Total unique characters found: ${allCharacters.length}`);

  // Fetch detailed information for each character
  console.log('\n🔍 Fetching detailed character information...');
  const detailedCharacters: ScrapedCharacter[] = [];
  
  for (let i = 0; i < allCharacters.length; i++) {
    const char = allCharacters[i];
    console.log(`  [${i + 1}/${allCharacters.length}] ${char.name}...`);
    
    const detailed = await fetchCharacterDetails(char);
    detailedCharacters.push(detailed);
    
    // Rate limiting
    await delay(800);
  }

  // Load existing data
  const dataPath = resolve(__dirname, '../public/conan-data.json');
  const existingData = JSON.parse(readFileSync(dataPath, 'utf-8'));

  // Convert to data format
  const newCharacters = convertToDataFormat(detailedCharacters);

  // Update the data
  existingData.characters = newCharacters;
  existingData.metadata.lastUpdated = new Date().toISOString().split('T')[0];
  existingData.metadata.totalCharacters = newCharacters.length;

  // Count by faction
  const redCount = newCharacters.filter(char => char.faction === 'RED').length;
  const blackCount = newCharacters.filter(char => char.faction === 'BLACK').length;

  console.log(`\n📈 Final Statistics:`);
  console.log(`  Total characters: ${newCharacters.length}`);
  console.log(`  RED faction: ${redCount}`);
  console.log(`  BLACK faction: ${blackCount}`);

  // Save updated data
  writeFileSync(dataPath, JSON.stringify(existingData, null, 2) + '\n');
  console.log('\n✅ Successfully updated conan-data.json with scraped characters!');
}

main().catch(console.error);