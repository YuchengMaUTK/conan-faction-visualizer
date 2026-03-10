/**
 * 角色数据最终清理脚本
 * 
 * 功能：
 * - 移除非角色条目（案件名称、系统页面等）
 * - 过滤低质量NPC和无关角色
 * - 保留重要角色和黑衣组织成员
 * - 生成高质量的角色数据集
 * 
 * 使用方法：
 * npx tsx scripts/final-character-cleanup.ts
 */

import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/conan-data.json', 'utf-8'));

console.log('=== 最终角色清理 ===');
console.log(`原始角色数: ${data.characters.length}`);

function shouldKeepCharacter(character: any): boolean {
  const name = character.name;
  const appearances = character.appearanceCount.episodeCount;
  const faction = character.faction;
  
  // 1. 移除明显的案件名称（零出场且包含特定模式）
  if (appearances === 0 && (
    name.includes('Scar that') ||
    name.includes('Video Letter') ||
    name.includes('MDP Nine') ||
    name.includes('Dangerous Party') ||
    name.includes('Captured in')
  )) {
    return false;
  }
  
  // 2. 黑衣组织成员：全部保留
  if (faction === 'BLACK') {
    return true;
  }
  
  // 3. 主要角色：出场次数多的保留
  if (appearances >= 10) {
    return true;
  }
  
  // 4. 重要配角：出场适中且不是明显NPC的保留
  if (appearances >= 3) {
    // 排除明显的NPC模式
    if (name.startsWith('Detective ') && !name.includes('Conan') && !name.includes('Boys')) return false;
    if (name.startsWith('Officer ') && appearances < 10) return false;
    if (name.startsWith('Inspector ') && appearances < 5) return false;
    if (name.startsWith('Mysterious ')) return false;
    if (name.length === 1) return false; // 单字母名称
    
    return true;
  }
  
  // 5. 特殊重要角色：即使出场少但剧情重要
  const specialImportant = [
    // 黑衣组织相关重要人物
    'Renya Karasuma', 'Elena Miyano', 'Atsushi Miyano',
    // 重要案件相关
    'Kohji Haneda', 'Amanda Hughes', 'Tsutomu Akai',
    // 主角家族
    'Yusaku Kudo', 'Yukiko Kudo', 'Eri Kisaki',
    // 重要反复出现角色
    'Kaitou Kid', 'Kaito Kuroba', 'Toichi Kuroba',
    // 警察学校组
    'Jinpei Matsuda', 'Kenji Hagiwara', 'Wataru Date',
    // FBI核心
    'James Black', 'Andre Camel',
    // 其他重要角色
    'Mary Sera', 'Rumi Wakasa', 'Hyoue Kuroda'
  ];
  
  if (specialImportant.includes(name)) {
    return true;
  }
  
  // 6. 其他情况：出场太少的移除
  return false;
}

// 过滤角色
const originalCharacters = [...data.characters];
const filteredCharacters = originalCharacters.filter(shouldKeepCharacter);
const removedCharacters = originalCharacters.filter(char => !shouldKeepCharacter(char));

console.log(`保留角色数: ${filteredCharacters.length}`);
console.log(`移除角色数: ${removedCharacters.length}`);

// 显示被移除的角色
console.log('\n=== 被移除的角色 ===');
removedCharacters.forEach((char, i) => {
  console.log(`${i+1}. ${char.name} (${char.faction}) - 出场${char.appearanceCount.episodeCount}次`);
});

// 统计最终结果
const finalRed = filteredCharacters.filter(c => c.faction === 'RED').length;
const finalBlack = filteredCharacters.filter(c => c.faction === 'BLACK').length;

console.log('\n=== 最终统计 ===');
console.log(`RED阵营: ${finalRed}`);
console.log(`BLACK阵营: ${finalBlack}`);
console.log(`总计: ${filteredCharacters.length}`);

// 显示保留的主要角色
console.log('\n=== 保留的主要角色 (按出场次数排序) ===');
const majorCharacters = filteredCharacters
  .filter(c => c.appearanceCount.episodeCount >= 50)
  .sort((a, b) => b.appearanceCount.episodeCount - a.appearanceCount.episodeCount);

majorCharacters.forEach((char, i) => {
  console.log(`${i+1}. ${char.name} (${char.faction}) - ${char.appearanceCount.episodeCount}次`);
});

// 更新数据
data.characters = filteredCharacters;
data.metadata.totalCharacters = filteredCharacters.length;

// 保存
fs.writeFileSync('public/conan-data.json', JSON.stringify(data, null, 2), 'utf-8');
console.log('\n✅ 数据已保存');