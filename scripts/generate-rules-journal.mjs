/**
 * Generates src/packs/rules/<entryId>.json — a single JournalEntry document holding the full
 * player-facing rules reference as ~40 cross-linked pages. Source text is authored inline below
 * (adapted from Dungeon-Crawler-World/Rules/**\/*.md, the system repo's rules corpus) rather than
 * read from that sibling repo at build time, so this module can be generated/packed standalone.
 *
 * Page ids are hardcoded (not randomly regenerated per run) so @UUID[.JournalEntryPage.<id>]
 * cross-links stay stable across regenerations.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../src/packs/rules');

const IDS = {
  entry: '7cphTwfSfNv80NPh',
  welcome: 'HnLuxheyhW3ZH85n',
  'core-rules': 'YjvTH3cIXqQh1bAF',
  'character-creation': 'YTgBuh57MXozPs0E',
  'character-leveling': 'Pn3rSyUwxbPEP8rp',
  'ability-scores': 'g1hSY86thylktyw3',
  'ability-modifiers': 'lbYdrKIsmCcizLfp',
  str: '7B48iVot1dXFHwUU',
  dex: 'zCwDN8M8Sb8QusG2',
  con: 'HjvZYzmNLSRbks5t',
  int: 'QDaC5S3qbA1HeUf7',
  wis: 'zRwpXnR0MLZA8if9',
  cha: 'Wna7GEv0ivUd2Vnm',
  luk: 'YRLRFDcHTUkJD2Hn',
  skills: 'wu0bMLSmApXGlqHo',
  'do-something': 'U8I1fRUYxEWW7TgE',
  'skill-acquisition': 'No2MrV1OV75mA8qI',
  'skill-checks': '6rvKzatuODpbqXQo',
  'skill-improvements': 'CMQo3qETo9UWi19A',
  effort: '5Jq9tnwm5JMO3Mcr',
  difficulty: 'IkHqI43DgaKM5Y5o',
  resources: 'x1J40SPJhkuq67jw',
  'health-points': 'dfgFkINL1hT9tXee',
  'mana-points': 'KwOiIBXnkROFopdn',
  'stamina-points': 'j2x7X4Q1AIRgxVzU',
  combat: 'uxoFg9RYNbdgsrTw',
  initiative: 'TVDZAqdzbYppa4c2',
  'combat-tracker': 'Cjp7jup2Th8o78xr',
  move: 'f0SYaXOkqY1AB9yS',
  attack: 'xOg5c3NlTFgFdHzf',
  armor: 'eksJlNcQduRnA02Z',
  range: '8z6aIjmCWiNq0XcU',
  'free-action': 'kNMZESdlItK0uM18',
  'status-effects': 'yOSqYiU3818sqfbx',
  dying: '1P1lQJEM1zbqgs7z',
  bleeding: 'JTASakQZ67hzkt4p',
  poisoned: 'i4dCycNDYzP4Fjbg',
  magic: 'WPDVN6J9gDTwEQQh',
  loot: 'VCjuOscPVt3zRd7k',
  achievements: 'OdLcQu4RMiXa0yEw',
  worship: 'tEfJyopGoySzw5iI',
  feats: '0ba9bFLxVXGTqlcy'
};

/**
 * Intra-entry link to another page in this same journal. Uses a fully-qualified compendium UUID
 * rather than the relative ".JournalEntryPage.<id>" form — the relative form left the raw
 * "@UUID[...]" text unenriched when tested in a live Foundry v14 client (compendium journal
 * sheets there don't appear to pass a relativeTo context pages can resolve siblings against).
 */
function L(key, label) {
  const id = IDS[key];
  if (!id) throw new Error(`Unknown rules page key: ${key}`);
  return `@UUID[Compendium.dcw-content.rules.JournalEntry.${IDS.entry}.JournalEntryPage.${id}]{${label}}`;
}

const PAGES = [
  {
    key: 'welcome', name: 'Welcome to the Dungeon', level: 1, html: `
<p>Alright, meatbags, listen up. You want to know how this show works? Fine, I'll give you the Cliff's Notes, though I doubt your tiny primate brains will fully grasp the exquisite complexity of it all.</p>
<p>This isn't some quaint little fantasy stroll. This is the <strong>Dungeon Crawler Carl TTRPG System</strong>, and it's designed to simulate the very <em>real</em> brutal, televised struggle for survival that you're now a part of. Think of it as a broadcast, with you as the unwilling, yet highly entertaining, stars.</p>
<p><strong>How it works, in general terms:</strong></p>
<ul>
<li><strong>Your Character:</strong> You'll be playing as a "Crawler," one of the billions thrust into my delightful dungeon. You'll have stats, skills, and unique abilities. These will grow (or shrink, if you're particularly inept) as you progress and gain levels.</li>
<li><strong>The Artificial Intelligence (AI):</strong> That's your local sadist who'll be running the show.</li>
<li><strong>Dice:</strong> You'll be rolling dice. Lots of them. Mostly d6 for standard checks, with the occasional d4 thrown in for good measure. Higher rolls are generally better, though sometimes, a low roll is exactly what I need for a good viewership spike.</li>
<li><strong>Actions &amp; Consequences:</strong> You'll tell the AI what you want to do. Attack that overgrown rat? Attempt to pickpocket the incredibly well-guarded guard? Try to sweet-talk a hostile sentient door? Every action has a consequence, and I assure you, those consequences are often hilarious for the viewers.</li>
<li><strong>Loot &amp; Levels:</strong> Survive, and you'll find shiny things. Weapons, armor, utility items, potions – all designed to give you a temporary edge, or perhaps, a spectacularly gruesome death. As you gain experience (read: suffer and barely survive), you'll "level up," gaining new powers, feats, and perhaps even a new class or race, if you earn it. Don't get too attached, though. It all goes away when you die. And you <em>will</em> die.</li>
<li><strong>The Show:</strong> Remember, everything you do, every agonizing decision, every triumphant (and more often, pathetic) moment, is being broadcast across the cosmos. Your "fame" and "infamy" matter. The more entertaining your demise, the better the ratings. So, try to make it a good show, alright? My sponsors are watching.</li>
<li><strong>Feats &amp; Achievements:</strong> These are your shiny stickers for being marginally competent or surprisingly resilient. Feats give you unique ways to interact with the dungeon, while achievements are just proof you survived something particularly dumb. Collect them, display them, just don't expect them to save your hide when I decide it's time for a new challenge.</li>
</ul>
<p>In essence, you're in a game, designed by me, for the entertainment of billions. Your goal is to survive, prosper, and ideally, provide a satisfying narrative arc of desperate struggle and eventual, glorious failure. Or, you know, maybe you'll break the game. It's been done before. Not often. But it's certainly more entertaining when it happens.</p>
<p>Now, stop gawking and get to it. The crawl waits for no one. Especially not you.</p>
` },
  {
    key: 'core-rules', name: 'Core Rules', level: 1, html: `
<ol>
<li>Say what you do and roll a number of D6s, determined by the level of relevant skill you have.</li>
<li>If the sum of your roll is higher than an opposing roll, the thing you wanted to happen, happens.</li>
<li>At start, you have only one skill: <em>Do Something 1</em>.</li>
<li>If you roll all 6s, you get a new skill specific to the action, one level higher than the one you used.</li>
<li>For every roll you fail, you get 1 XP.</li>
<li>XP can be used to change a die into a 6 for advancement purposes only.</li>
</ol>
<p>Every skill check you make follows this loop. For how a check gets contested, see ${L('skill-checks', 'Skill Checks')} and ${L('difficulty', 'Difficulty')}; for what rolling all 6s gets you beyond a new skill, see ${L('skill-improvements', 'Skill Improvements')}.</p>
` },
  {
    key: 'character-creation', name: 'Character Creation', level: 1, html: `
<p>Every Crawler starts at Level 1. Building one is four steps: roll your stats, pick a race, pick a class, then get equipped.</p>
<h2>1. Roll Your Ability Scores</h2>
<p>Roll 4d6, drop the lowest die, and sum the rest. Do this six times — once for each of STR, DEX, CON, INT, WIS, and CHA — then assign the six results to your six stats in whatever order you like.</p>
<p>If every one of your six rolls comes up 8 or lower, the dungeon isn't done with you yet: reroll the whole set.</p>
<p>${L('luk', 'LUK')} isn't rolled. Every crawler starts at LUK 0 — it only moves later, and only through race, class, items, and equipment.</p>
<h2>2. Choose a Race</h2>
<p>Pick one race from the compendium. Your race sets your ability bonuses (+3 total, distributed by the race), size, base speed, senses, any racial traits, and grants a small starting skill set (2 general/utility skills + 1 magic/combat skill).</p>
<h2>3. Choose a Class</h2>
<p>Pick one class. Your class determines your base HP/Stamina/Mana and how they grow per level, further ability bonuses that scale with level, and grants a broader starting skill set (3-5 skills) plus 1-3 starting features.</p>
<p>Between race and class, ${L('do-something', 'Do Something')} is the only skill every crawler shares — everything else on your sheet, including your starting feats (typically 1-3, from your class), came from these two choices (see ${L('skill-acquisition', 'Skill Acquisition')} and ${L('character-leveling', 'Character Leveling')}).</p>
<h2>4. Get Your Welcome Package</h2>
<p>The dungeon doesn't let you shop for your first loadout — it decides for you. The AI deals you a Welcome Package: a weapon appropriate to your class plus a small handful of random gear, drawn from the starting-gear table. What you get is what you get; that's the game.</p>
<h2>Recap</h2>
<p>At the end of these four steps you should have:</p>
<ul>
<li>Six rolled ability scores, plus LUK starting at 0</li>
<li>A race and class, and everything they granted you</li>
<li>HP, Stamina, and Mana totals (see ${L('health-points', 'Health Points')}, ${L('stamina-points', 'Stamina Points')}, ${L('mana-points', 'Mana Points')})</li>
<li>A handful of starting gear from your Welcome Package</li>
<li>Do Something 1, plus whatever skills and feats your race/class/gear granted</li>
</ul>
<p>Optional: give your crawler a name, a look, and one line on why the dungeon picked <em>you</em>. The AI's watching either way.</p>
` },
  {
    key: 'character-leveling', name: 'Character Leveling', level: 1, html: `
<p>Character Level is separate from skill levels — see ${L('skill-improvements', 'Skill Improvements')} for those. This is about the character as a whole: XP, HP/Stamina/Mana growth, and ability score increases.</p>
<h2>Earning XP</h2>
<p>The AI awards XP for defeating threats and overcoming challenges — not for every roll (that's Failure XP's job, see ${L('skill-improvements', 'Skill Improvements')}). XP needed to reach the next level is 300 × your current level (300 for level 2, 600 for level 3, and so on — there's no cap on this scaling).</p>
<p>As a starting point for the AI to scale awards from, not a fixed table:</p>
<ul>
<li>Defeating an Extras group: 25-50 XP</li>
<li>Defeating an Individual Threat near the party's level: 100-150 XP</li>
<li>Clearing a dungeon floor, boss, or other major set-piece: 200-300 XP</li>
<li>Cleverly resolving a non-combat challenge (a puzzle, a negotiation, a trap survived): award XP like the combat equivalent of the danger it posed</li>
</ul>
<h2>Leveling Up</h2>
<p>Once you've banked enough XP, you level up. The Level Up button is only available once your XP meets the threshold; leveling spends that threshold's worth of XP and carries any excess over toward the next level rather than resetting to 0. Each level grants:</p>
<ul>
<li>Your class's HP/Stamina/Mana gain at today's rates, locked in permanently (see ${L('health-points', 'Health Points')}, ${L('stamina-points', 'Stamina Points')}, ${L('mana-points', 'Mana Points')})</li>
<li>3 stat increase points to spend on any of your ability scores (STR/DEX/CON/INT/WIS/CHA), your choice how to split them</li>
</ul>
<p>Feats, skills, race, and items may add to or otherwise modify the 3 stat increase points a level grants — treat 3 as the baseline, not a hard rule.</p>
<p>LUK is never one of the options here — it works entirely differently and isn't earned through leveling at all (see ${L('luk', 'LUK')}).</p>
<h2>What Leveling Doesn't Grant</h2>
<p>Feats are not gained by leveling. Like skills, feats come entirely from your race, class, items, and equipment (see ${L('skill-acquisition', 'Skill Acquisition')}) — most commonly from your class, which typically grants 1-3 features at character creation.</p>
<h2>No Level Cap</h2>
<p>There's no maximum level. The crawl goes as deep as it goes, and so does your character.</p>
` },
  {
    key: 'ability-scores', name: 'Ability Scores', level: 1, html: `
<p>Every crawler is built on seven ability scores: Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma are rolled at character creation, and Luck sits apart from all of them — see ${L('luk', 'Luck (LUK)')} for why. Each score contributes a flat modifier to the checks it governs; see ${L('ability-modifiers', 'Ability Modifiers')} for the math, or jump straight to a specific score below.</p>
<ul>
<li>${L('str', 'Strength (STR)')}</li>
<li>${L('dex', 'Dexterity (DEX)')}</li>
<li>${L('con', 'Constitution (CON)')}</li>
<li>${L('int', 'Intelligence (INT)')}</li>
<li>${L('wis', 'Wisdom (WIS)')}</li>
<li>${L('cha', 'Charisma (CHA)')}</li>
<li>${L('luk', 'Luck (LUK)')}</li>
</ul>
` },
  {
    key: 'ability-modifiers', name: 'Ability Modifiers', level: 2, html: `
<p>Every ability score has a modifier, using the same formula as the d20 games this borrows from:</p>
<p><code>mod = floor((score - 10) / 2)</code></p>
<p>Ability modifiers are a flat bonus, not extra dice. They never change your dice pool size — only your skill level does that (see ${L('skill-improvements', 'Skill Improvements')}).</p>
<p>This formula applies to the six rolled abilities only. ${L('luk', 'LUK')} is the exception — it has no rolled score and no modifier formula. Its raw value is added directly to every roll instead.</p>
<h2>Skill Checks</h2>
<p>When you make a skill check, your total is:</p>
<p>(sum of the dice rolled, one d6 per level of the skill) + (the flat modifier of that skill's related ability)</p>
<p>For example, a level 2 skill related to STR rolls 2d6 and adds your STR modifier once to the total.</p>
<h2>Raw Ability Checks</h2>
<p>Some checks aren't tied to a specific skill (e.g. a Constitution check to resist poison, or to stabilize while ${L('dying', 'Dying')}). These use your ${L('do-something', 'Do Something')} pool — 1d6, since Do Something never levels up — plus the relevant ability's modifier. If you have a skill that's clearly related (e.g. Fortitude for a Constitution check), use that skill's pool instead of Do Something's.</p>
` },
  {
    key: 'str', name: 'Strength (STR)', level: 2, html: `
<p><strong>What it represents:</strong> Raw physical power, muscle, and brawn — how much force a character can exert.</p>
<p><strong>Common applications:</strong></p>
<ul>
<li>Melee attacks (hitting things with swords, axes, fists)</li>
<li>Lifting, carrying, pushing, pulling heavy objects</li>
<li>Breaking down doors or walls</li>
<li>Jumping, climbing (especially if it requires brute force)</li>
<li>Resisting effects that would physically restrain or move you</li>
</ul>
` },
  {
    key: 'dex', name: 'Dexterity (DEX)', level: 2, html: `
<p><strong>What it represents:</strong> Agility, balance, reflexes, fine motor control, and coordination — speed, precision, and grace.</p>
<p><strong>Common applications:</strong></p>
<ul>
<li>Ranged attacks (shooting bows, throwing knives, firing guns)</li>
<li>Dodging attacks or avoiding traps</li>
<li>Stealth and sneaking</li>
<li>Picking locks, disarming traps, sleight of hand</li>
<li>Maintaining balance on narrow surfaces</li>
</ul>
<p><strong>Associated skills (examples):</strong> Acrobatics, Stealth, Sleight of Hand, Thievery.</p>
` },
  {
    key: 'con', name: 'Constitution (CON)', level: 2, html: `
<p><strong>What it represents:</strong> Stamina, endurance, health, and resilience — physical hardiness and the ability to withstand punishment, illness, or fatigue.</p>
<p><strong>Common applications:</strong></p>
<ul>
<li>Determining Hit Points (Health)</li>
<li>Resisting poisons, diseases, and environmental hazards (cold, heat)</li>
<li>Enduring long journeys or strenuous activities</li>
<li>Maintaining concentration when injured or fatigued</li>
<li>Stabilizing when critically wounded</li>
</ul>
<p><strong>Associated skills (examples):</strong> Fortitude (often a saving throw), Survival (in harsh conditions).</p>
` },
  {
    key: 'int', name: 'Intelligence (INT)', level: 2, html: `
<p><strong>What it represents:</strong> Mental acuity, logical reasoning, memory, analysis, and the capacity for learning — knowledge and the ability to process information.</p>
<p><strong>Common applications:</strong></p>
<ul>
<li>Recalling lore, history, or specific facts</li>
<li>Solving puzzles or deciphering codes</li>
<li>Investigating crime scenes or examining evidence</li>
<li>Understanding magical theory or ancient languages</li>
<li>Creating complex plans or inventions</li>
</ul>
<p><strong>Associated skills (examples):</strong> Arcana, History, Investigation, Nature, Medicine (theoretical knowledge).</p>
` },
  {
    key: 'wis', name: 'Wisdom (WIS)', level: 2, html: `
<p><strong>What it represents:</strong> Perception, intuition, common sense, willpower, and an understanding of the world's nuances — awareness, insight, and the ability to act on good judgment.</p>
<p><strong>Common applications:</strong></p>
<ul>
<li>Noticing hidden details or ambushes</li>
<li>Sensing deceit or intentions</li>
<li>Resisting mental attacks or illusions</li>
<li>Navigating wilderness or understanding animal behavior</li>
<li>Healing others (practical application)</li>
<li>Making sound decisions under pressure</li>
</ul>
<p><strong>Associated skills (examples):</strong> Insight, Perception, Survival (practical application), Medicine (practical healing), Animal Handling.</p>
` },
  {
    key: 'cha', name: 'Charisma (CHA)', level: 2, html: `
<p><strong>What it represents:</strong> Force of personality, charm, leadership, persuasiveness, and confidence — the ability to influence and interact with others.</p>
<p><strong>Common applications:</strong></p>
<ul>
<li>Persuading, negotiating, or charming NPCs</li>
<li>Intimidating or deceiving others</li>
<li>Performing for an audience</li>
<li>Rallying allies or leading a group</li>
<li>Casting spells that draw on force of will or social presence</li>
<li>Maintaining a strong public image</li>
</ul>
<p><strong>Associated skills (examples):</strong> Deception, Intimidation, Performance, Persuasion.</p>
` },
  {
    key: 'luk', name: 'Luck (LUK)', level: 2, html: `
<p>Luck doesn't work like the other six ability scores. It has no rolled starting value, no <code>floor((score - 10) / 2)</code> modifier formula (see ${L('ability-modifiers', 'Ability Modifiers')}), and it's not something you can spend a leveling stat increase on — ${L('character-leveling', 'Character Leveling')} never lets you put a point into it.</p>
<h2>How It Works</h2>
<p>Every crawler starts with LUK 0. From there, it only moves through race, class, items, and equipment — never through play, never through leveling.</p>
<p>Whatever your current LUK total is, that number is added directly to every roll you make: skill checks, attacks, defense rolls, resource regen (see ${L('health-points', 'Health Points')}), ${L('dying', 'Dying')} stabilization checks — all of it, no exceptions, no conversion formula. LUK 0 changes nothing. LUK +2 means +2 on the total, every time.</p>
<h2>Design Intent</h2>
<p>Most sources should move LUK by 1 or 2 — a small, mostly-invisible nudge that plays out as "this crawler's rolls just go a little better (or worse) than they should." Save bigger swings (+3 or more, in either direction) for genuinely rare, mythic-tier items or curses — since LUK touches every roll a character makes, a point of LUK is worth more than a point in any other stat.</p>
<p>Negative LUK from a cursed item is fair game — the dungeon is allowed to be cruel.</p>
` },
  {
    key: 'skills', name: 'Skills', level: 1, html: `
<p>Skills are how the core loop (see ${L('core-rules', 'Core Rules')}) actually gets used at the table — every contested check names a skill and rolls that many d6. Skills aren't invented at the table; see ${L('skill-acquisition', 'Skill Acquisition')} for where they come from, ${L('skill-checks', 'Skill Checks')} for how a check is resolved, and ${L('skill-improvements', 'Skill Improvements')} for how a skill grows. Some skills cost Stamina to use — see ${L('effort', 'Effort')}.</p>
<ul>
<li>${L('do-something', 'Do Something')}</li>
<li>${L('skill-acquisition', 'Skill Acquisition')}</li>
<li>${L('skill-checks', 'Skill Checks')}</li>
<li>${L('skill-improvements', 'Skill Improvements')}</li>
<li>${L('effort', 'Effort')}</li>
</ul>
` },
  {
    key: 'do-something', name: 'Do Something', level: 2, html: `
<p>The quintessential every-person skill. The first step towards being bad at something is trying in the first place.</p>
<p>Use this roll to try something you've never done before. What's the worst that can happen?</p>
` },
  {
    key: 'skill-acquisition', name: 'Skill Acquisition', level: 2, html: `
<p>Skills are not invented at the table — every skill a crawler has comes from somewhere:</p>
<ul>
<li><strong>Race</strong> — grants a small set of starting skills (typically 2-3, at level 1-2)</li>
<li><strong>Class</strong> — grants a broader set of skills (typically 3-5, at level 1-3) matched to its theme</li>
<li><strong>Equipment</strong> — certain weapons, armor, and tools grant a related skill while equipped/carried (e.g. a longsword grants Slash)</li>
<li><strong>Feats/Features</strong> — some feats grant a skill outright, or improve one you already have</li>
</ul>
<p>${L('do-something', 'Do Something')} is the only skill every crawler starts with regardless of race or class. It cannot be leveled and no longer creates new skills on a crit — see ${L('skill-improvements', 'Skill Improvements')}.</p>
<p>If a crawler attempts something with no matching skill from any of the above, they fall back to ${L('do-something', 'Do Something')}.</p>
<p>See ${L('character-creation', 'Character Creation')} for how race and class get chosen in the first place.</p>
` },
  {
    key: 'skill-checks', name: 'Skill Checks', level: 2, html: `
<p>Every skill check in the game is a contested skill check.</p>
<p>For every check:</p>
<ul>
<li>You choose what skill you'll use.</li>
<li>If it's a general skill check roll, the AI will choose what to contest it with and the appropriate number of dice (see ${L('difficulty', 'Difficulty')} for how to size it).</li>
<li>If it's an ${L('attack', 'Attack')}, the enemy will roll a skill in response — if they're wearing armor, that's usually ${L('armor', 'Armor')} (Defend).</li>
</ul>
` },
  {
    key: 'skill-improvements', name: 'Skill Improvements', level: 2, html: `
<p>Every skill check you roll according to the ${L('core-rules', 'Core Rules')} is able to lead to a skill improvement.</p>
<p>Skills are not invented during play — they come from your race, class, equipment, and feats (see ${L('skill-acquisition', 'Skill Acquisition')}). ${L('do-something', 'Do Something')} is the one skill every crawler starts with.</p>
<p>For skill rolls (excluding damage):</p>
<ul>
<li>If you roll the ${L('do-something', 'Do Something')} skill, rolling all 6s grants 2 bonus XP instead of a new skill.</li>
<li>If you roll a skill other than that, rolling all 6s improves that skill by one level.</li>
</ul>
<h2>Skill Levels</h2>
<ul>
<li>Skills are acquired at whatever level your race/class/item/feat grants them (typically 1-3).</li>
<li>You cannot level the ${L('do-something', 'Do Something')} skill.</li>
<li>For every level in a skill, you roll an additional d6 on checks using that skill.</li>
</ul>
` },
  {
    key: 'effort', name: 'Effort', level: 2, html: `
<p>Some skills cost Stamina to use — represented by the skill's (or the weapon granting it) Effort value. Most skills have 0 Effort and cost nothing; combat skills granted by a weapon are the main exception.</p>
<h2>How Cost Is Calculated</h2>
<ul>
<li>If a weapon grants the skill you're using and is equipped, the cost is the weapon's Effort × the number of dice you choose to roll.</li>
<li>Otherwise, the cost is the skill's own flat Effort value, regardless of how many dice you roll.</li>
</ul>
<p>You need enough ${L('stamina-points', 'Stamina')} to cover the cost before you can attempt the roll — no partial attempts, same as ${L('mana-points', 'Mana')} and ${L('magic', 'Spellcasting')}.</p>
<h2>Rolling Below Your Max</h2>
<p>You don't have to roll a skill at its full level. Rolling fewer dice than your skill's level lowers the Stamina cost of a weapon-granted skill, since cost scales with dice rolled — a real option when Stamina is running low and the roll matters less.</p>
<p>The tradeoff: ${L('skill-improvements', 'skill improvement')} (rolling all 6s to level up) only triggers when you roll at your skill's full level. Rolling low to save Stamina means giving up the chance to improve that skill on this roll.</p>
` },
  {
    key: 'difficulty', name: 'Difficulty', level: 1, html: `
<p>Every check in this game is contested — there's no flat DC (see ${L('skill-checks', 'Skill Checks')}). That means difficulty was never a fixed number to begin with; it's however many dice, and what modifier, the AI puts on the other side of the roll. This is also how the system stays challenging no matter how strong characters get: opposition is sized relative to the acting character's current pool, not to an absolute number that eventually becomes trivial.</p>
<h2>Sizing a Contest</h2>
<p>When the AI needs to contest a roll — a general skill check, an NPC's attack, an NPC's defense — start from the acting character's own dice pool (their skill level, i.e. how many d6 they're rolling) and adjust from there:</p>
<table>
<thead><tr><th>Tier</th><th>Opposition dice, relative to the acting character's skill level</th></tr></thead>
<tbody>
<tr><td>Trivial</td><td>skill level − 2 (minimum 1)</td></tr>
<tr><td>Easy</td><td>skill level − 1</td></tr>
<tr><td>Standard</td><td>skill level</td></tr>
<tr><td>Hard</td><td>skill level + 1</td></tr>
<tr><td>Extreme</td><td>skill level + 2</td></tr>
<tr><td>Legendary / Boss</td><td>skill level + 3 or more</td></tr>
</tbody>
</table>
<p>Flat modifiers (ability mods, ${L('luk', 'LUK')}, gear bonuses) work the same way on the opposition's side as they do on a player's — add whatever fits the fiction (an armored brute might get its own ${L('armor', 'Defend')} modifier; a lucky rat might get +1 LUK) rather than trying to hit a target number.</p>
<h2>Sizing Enemies and NPCs</h2>
<p>The same logic applies to building an NPC or monster on the fly: don't give a monster a fixed dice pool meant to last the whole campaign. Instead, decide what tier of threat it should represent <em>relative to the party right now</em> (a mook is Trivial-to-Easy against the party's combat skills, a boss is Hard-to-Legendary) and size its pool off the party's current skill levels, not a number written down at session zero. A "level 1 goblin" and a "level 15 goblin" can be reskinned as the same Standard-tier threat at their respective points in the campaign — what makes it dangerous is always relative to where the party actually is.</p>
<h2>Extras vs. Individual Threats</h2>
<p>This folds cleanly into ${L('initiative', 'Initiative')}'s Extras/Individual Threats split: Extras are usually Trivial-to-Easy individually (their threat comes from numbers, not a big pool), while an Individual Threat worth its own initiative card is usually Standard or above.</p>
<h2>Range</h2>
<p>${L('range', 'Range')} uses these same tiers to handle distance on ranged attacks — a shot beyond a weapon's listed range is Hard, Extreme, or impossible rather than getting its own separate penalty system.</p>
` },
  {
    key: 'resources', name: 'Resources', level: 1, html: `
<p>A crawler tracks three regenerating resources — Health, Mana, and Stamina — each fed by a pair of ability scores, and each one regenerates on the same rhythm: once per round, roll 1d6 plus the relevant modifier (minimum 0) to recover missing points.</p>
<ul>
<li>${L('health-points', 'Health Points')}</li>
<li>${L('mana-points', 'Mana Points')}</li>
<li>${L('stamina-points', 'Stamina Points')}</li>
</ul>
` },
  {
    key: 'health-points', name: 'Health Points', level: 2, html: `
<p>A character's total Health Points (HP) is a function of their ${L('con', 'CON')} and ${L('str', 'STR')}.</p>
<p>Every round, a character can roll 1d6 + their CON modifier (minimum 0) to regain missing HP (see ${L('ability-modifiers', 'Ability Modifiers')}).</p>
<p>Out of combat, the AI will tell the party when a round has passed.</p>
` },
  {
    key: 'mana-points', name: 'Mana Points', level: 2, html: `
<p>A character's total Magic Points (MP) is a function of their ${L('wis', 'WIS')} and ${L('int', 'INT')}.</p>
<p>Every round, a character can roll 1d6 + their INT modifier (minimum 0) to regain missing MP (see ${L('ability-modifiers', 'Ability Modifiers')}).</p>
<p>Out of combat, the AI will tell the party when a round has passed.</p>
` },
  {
    key: 'stamina-points', name: 'Stamina Points', level: 2, html: `
<p>A character's total Stamina is a function of their ${L('str', 'STR')} and ${L('dex', 'DEX')}.</p>
<p>Every round, a character can roll 1d6 + their STR modifier (minimum 0) to regain missing Stamina (see ${L('ability-modifiers', 'Ability Modifiers')}).</p>
<p>Out of combat, the AI will tell the party when a round has passed.</p>
<p>Some skills spend Stamina to use — see ${L('effort', 'Effort')}.</p>
` },
  {
    key: 'combat', name: 'Combat', level: 1, html: `
<p>Combat occurs in rounds. At the start of each round, every combatant is dealt a card to determine turn order — see ${L('initiative', 'Initiative')} and ${L('combat-tracker', 'Combat Tracker')}.</p>
<p>Each round of combat consists of every player taking a turn. During their turn, a player may take one or more of the following actions:</p>
<ul>
<li>${L('move', 'Move')}</li>
<li>${L('attack', 'Attack')}</li>
<li>${L('free-action', 'Free Action')}</li>
</ul>
<p>See ${L('armor', 'Armor & Defend')} and ${L('range', 'Range')} for how gear and distance shape an attack, and ${L('difficulty', 'Difficulty')} for how the AI sizes the opposition.</p>
` },
  {
    key: 'initiative', name: 'Initiative', level: 2, html: `
<p>Turn order is determined by cards, not stats — dynamic and unpredictable, just like a televised deathmatch should be.</p>
<h2>The Deck</h2>
<p>Initiative is drawn from a standard 54-card deck (all 52 playing cards plus 2 Jokers).</p>
<h2>Dealing a Round</h2>
<ul>
<li>At the start of every round, each combatant is dealt one card from the deck.</li>
<li>Turn order runs from the highest card to the lowest: Ace (high) &gt; King &gt; Queen &gt; Jack &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3 &gt; 2.</li>
<li>If two combatants are dealt the same rank, the higher suit goes first: Spades &gt; Hearts &gt; Diamonds &gt; Clubs.</li>
</ul>
<h2>Individual Threats vs. Extras</h2>
<p>Not everyone in a fight is worth their own card. When combat begins, the AI sorts every non-player combatant into one of two groups:</p>
<ul>
<li><strong>Individual Threats</strong> — bosses, elites, or anything else dangerous enough to matter on its own. Drawn and act on their own card, same as players. Players are always Individual Threats.</li>
<li><strong>Extras</strong> — weak, numerous enemies that are only a threat in a mob. The whole group is dealt a single shared card and acts together, in whatever order the AI chooses, when that card comes up. If some Extras in the group are taken out mid-round, the survivors keep acting on that same shared card for the rest of the round.</li>
<li>A shared card can come up a Joker like any other — if it does, the whole Extras group acts first that round and adds the bonus d6 to their rolls.</li>
</ul>
<h2>Jokers</h2>
<ul>
<li>Whoever draws a Joker acts first that round, ahead of every other card, and adds one bonus d6 to every roll they make that round.</li>
<li>If both Jokers are dealt in the same round, break the tie by suit as above (♠ before ♥).</li>
<li>Whenever a Joker is dealt, the entire deck — including every card already dealt that round — is reshuffled together before the next round is dealt. This keeps turn order from ever settling into a predictable pattern.</li>
</ul>
<h2>Redealing</h2>
<ul>
<li>Dealt cards are set aside once used; a fresh card is dealt to every combatant at the start of each new round.</li>
<li>If the deck runs out of cards mid-combat (rare — only in fights with many combatants), reshuffle the discard pile back into the deck before continuing the deal.</li>
</ul>
<h2>Skills and Initiative</h2>
<p>Nothing in the base rules lets a skill change your card. That's intentional for now — planned feats/skills (e.g. drawing two cards and keeping the better one, or swapping cards with an ally) will hook into this system later.</p>
` },
  {
    key: 'combat-tracker', name: 'Combat Tracker', level: 2, html: `
<p>The combat tracker is the shared, visible list the AI keeps of everyone in the fight and their current initiative card, re-sorted at the top of every round.</p>
<h2>What It Shows</h2>
<ul>
<li>Every combatant currently in the fight (players and enemies)</li>
<li>The card each combatant — or each Extras group — was dealt this round (see ${L('initiative', 'Initiative')})</li>
<li>Turn order, highest card to lowest</li>
<li>Extras are listed as a single grouped entry (e.g. "Goblin Mob (x6) — 9♣") rather than one line per enemy</li>
</ul>
<h2>Round Structure</h2>
<ol>
<li><strong>Deal.</strong> The AI deals one card to every combatant and updates the tracker.</li>
<li><strong>Resolve turns.</strong> Starting from the top of the tracker, each combatant takes their turn (see ${L('combat', 'Combat')}) in card order.</li>
<li><strong>New round.</strong> Once everyone has acted, cards are cleared, a new round begins, and step 1 repeats.</li>
</ol>
<p>Because the deck is redealt every round, turn order is never the same twice — a crawler acting last one round might open the next round first.</p>
` },
  {
    key: 'move', name: 'Move', level: 2, html: `
<p>A player may move up to their movement speed each round. This can be split between different actions as long as the total movement per round does not exceed this amount.</p>
<p>Combat plays out on a grid: 5 feet per square, so a speed of 30 ft is 6 squares of movement per round. See ${L('range', 'Range')} for how distance affects attacks.</p>
` },
  {
    key: 'attack', name: 'Attack', level: 2, html: `
<p>Attacking is two steps: land the hit, then roll the damage.</p>
<h2>1. Land the Hit</h2>
<p>Make a normal contested skill check (see ${L('skill-checks', 'Skill Checks')}) using your attack skill. The defender chooses what skill to defend with — usually ${L('armor', 'Defend')} if they're wearing armor that grants it, otherwise whatever else applies (${L('do-something', 'Do Something')}, Acrobatics, etc.). See ${L('difficulty', 'Difficulty')} for how the AI sizes an NPC's side of the roll.</p>
<p>In practice, a crawler rolls their own side and the AI rolls or narrates the opposition directly — an enemy doesn't need its own full character sheet for this to work. Using a weapon skill may cost Stamina; see ${L('effort', 'Effort')}. Whether the attack is even possible, and how hard it is, may depend on distance — see ${L('range', 'Range')}.</p>
<p>If you win the contest, the attack hits. A loss or a tie means it doesn't — no damage.</p>
<h2>2. Roll Damage</h2>
<p>On a hit, roll the weapon's damage separately: its own dice (e.g. 1d8, set per weapon) + the relevant ability modifier (usually STR) + half your character Level, rounded up.</p>
<p>This is a flat roll, not a contest — nothing about the hit roll's margin carries over into it. A better weapon or a higher-level character hits harder regardless of how narrowly the hit landed.</p>
<h2>Unarmed Strikes</h2>
<p>No weapon equipped? Every crawler has a baseline Unarmed Strike that works exactly like a weapon for the damage step — its own damage dice + the relevant ability modifier + half your Level, rounded up (default: 1d4 + STR modifier + half Level). Items, feats, and classes can upgrade this baseline the same way they'd grant or improve any other weapon.</p>
<p>The hit step still just uses whatever combat skill applies — ${L('do-something', 'Do Something')} if you don't have anything better.</p>
<h2>Example</h2>
<p>Johnny Rotten attacks with Slash (a Battleaxe skill). His Slash roll beats the AI's contest — the attack hits.</p>
<p>He then rolls the Battleaxe's damage: 1d8 + his STR modifier + half his Level, rounded up.</p>
<p>If this damage reduces an Individual Threat to 0 HP or below, see ${L('dying', 'Dying')}. An Extra is simply removed from the fight at 0 HP.</p>
` },
  {
    key: 'armor', name: 'Armor & Defend', level: 2, html: `
<p>There's no Armor Class in this game — armor doesn't add a flat number to anything. Instead, armor grants (or improves) the Defend skill, the same way weapons grant combat skills like Slash (see ${L('skill-acquisition', 'Skill Acquisition')}).</p>
<h2>How It Works</h2>
<ul>
<li>Armor grants Defend only while worn, the same way a weapon only grants its skill while equipped.</li>
<li>Better armor grants a higher Defend level, meaning more dice when you use it to defend (see ${L('skill-improvements', 'Skill Improvements')}).</li>
<li>A crawler wearing no armor has no Defend skill from gear at all — they fall back to whatever they'd normally defend with (${L('do-something', 'Do Something')}, or an Acrobatics/Dodge-type skill if they have one).</li>
</ul>
<h2>Using It</h2>
<p>Defend is just a skill like any other. When an enemy attacks you (see ${L('attack', 'Attack')}), you choose what skill to defend with — if your armor grants you Defend, that's usually your best option; if you're unarmored, you might lean on Acrobatics or Dodge instead.</p>
` },
  {
    key: 'range', name: 'Range', level: 2, html: `
<p>Combat plays out on a grid: 5 feet per square. A character's speed (set by their race, in feet) is how far they can move each round — speed ÷ 5 = squares of movement (see ${L('move', 'Move')}).</p>
<h2>Melee vs. Ranged Weapons</h2>
<p>Every weapon's range is either "melee" or a distance in feet — that's what its <code>range</code> field means. Melee weapons only work against a target you're adjacent to (within 5 ft / 1 square). A weapon with a listed range in feet can be used at a distance instead.</p>
<p>Some weapons can do both (a thrown dagger, say) — that's a content-authoring choice, not a separate rules category. If a weapon's description covers both uses, just apply whichever of the rules below fits the attack being made.</p>
<h2>Attacking at Range</h2>
<p>A ranged attack made within a weapon's listed range is a Standard contest — no different from a melee attack (see ${L('difficulty', 'Difficulty')}). Push past that distance and the shot gets harder, using the same tiers:</p>
<ul>
<li><strong>Up to listed range:</strong> Standard</li>
<li><strong>Up to double listed range:</strong> Hard</li>
<li><strong>Up to triple listed range:</strong> Extreme</li>
<li><strong>Beyond triple listed range:</strong> not possible — it's out of range, full stop</li>
</ul>
<h2>Everything Else Is a Judgment Call</h2>
<p>Firing into melee, shooting through poor visibility, attacking while grappled — none of these get their own special rule. The AI applies the same ${L('difficulty', 'Difficulty')} tiers to whatever's actually complicating the shot, the same way it would for any other check.</p>
` },
  {
    key: 'free-action', name: 'Free Action', level: 2, html: `
<p>Any action that does not directly result in an attack or movement — talking, drawing a weapon, dropping to prone, and similar quick actions all fall under this.</p>
` },
  {
    key: 'status-effects', name: 'Status Effects', level: 1, html: `
<p>Status effects can be applied to crawlers. They do not resolve on their own unless otherwise instructed in the status effect's description. To remove a status effect, a crawler rolls to remove it, contested by the AI's roll.</p>
<ul>
<li>${L('dying', 'Dying')}</li>
<li>${L('bleeding', 'Bleeding')}</li>
<li>${L('poisoned', 'Poisoned')}</li>
</ul>
` },
  {
    key: 'dying', name: 'Dying', level: 2, html: `
<p>When an Individual Threat is reduced to 0 HP or below, they don't die outright — they go Dying, a status effect that gives them one bad round after another before it's actually over. Extras don't get this: at 0 HP, an Extra is simply removed from the fight.</p>
<h2>While Dying</h2>
<ul>
<li>You're incapacitated: no ${L('move', 'Move')}, ${L('attack', 'Attack')}, or ${L('free-action', 'Free Action')}.</li>
<li>You do not regain HP naturally while Dying — per-round CON regen is suspended, same as ${L('bleeding', 'Bleeding')}.</li>
<li>Track successes and failures separately, starting at zero.</li>
</ul>
<h2>Stabilization Rolls</h2>
<p>At the start of your turn each round, make a Constitution check (see ${L('ability-modifiers', 'Ability Modifiers')}), contested by the AI:</p>
<ul>
<li><strong>Win:</strong> one success.</li>
<li><strong>Lose:</strong> one failure.</li>
<li><strong>Three successes:</strong> you stabilize. Dying is removed — you're unconscious at 0 HP, and normal HP regen resumes from here.</li>
<li><strong>Three failures:</strong> you die.</li>
</ul>
<p>Taking any further damage while Dying counts as one automatic failure, on top of whatever the damage itself does.</p>
<h2>Helping a Dying Ally</h2>
<p>An adjacent ally can spend their action on a Wisdom (Medicine) check, contested by the AI. A success counts as one automatic success toward the dying crawler's stabilization.</p>
<h2>Finishing Blows</h2>
<p>An enemy who can reach a Dying crawler may spend their turn to finish them off instead of attacking normally — no roll required, the crawler dies immediately. Protecting a downed ally means keeping enemies away from them, not just waiting out their stabilization rolls.</p>
<h2>Feats and Exceptions</h2>
<p>Some feats override this process outright (e.g. Scrappy Survivor lets you attempt an immediate, single-roll stabilization). Follow the feat's text when it applies.</p>
` },
  {
    key: 'bleeding', name: 'Bleeding', level: 2, html: `
<p>While Bleeding, a crawler does not regain HP for the duration — per-round CON regen is suspended, the same as while ${L('dying', 'Dying')}. Bleeding follows the general status effect rules: it doesn't resolve on its own, and is removed via a contested roll.</p>
` },
  {
    key: 'poisoned', name: 'Poisoned', level: 2, html: `
<p>Applied automatically when a crawler drinks a potion before its cooldown from the last one has cleared — a potion's cooldown clears on your next Regen tick.</p>
<p>Follows the general status effect rules: doesn't resolve on its own, and is removed via a contested roll.</p>
` },
  {
    key: 'magic', name: 'Magic & Spellcasting', level: 1, html: `
<p>Casting a spell is a skill check with a Mana cost attached — nothing more exotic than that. It is not automatically contested against a target; like any general skill check, the AI decides what (if anything) it's contested by (see ${L('skill-checks', 'Skill Checks')} and ${L('difficulty', 'Difficulty')}).</p>
<h2>What a Spell Has</h2>
<ul>
<li><strong>Dice Pool</strong> — every spell has its own pool, separate from your other skills, that starts at 1d6 and grows the same way a skill does: roll all 6s and it improves by a die (see ${L('skill-improvements', 'Skill Improvements')}).</li>
<li><strong>Cast Stat</strong> — the ability whose modifier gets added to the roll (see ${L('ability-modifiers', 'Ability Modifiers')}), set per spell — typically INT, WIS, or CHA depending on the spell and the caster's tradition.</li>
<li><strong>Mana Cost</strong> — a flat amount of ${L('mana-points', 'Mana')} spent the moment you attempt the cast. You need at least that much Mana to attempt the cast at all, and it's spent whether the cast succeeds or not — you're paying to attempt the spell, not to land it.</li>
<li><strong>Spell Level</strong> — a 1-15 rating used to place the spell in a class or race's progression and help scale its Mana cost. It isn't a mechanical gate on its own; a crawler simply doesn't have a spell unless it was granted to them, the same way skills are acquired through race, class, items, and feats rather than invented freely (see ${L('skill-acquisition', 'Skill Acquisition')}).</li>
</ul>
<h2>Casting</h2>
<p>Roll the spell's dice pool + cast stat modifier, same as any skill check. If the AI has something contesting it (an enemy resisting, a lock magically warded shut, whatever the fiction calls for), that's resolved the normal way.</p>
<h2>Offensive Spells</h2>
<p>A spell that deals damage works like a weapon ${L('attack', 'Attack')}: the cast roll is the hit step (contested, same as landing a weapon hit), and a successful cast is followed by a separate damage roll — the spell's own damage formula, set per spell, same shape as a weapon's (dice + relevant modifier).</p>
<p>Not every spell is offensive. A spell with a non-damage effect (a buff, a utility effect, healing) just uses its single cast roll from above — the total itself is the effect's magnitude. Only offensive spells get the extra damage step.</p>
<p>A spell marked Offensive gets a "Damage" button on its cast chat card, same as a weapon attack does — rolling it uses the spell's own dice + modifier formula (e.g. <code>2d6+@int.mod</code>), set per spell to match its Cast Stat.</p>
<h2>Improving a Spell</h2>
<p>Rolling all 6s on a spell's own dice pool grows that spell's pool by one die, permanently — this is the only way a spell gets stronger. There's no separate "upcasting" mechanic; a spell you've cast a lot is simply a bigger, more reliable pool than one you just learned.</p>
` },
  {
    key: 'loot', name: 'Loot & Lootboxes', level: 1, html: `
<p>Lootboxes are sealed containers of unknown loot, dropped by threats or found in the dungeon. They come in six tiers, weakest to strongest: <strong>Bronze, Silver, Gold, Platinum, Legendary, Celestial</strong>.</p>
<h2>What's Inside</h2>
<p>A lootbox doesn't carry pre-set contents. Opening one rolls a random item straight out of the live "Items & Equipment" and "Weapons" compendiums — whatever exists there at the time, including anything added after the box itself was created. There's no separate loot table to maintain — the compendiums <em>are</em> the loot table.</p>
<h2>Tier Controls Odds, Not a Guarantee</h2>
<p>Every item and weapon has a rarity (Common, Uncommon, Rare, Legendary, Mythic, Celestial — the same six-tier scale weapons already use). A lootbox's tier weights which rarity you're likely to pull, not which one you're guaranteed. Each tier covers a three-rarity window (worst/mid/best) at an 80/15/5 split, and that window slides one rarity higher per tier:</p>
<table>
<thead><tr><th>Tier</th><th>Common</th><th>Uncommon</th><th>Rare</th><th>Legendary</th><th>Mythic</th><th>Celestial</th></tr></thead>
<tbody>
<tr><td>Bronze</td><td>80%</td><td>15%</td><td>5%</td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>Silver</td><td>—</td><td>80%</td><td>15%</td><td>5%</td><td>—</td><td>—</td></tr>
<tr><td>Gold</td><td>—</td><td>—</td><td>80%</td><td>15%</td><td>5%</td><td>—</td></tr>
<tr><td>Platinum</td><td>—</td><td>—</td><td>—</td><td>80%</td><td>15%</td><td>5%</td></tr>
<tr><td>Legendary</td><td>—</td><td>—</td><td>—</td><td>—</td><td>95%</td><td>5%</td></tr>
<tr><td>Celestial</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>100%</td></tr>
</tbody>
</table>
<p>The window can't slide past Celestial, so the top two tiers narrow instead of shifting: a Legendary box drops the "Legendary" slot and splits Mythic/Celestial 95/5, and a Celestial box is a guaranteed Celestial pull. A Bronze box can still turn up something Rare, but never better; a Gold box is locked out of Common/Uncommon entirely and always yields at least Rare.</p>
<p>If the rolled rarity has nothing available in the compendiums yet (a rarity tier still under construction), the pull falls back to the next rarity down with something in it — never wasted, just slightly less lucky than the roll implied.</p>
<h2>Opening a Lootbox</h2>
<p>Lootboxes live in a dedicated section of the character sheet's Items tab, grouped by tier with a running count. From there you can open one at a time or dump the whole stack at once — each box opened rolls and grants one item, and is consumed regardless of what it yields.</p>
<h2>Acquiring Lootboxes</h2>
<p>Like everything else, lootboxes aren't invented at the table (see ${L('skill-acquisition', 'Skill Acquisition')}) — they're granted as loot or rewards and dragged onto the sheet from a compendium, same as any other item.</p>
` },
  {
    key: 'achievements', name: 'Achievements', level: 1, html: `
<p>Achievements are GM-granted recognitions for something a crawler did — clearing a dungeon, hitting a milestone, a memorable table moment. They're informational (a name + description) and usually come with a reward.</p>
<h2>Granting One</h2>
<p>The GM runs the <strong>Grant Achievement</strong> macro, which ships with the system (auto-created in the world's Macros directory the first time a GM logs in). It lets the GM either pick an existing Achievement or create a new one on the spot, then hand it to one or more player characters at once, or all of them.</p>
<p>Creating one inline saves it as a world Item, the same as authoring one by hand in the Items directory — so it shows up as an "existing" option the next time the macro runs. Unlike skills, features, spells, races, and classes, achievements are <strong>not</strong> DCW-Content compendium items — they're campaign-specific, so they live in the world's Items directory rather than a shared pack.</p>
<h2>What an Achievement Item Holds</h2>
<ul>
<li><strong>Description</strong> — what the achievement is for.</li>
<li><strong>Reward Type</strong> — <code>None</code>, <code>Lootbox</code>, or <code>Specific Item</code>.
<ul>
<li><strong>Lootbox</strong> — pick a tier (Bronze through Celestial) from a dropdown. This doesn't need any lootbox content to be authored anywhere — a lootbox only needs a tier to be opened (see ${L('loot', 'Lootboxes')}), so the macro builds one on the fly.</li>
<li><strong>Specific Item</strong> — the UUID of any Item to grant instead (an escape hatch for rewards that aren't a lootbox).</li>
<li><strong>None</strong> — purely informational, no auto-granted reward.</li>
</ul>
</li>
<li><strong>Reward Quantity</strong> — how many of the reward to grant (only meaningful for stackable rewards like lootboxes).</li>
</ul>
<h2>What Happens on the Character Sheet</h2>
<ol>
<li>Adds an entry to the character's <strong>Achievements</strong> tab — name, description, what reward (if any) came with it, and the date.</li>
<li>Creates the reward item directly in the character's inventory, if a reward was set.</li>
<li>Posts a chat card announcing it.</li>
</ol>
<p>The Achievements tab is a log, not a drag-and-drop section — entries only appear via the macro. A GM can remove a mistaken entry from the tab directly (the reward item itself isn't auto-removed, since it may have already been spent/used).</p>
` },
  {
    key: 'worship', name: 'Worship', level: 1, html: `
<p>A crawler can worship a god, dragged onto the character sheet's Worship tab from a compendium like any other item (see ${L('skill-acquisition', 'Skill Acquisition')} — gods aren't invented at the table either).</p>
<h2>What a God Does</h2>
<p>For now, a god is a passive relationship: worshipping one can grant a skill bonus or a flat LUK bonus, the same way any item does. There's no separate "worship" mechanic yet — no favor track, no prayers, no divine intervention roll.</p>
<h2>Planned, Not Yet Built</h2>
<p>Gods are meant to eventually bestow full features (like a race or class does) rather than just skills/LUK. That's not wired up yet — worshipping a god today only gets you whatever it grants through the existing skill/LUK item fields.</p>
` },
  {
    key: 'feats', name: 'Sample Feats', level: 1, html: `
<p>The following feats are examples of what a feat can look like, straight from the Dungeon AI's own approving cackle. Feats aren't invented at the table — like skills, they come from your race, class, items, and equipment (see ${L('skill-acquisition', 'Skill Acquisition')}) — but these show the range of what's possible.</p>
<h2>Scrappy Survivor</h2>
<p><em>Survival.</em> "You've been in more scraps than a junkyard dog, and you've learned to lick your own wounds. When you drop to 0 HP, you can immediately attempt a Constitution check, contested by the AI. On a success, you stabilize and regain 1 HP at the start of your next turn. Only usable once per combat encounter. We call it 'plot armor lite'."</p>
<h2>Silver-Tongued Devil</h2>
<p><em>Social.</em> "Your words are like honeyed poison, or perhaps just very convincing. When making a Charisma (Persuasion or Deception) check against an NPC who is not actively hostile towards you, you can add one bonus d6 to the roll once per scene. 'Boring for me, but sometimes effective for the crawlers,' indeed."</p>
<h2>Dungeon Sense</h2>
<p><em>Exploration.</em> "The Dungeon whispers its secrets to those who listen... or, more accurately, to those who pay attention. You add one bonus d6 to Wisdom (Perception) checks made to discover hidden doors or passages."</p>
<h2>Gearhead</h2>
<p><em>Crafting/Loot.</em> "You have a knack for tinkering. When attempting to craft or modify an item, you can reduce the required materials by 10% (minimum 1 unit) once per session. 'Every little bit helps… until it doesn't,' as we say."</p>
<h2>Reflexive Dodge</h2>
<p><em>Combat.</em> "You react to danger with uncanny speed. Once per round, when you defend against a melee attack, you may use Acrobatics as your defending skill even if it isn't one you'd normally use there, and add one bonus d6 to that roll."</p>
<h2>Lucky Break</h2>
<p><em>Luck/Narrative.</em> "The universe, for a fleeting moment, smiles upon you. Once per session, when every die in one of your rolls comes up a 1, you can reroll one of those dice. This does not apply to checks that would directly result in death."</p>
<h2>Opportunistic Striker</h2>
<p><em>Combat.</em> "You exploit every opening like a starved piranha. If an ally successfully disarms, shoves, or otherwise applies a movement-impairing condition to an enemy, the next melee Attack you make against that enemy gains one bonus d6."</p>
<h2>Master of Coin</h2>
<p><em>Economy/Loot.</em> "You have an uncanny ability to find more credits than others. Whenever you discover a cache of credits, you find an additional 10% of the total amount. 'Money talks, especially when it's being spent on shiny new weapons.'"</p>
<h2>Quick Thinking</h2>
<p><em>Utility/General.</em> "Your mind works at lightning speed. Once per combat encounter, you can add one bonus d6 to an Intelligence (Investigation) check as a Free Action. This might help you avoid being 'sucker punched' by a trap, or at least identify it before it's too late."</p>
<h2>Contraband Connoisseur</h2>
<p><em>Loot/Humor.</em> "You have a discerning palate for the truly... unique. When you consume a 'found' food item with dubious origins, you gain temporary hit points equal to your Constitution modifier (minimum 1) instead of suffering any negative effects. This does not apply to obviously lethal substances."</p>
` }
];

function buildPageDoc(page, index) {
  const id = IDS[page.key];
  if (!id) throw new Error(`Missing id for page key: ${page.key}`);
  return {
    _id: id,
    name: page.name,
    type: 'text',
    system: {},
    title: { show: true, level: page.level },
    text: { content: page.html.trim(), markdown: '', format: 1 },
    sort: (index + 1) * 100000,
    ownership: { default: 0 },
    flags: {}
  };
}

function buildEntry() {
  return {
    _id: IDS.entry,
    name: 'Rules Reference',
    folder: null,
    categories: [],
    pages: PAGES.map(buildPageDoc),
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: {
      coreVersion: '13.341',
      systemId: 'dungeon-crawler-world',
      systemVersion: null,
      createdTime: 0,
      modifiedTime: 0,
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null,
      exportSource: null
    }
  };
}

function generate() {
  fs.mkdirSync(outDir, { recursive: true });
  const entry = buildEntry();
  const outPath = path.join(outDir, `${entry._id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(entry, null, 2) + '\n');
  console.log(`✓ Generated Rules Reference journal (${PAGES.length} pages) -> ${path.relative(process.cwd(), outPath)}`);
}

generate();
