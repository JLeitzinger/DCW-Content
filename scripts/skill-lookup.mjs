#!/usr/bin/env node

/**
 * Skill Lookup Utility
 *
 * Usage examples:
 *   node scripts/skill-lookup.mjs list              # List all skills
 *   node scripts/skill-lookup.mjs get "Swing"        # Get skill UUID by name
 *   node scripts/skill-lookup.mjs granted Swing 3    # Generate grantedSkills entry
 *   node scripts/skill-lookup.mjs category combat    # List skills by category
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const manifestPath = resolve('data/skills-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

function getAllSkills() {
  const allSkills = [];
  for (const category in manifest.skills) {
    allSkills.push(...manifest.skills[category]);
  }
  return allSkills;
}

function getSkillByName(name) {
  return getAllSkills().find(s => s.name === name);
}

function cmdList() {
  console.log('\n📋 All Skills in Manifest\n');
  for (const [category, skills] of Object.entries(manifest.skills)) {
    console.log(`${category.toUpperCase()}`);
    for (const skill of skills) {
      console.log(`  ${skill.name.padEnd(15)} UUID: ${skill.uuid}`);
    }
    console.log('');
  }
}

function cmdGet(name) {
  const skill = getSkillByName(name);
  if (!skill) {
    console.error(`❌ Skill "${name}" not found`);
    process.exit(1);
  }
  console.log(`\n🎯 ${skill.name}\n`);
  console.log(`UUID:        ${skill.uuid}`);
  console.log(`Category:    ${skill.category}`);
  console.log(`Related Stat: ${skill.relatedStat || 'None'}`);
  console.log(`Description: ${skill.description}\n`);
}

function cmdGranted(name, level = 1) {
  const skill = getSkillByName(name);
  if (!skill) {
    console.error(`❌ Skill "${name}" not found`);
    process.exit(1);
  }
  console.log(`\n✅ Granted Skill Entry\n`);
  console.log(`{`);
  console.log(`  "skillUuid": "${skill.uuid}",`);
  console.log(`  "level": ${level}`);
  console.log(`}\n`);
  console.log(`// For ${skill.name} (level ${level})\n`);
}

function cmdCategory(category) {
  const skills = manifest.skills[category.toLowerCase()];
  if (!skills) {
    console.error(`❌ Category "${category}" not found`);
    console.log(`Valid categories: ${Object.keys(manifest.skills).join(', ')}`);
    process.exit(1);
  }
  console.log(`\n📁 ${category.toUpperCase()} Skills\n`);
  for (const skill of skills) {
    console.log(`${skill.name.padEnd(15)} ${skill.uuid}`);
  }
  console.log('');
}

function showHelp() {
  console.log(`
Skill Lookup Utility

Usage:
  node scripts/skill-lookup.mjs <command> [args]

Commands:
  list                          List all skills
  get <skill-name>              Get skill details by name
  granted <skill-name> [level]  Generate grantedSkills JSON entry (default level: 1)
  category <category>           List skills by category (combat, magic, utility, general)
  help                          Show this help message

Examples:
  node scripts/skill-lookup.mjs list
  node scripts/skill-lookup.mjs get "Swing"
  node scripts/skill-lookup.mjs granted "Swing" 3
  node scripts/skill-lookup.mjs category combat
`);
}

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'list':
    cmdList();
    break;
  case 'get':
    if (!args[0]) {
      console.error('❌ Missing skill name');
      showHelp();
      process.exit(1);
    }
    cmdGet(args[0]);
    break;
  case 'granted':
    if (!args[0]) {
      console.error('❌ Missing skill name');
      showHelp();
      process.exit(1);
    }
    cmdGranted(args[0], parseInt(args[1]) || 1);
    break;
  case 'category':
    if (!args[0]) {
      console.error('❌ Missing category');
      showHelp();
      process.exit(1);
    }
    cmdCategory(args[0]);
    break;
  case 'help':
  default:
    showHelp();
    break;
}
