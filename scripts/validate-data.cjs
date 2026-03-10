const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/conan-data.json', 'utf8'));

console.log('Entities:', data.entities.length);
console.log('CharacterEvents:', data.characterEvents.length);
console.log('Links:', data.links.length);
console.log('RelationshipEvents:', data.relationshipEvents.length);
console.log('StoryArcs:', data.storyArcs.length);

const badEntities = data.entities.filter(e => !e.entity_id.startsWith('e_'));
if (badEntities.length) console.log('BAD entity_ids:', badEntities.map(e => e.entity_id));

const allPersonas = data.entities.flatMap(e => e.personas);
console.log('Total Personas:', allPersonas.length);
const badPersonas = allPersonas.filter(p => !p.persona_id.startsWith('p_'));
if (badPersonas.length) console.log('BAD persona_ids:', badPersonas.map(p => p.persona_id));

for (const e of data.entities) {
  const defaults = e.personas.filter(p => p.is_default_display);
  if (defaults.length !== 1) console.log('Entity', e.entity_id, 'has', defaults.length, 'default personas');
}

const personaIds = new Set(allPersonas.map(p => p.persona_id));
for (const link of data.links) {
  if (!personaIds.has(link.source_persona_id)) console.log('BAD link source:', link.source_persona_id);
  if (!personaIds.has(link.target_persona_id)) console.log('BAD link target:', link.target_persona_id);
}

console.log('All checks passed!');
