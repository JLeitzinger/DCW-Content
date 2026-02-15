import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsDir = path.join(__dirname, '../src/packs/skills');
const manifestPath = path.join(__dirname, '../data/skills-manifest.json');

// Ensure skills directory exists
if (!fs.existsSync(skillsDir)) {
  fs.mkdirSync(skillsDir, { recursive: true });
}

// Load skills manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Flatten skills from all categories into a single array
const skills = [];
for (const category of Object.values(manifest.skills)) {
  for (const skill of category) {
    skills.push({
      _id: skill.name,
      name: skill.name,
      category: skill.category,
      relatedStat: skill.relatedStat,
      description: skill.description,
      level: 0,
      effort: 0
    });
  }
}

function createSkillItem(skill) {
  return {
    _id: skill._id,
    name: skill.name,
    type: "skill",
    img: "icons/svg/book.svg",
    system: {
      description: skill.description,
      level: skill.level,
      category: skill.category,
      relatedStat: skill.relatedStat,
      effort: skill.effort,
      grantedSkills: []
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };
}

// Generate all skill files
console.log('Generating skill item files...\n');

let count = 0;
for (const skill of skills) {
  const item = createSkillItem(skill);
  const filename = `${skill._id.toLowerCase()}.json`;
  const filepath = path.join(skillsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(item, null, 2), 'utf8');
  console.log(`✓ Created: ${filename} (${skill.name})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} skill item files`);
console.log(`Location: ${skillsDir}`);
