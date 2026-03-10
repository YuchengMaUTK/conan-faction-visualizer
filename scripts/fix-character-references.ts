/**
 * 修复角色引用ID脚本
 * 
 * 功能：
 * - 修复角色事件和关系中的角色ID引用
 * - 将旧的简单ID格式转换为新的详细ID格式
 * - 确保数据一致性
 * 
 * 使用方法：
 * npx tsx scripts/fix-character-references.ts
 */

import fs from 'fs';

// 读取当前数据
const dataPath = 'public/conan-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// 创建ID映射表 - 从旧ID到新ID
const idMapping: Record<string, string> = {
  // 主要角色
  'shinichi': 'shinichi_kudo',
  'conan': 'conan_edogawa', 
  'ran': 'ran_mouri',
  'kogoro': 'kogoro_mouri',
  'haibara': 'ai_haibara',
  'akai': 'shuichi_akai',
  'amuro': 'rei_furuya',
  'vermouth': 'sharon_vineyard',
  'gin': 'gin',
  'vodka': 'vodka',
  'kir': 'hidemi_hondou',
  'rum': 'rum',
  
  // 警察
  'sato': 'miwako_sato',
  'takagi': 'wataru_takagi',
  'megure': 'juzo_megure',
  'shiratori': 'ninzaburo_shiratori',
  'chiba': 'kazunobu_chiba',
  
  // FBI
  'jodie': 'jodie_starling',
  'camel': 'andre_camel',
  
  // 少年侦探团
  'agasa': 'hiroshi_agasa',
  'ayumi': 'ayumi_yoshida',
  'mitsuhiko': 'mitsuhiko_tsuburaya',
  'genta': 'genta_kojima',
  
  // 黑衣组织
  'chianti': 'chianti',
  'korn': 'korn',
  'miyano_akemi': 'akemi_miyano',
  
  // 其他
  'heiji': 'heiji_hattori',
  'kazuha': 'kazuha_toyama',
  'sera': 'masumi_sera',
  'matsuda': 'jinpei_matsuda',
  'hagiwara': 'kenji_hagiwara',
  'hakuba': 'saguru_hakuba',
  'kaito': 'kaito_kuroba'
};

// 获取所有实际存在的角色ID
const existingCharacterIds = new Set(data.characters.map((char: any) => char.id));

console.log('=== 修复角色引用ID ===');
console.log(`找到 ${data.characters.length} 个角色`);
console.log(`需要修复 ${data.characterEvents.length} 个角色事件`);
console.log(`需要修复 ${data.relationships.length} 个关系`);

// 修复角色事件中的ID
let fixedEvents = 0;
let skippedEvents = 0;

data.characterEvents = data.characterEvents.filter((event: any) => {
  const oldId = event.characterId;
  const newId = idMapping[oldId] || oldId;
  
  if (existingCharacterIds.has(newId)) {
    event.characterId = newId;
    if (oldId !== newId) {
      fixedEvents++;
      console.log(`事件 ${event.id}: ${oldId} -> ${newId}`);
    }
    return true;
  } else {
    skippedEvents++;
    console.log(`跳过事件 ${event.id}: 找不到角色 ${oldId} (尝试过 ${newId})`);
    return false;
  }
});

// 修复关系中的ID
let fixedRelationships = 0;
let skippedRelationships = 0;

data.relationships = data.relationships.filter((rel: any) => {
  const oldId1 = rel.character1Id;
  const oldId2 = rel.character2Id;
  const newId1 = idMapping[oldId1] || oldId1;
  const newId2 = idMapping[oldId2] || oldId2;
  
  if (existingCharacterIds.has(newId1) && existingCharacterIds.has(newId2)) {
    if (oldId1 !== newId1) {
      rel.character1Id = newId1;
      fixedRelationships++;
      console.log(`关系 ${rel.id}: ${oldId1} -> ${newId1}`);
    }
    if (oldId2 !== newId2) {
      rel.character2Id = newId2;
      fixedRelationships++;
      console.log(`关系 ${rel.id}: ${oldId2} -> ${newId2}`);
    }
    return true;
  } else {
    skippedRelationships++;
    console.log(`跳过关系 ${rel.id}: 找不到角色 ${oldId1}/${oldId2} (尝试过 ${newId1}/${newId2})`);
    return false;
  }
});

// 修复关系事件中的ID
data.relationshipEvents = data.relationshipEvents.filter((event: any) => {
  // 关系事件通过relationshipId引用关系，不需要直接修复角色ID
  return true;
});

console.log('\n=== 修复结果 ===');
console.log(`角色事件: 修复 ${fixedEvents} 个, 跳过 ${skippedEvents} 个, 保留 ${data.characterEvents.length} 个`);
console.log(`关系: 修复 ${fixedRelationships} 个ID, 跳过 ${skippedRelationships} 个关系, 保留 ${data.relationships.length} 个`);

// 保存修复后的数据
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('\n数据已保存到', dataPath);