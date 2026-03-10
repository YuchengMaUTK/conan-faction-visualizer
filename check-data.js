import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./public/conan-data.json', 'utf-8'));

console.log('=== 角色数据统计 ===');
console.log('总角色数:', data.characters.length);
console.log('RED阵营:', data.characters.filter(c => c.faction === 'RED').length);
console.log('BLACK阵营:', data.characters.filter(c => c.faction === 'BLACK').length);

console.log('\n=== 前10个角色样本 ===');
data.characters.slice(0, 10).forEach((c, i) => {
  console.log(`${i+1}. ${c.name} (${c.nameEn}) - ${c.faction} - ${c.subFaction}`);
});

console.log('\n=== BLACK阵营角色 ===');
const blackChars = data.characters.filter(c => c.faction === 'BLACK');
blackChars.forEach((c, i) => {
  console.log(`${i+1}. ${c.name} (${c.nameEn}) - ${c.codename || 'No codename'}`);
});

console.log('\n=== 数据质量检查 ===');
const invalidChars = data.characters.filter(c => 
  !c.name || 
  !c.nameEn || 
  !c.faction || 
  c.name.includes('http') ||
  c.name.includes('File:') ||
  c.name.includes('Category:')
);
console.log('可能有问题的角色数:', invalidChars.length);
if (invalidChars.length > 0) {
  console.log('问题角色:');
  invalidChars.slice(0, 5).forEach(c => {
    console.log(`- ${c.name} (${c.nameEn})`);
  });
}