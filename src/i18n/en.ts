/**
 * English dictionary: the source of truth for every key.
 * `es.ts` must provide the same keys (enforced by the type system).
 *
 * Conventions: sentence case (components upper-case where the design needs it), `{name}` placeholders,
 * plurals as `<base>_one` / `<base>_other`, no emoji inside values (icons live in the JSX).
 */
export const en = {
  // ── common ────────────────────────────────────────────────────────────
  'common.back': 'Back',
  'common.close': 'Close',
  'common.skip': 'Skip',
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.gems_one': '{count} gem',
  'common.gems_other': '{count} gems',

  // ── cover ─────────────────────────────────────────────────────────────
  'cover.tagline': 'Descend. Deduce. Slay the Wumpus.',
  'cover.play': 'Start expedition',
  'cover.daily': 'Daily challenge',
  'cover.rankings': 'Leaderboard',
  'cover.manual': 'How to play',
  'cover.settings': 'Settings',
  'cover.version': 'v{version}',

  // ── hero select ───────────────────────────────────────────────────────
  'heroes.title': 'Choose your hero',
  'heroes.select': 'Select',
  'heroes.locked': 'Locked',
  'heroes.unlockFloor': 'Reach floor {floor}',
  'heroes.unlockVictory': 'Win an expedition',
  'hero.0.name': 'Cyan Explorer',
  'hero.1.name': 'Scarlet Knight',
  'hero.2.name': 'Moss Golem',
  'hero.3.name': 'Golden Rogue',
  'hero.0.perk': 'Trapfinder',
  'hero.1.perk': 'Piercing arrows',
  'hero.2.perk': 'Stoneskin',
  'hero.3.perk': 'Treasure hunter',
  'hero.0.desc': 'Traps never hurt. +1 arrow every floor.',
  'hero.1.desc': 'Arrows fly 2 tiles.',
  'hero.2.desc': 'Starts every floor with a shield.',
  'hero.3.desc': 'Gems are worth +30%. Exploring pays double.',

  // ── relics ────────────────────────────────────────────────────────────
  'relic.quiver.name': 'Bottomless quiver',
  'relic.quiver.desc': '+2 arrows now and +1 arrow at the start of every floor.',
  'relic.lucky_coin.name': 'Lucky coin',
  'relic.lucky_coin.desc': 'Gems are worth 25% more.',
  'relic.iron_boots.name': 'Iron boots',
  'relic.iron_boots.desc': 'Walking no longer costs points.',
  'relic.lantern.name': 'Old lantern',
  'relic.lantern.desc': 'Every floor starts with the area around you already explored.',
  'relic.phoenix.name': 'Phoenix feather',
  'relic.phoenix.desc': 'Survives one deadly touch, then crumbles.',
  'relic.hunter.name': "Hunter's mark",
  'relic.hunter.desc': 'Kill combos can climb one step higher.',
  'relic.long_bow.name': 'Long bow',
  'relic.long_bow.desc': 'Arrows fly one tile farther.',
  'relic.bulwark.name': 'Bulwark',
  'relic.bulwark.desc': 'Start every floor with a shield.',
  'relic.greed.name': 'Dragon hoard',
  'relic.greed.desc': 'Clearing a floor pays 50% more.',
  'relic.frost.name': 'Frost charm',
  'relic.frost.desc': 'The Wumpus acts more slowly.',
  'relic.trap_sense.name': 'Trap sense',
  'relic.trap_sense.desc': 'Traps are disarmed without penalty.',
  'relic.kicker': 'Floor {floor} cleared',
  'relic.title': 'Choose a relic',
  'relic.hint': 'Relics last for the whole expedition',

  // ── settings ──────────────────────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.sound': 'Sound',
  'settings.haptics': 'Vibration',
  'settings.reduceFlash': 'Reduce flashes',
  'settings.reduceFlashHint': 'Softens the screen flashes on kills and teleports.',
  'settings.controls': 'Control position',
  'settings.left': 'Left',
  'settings.right': 'Right',
  'settings.language': 'Language',
  'settings.languageAuto': 'Automatic',
  'settings.languageEn': 'English',
  'settings.languageEs': 'Español',
  'settings.autosave': 'Settings are saved automatically.',

  // ── leaderboard ───────────────────────────────────────────────────────
  'scores.title': 'Leaderboard',
  'scores.col.rank': 'Rank',
  'scores.col.hero': 'Hero',
  'scores.col.name': 'Name',
  'scores.col.floor': 'Floor',
  'scores.col.score': 'Score',
  'scores.col.gems': 'Gems',
  'scores.col.time': 'Time',
  'scores.floorShort': 'F{n}',
  'scores.noTime': 'N/A',
  'scores.loading': 'Loading scores…',
  'scores.empty': 'No scores yet. Be the first!',
  'scores.error': "Couldn't load the leaderboard. Check your connection.",

  // ── level complete / game over / pause / entry ────────────────────────
  'complete.title': 'Floor cleared',
  'complete.floor': 'Floor {n}',
  'complete.skip': 'Tap anywhere to continue',
  'complete.score': 'Score',
  'complete.gems': 'Gems',
  'complete.kills': 'Kills',
  'complete.time': 'Time',
  'complete.next': 'Next floor',

  'over.victory': 'Expedition complete',
  'over.defeat': 'Game over',
  'over.daily': 'Daily {date}',
  'over.streak_one': '{count}-day streak',
  'over.streak_other': '{count}-day streak',
  'over.newDailyBest': 'New daily best!',
  'over.newBest': 'New personal best!',
  'over.bestToday': "Today's best {score}",
  'over.best': 'Best {score}',
  'over.unlocked_one': 'Unlocked: {names}',
  'over.unlocked_other': 'Unlocked: {names}',
  'over.floor': 'Floor',
  'over.score': 'Score',
  'over.gems': 'Gems',
  'over.time': 'Time',
  'over.retry': 'Retry',
  'over.menu': 'Menu',
  'over.share': 'Share result',
  'over.cause.enemy': 'Slain by a guardian',
  'over.cause.boss': 'Slain by the Wumpus',
  'over.cause.pit': 'Lost in a vortex',

  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.menu': 'Menu',

  'entry.badge': 'Top 10!',
  'entry.title': 'New high score',
  'entry.points': '{score} pts',
  'entry.subtitle': 'Floor {floor} · {gems} · {time}',
  'entry.placeholder': 'Enter your name…',
  'entry.errBlocked': "That name isn't allowed. Try another.",
  'entry.errEmpty': 'Enter a name.',
  'entry.errFailed': "Couldn't save your score. Check your connection.",
  'entry.save': 'Save score',
  'entry.saving': 'Saving…',

  'share.daily':
    'Wumpus Adventures · Daily {date}\nFloor {floor} · {score} pts · {gems}{streak}\nSame cave for everyone today. Can you beat me?',
  'share.streak_one': ' · {count}-day streak',
  'share.streak_other': ' · {count}-day streak',

  // ── HUD, errors, popups ───────────────────────────────────────────────
  'hud.time': 'Time',
  'hud.floor': 'Floor',
  'hud.level': 'Level',
  'hud.floorOf': '{level}/{floors}',
  'popup.shield': 'SHIELD',
  'error.title': 'Something went wrong',
  'error.body': 'The cave collapsed. Your best score is safe.',
  'error.retry': 'Try again',

  // ── accessibility labels ──────────────────────────────────────────────
  'a11y.moveUp': 'Move up',
  'a11y.moveDown': 'Move down',
  'a11y.moveLeft': 'Move left',
  'a11y.moveRight': 'Move right',
  'a11y.attack': 'Shoot an arrow',
  'a11y.pause': 'Pause',
  'a11y.back': 'Go back',
  'a11y.shieldActive': 'Shield active',
  'a11y.arrowsLeft': '{count} arrows left',
  'a11y.gemsLeft_one': '{count} gem left',
  'a11y.gemsLeft_other': '{count} gems left',
  'a11y.relics': 'Relics: {names}',

  // ── tutorial ──────────────────────────────────────────────────────────
  'tutorial.title': 'Training',
  'tutorial.step': 'Step {n} of {total}',
  'tutorial.walk': 'Use the arrow pad to walk right and grab the glowing gem.',
  'tutorial.clue':
    'A sound icon means a guardian is right next to this tile. You are facing it: never step onto it!',
  'tutorial.shoot': 'Tap the red attack button to shoot the guardian in front of you.',
  'tutorial.finish': 'Well done! Now grab the last gem. Hazards stay hidden, gems never do.',
  'tutorial.done':
    'Floor cleared! In a real expedition you pick a relic after each floor and face the Wumpus on floor {floors}.',
  'tutorial.retry': 'You walked into the guardian! Let’s try that again.',
  'tutorial.skip': 'Skip tutorial',
  'tutorial.play': 'Start playing',

  // ── manual ────────────────────────────────────────────────────────────
  'manual.title': 'How to play',
  'manual.replayTutorial': 'Replay the tutorial',

  'manual.mission.title': 'The mission',
  'manual.mission.goal.label': 'Goal',
  'manual.mission.goal.detail':
    'Collect every gem on a floor to reach the next, harder cave. A run is an expedition of {floors} floors.',
  'manual.mission.wumpus.label': 'The Wumpus',
  'manual.mission.wumpus.detail':
    'Floor {floors} is the Wumpus lair. It has {hearts} hearts and hunts you: every {moves} actions it steps closer, and when it is next to you it winds up (it glows) before it strikes. Shoot it {hearts} times to win. A shield or feather absorbs one hit.',
  'manual.mission.wumpus.badge': 'Floor {floors}',
  'manual.mission.relics.label': 'Relics',
  'manual.mission.relics.detail':
    'After each floor you choose 1 of 3 relics. They stack and last the whole expedition.',
  'manual.mission.relics.badge': 'Draft',
  'manual.mission.heroes.label': 'Heroes',
  'manual.mission.heroes.detail':
    'Every hero has a perk. Unlock the others by reaching deeper floors and by winning an expedition.',
  'manual.mission.survival.label': 'Survival',
  'manual.mission.survival.detail':
    'Guardians and the Wumpus are deadly to touch. Vortexes only teleport you. Read the clues before you step.',

  'manual.explore.title': 'Exploration',
  'manual.explore.hidden': 'Hidden',
  'manual.explore.revealed': 'Revealed',
  'manual.explore.tiles': 'Tiles start hidden. Step on one to reveal it.',
  'manual.explore.pace.label': 'Plan your path',
  'manual.explore.pace.detail':
    'Gems are always visible, hazards never are. Every step costs a point, so walk with purpose.',

  'manual.hazards.title': 'Reading the clues',
  'manual.hazards.guardian': 'Guardian',
  'manual.hazards.vortex': 'Vortex',
  'manual.hazards.clues.label': 'Clues',
  'manual.hazards.clues.detail':
    'A revealed tile shows a sound icon when a guardian is right next to it and an infinity icon for a vortex. A number appears when two or more of the same kind are adjacent.',
  'manual.hazards.vortexInfo.label': 'Vortex',
  'manual.hazards.vortexInfo.detail':
    'Stepping into a vortex does not kill you: it teleports you to a safe, preferably unexplored tile. Use it to skip dangerous ground, but it can drop you far from the gems.',
  'manual.hazards.vortexInfo.badge': 'Teleport',
  'manual.hazards.note': 'Clues count the hazards touching a tile, not which side they are on.',

  'manual.combat.title': 'Combat',
  'manual.combat.strike.label': 'Shooting',
  'manual.combat.strike.detail':
    'Press the attack button to shoot the tile in front of you. You face the way you last moved, and bumping a wall turns you. Arrows hit the first guardian in range.',
  'manual.combat.ammo.label': 'Arrows',
  'manual.combat.ammo.detail': 'Arrows are limited and refresh every floor. Missing costs points.',
  'manual.combat.ammo.badge': 'Limited',
  'manual.combat.combo.label': 'Combo',
  'manual.combat.combo.detail':
    'Kills in a row without moving or missing multiply the reward, up to x{combo}.',
  'manual.combat.combo.badge': 'x{combo}',

  'manual.powerups.title': 'Power-ups and traps',
  'manual.powerups.shield.label': 'Shield',
  'manual.powerups.shield.detail':
    'Absorbs one deadly touch and destroys the guardian. It stays until used, even between floors.',
  'manual.powerups.ammo.label': 'Arrows',
  'manual.powerups.ammo.detail': 'Arrow bundles on the board give you +{ammo} arrows.',
  'manual.powerups.traps.label': 'Traps',
  'manual.powerups.traps.detail':
    'From floor 3 some tiles hide a trap. It costs {trap} points but never kills, and gives no warning.',

  'manual.scoring.title': 'Score and ranking',
  'manual.scoring.points.label': 'Scoring',
  'manual.scoring.points.detail':
    'Gems, kills, clearing floors and exploring earn points. Steps and misses cost them.',
  'manual.scoring.board.label': 'Leaderboard',
  'manual.scoring.board.detail': 'The global top 10 ranks by score. Ties go to the faster run.',
  'manual.scoring.daily.label': 'Daily challenge',
  'manual.scoring.daily.detail':
    'One cave per day, identical for every player. Keep your streak by playing on consecutive days. Daily runs do not enter the global leaderboard.',
  'manual.scoring.daily.badge': 'Daily',
  'manual.scoring.pause.label': 'Pause',
  'manual.scoring.pause.detail':
    'Tap the pause button or press Back. The run also pauses when you leave the app.',

  'manual.tips.title': 'Pro tips',
  'manual.tips.vortex.title': 'Use the vortex',
  'manual.tips.vortex.body': 'Falling into a vortex is a safe escape when every direction looks risky.',
  'manual.tips.shield.title': 'Shield first',
  'manual.tips.shield.body':
    'Grab a shield before you probe around guardians: it turns a deadly mistake into a free kill.',
  'manual.tips.ammo.title': 'Save your arrows',
  'manual.tips.ammo.body': "Don't shoot what you can walk around. Keep arrows for tight corners and the Wumpus.",
  'manual.tips.route.title': 'Mind the way back',
  'manual.tips.route.body': 'Gems often sit in risky spots. Remember the safe tiles you used to get there.',
  'manual.tips.wumpus.title': 'Face the Wumpus',
  'manual.tips.wumpus.body':
    'You can only shoot where you face. Line up with it, shoot, and use its wind-up to finish it.',
} as const;

export type TranslationKey = keyof typeof en;
