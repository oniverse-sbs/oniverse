/* ============================================================
   MONSTERS.JS — Monster Definitions, AI, Loot Tables
   ============================================================ */

const Monsters = (() => {

  const MONSTER_DB = {
    slime: {
      name: 'Slime', type: 'slime', icon: '🟢',
      baseHp: 40, baseAtk: 6, baseDef: 2, baseSpd: 3,
      expReward: 15, goldReward: [5, 12],
      skills: ['tackle'],
      loot: [
        { chance: 0.4, item: { id: 'slime_jelly', name: 'Slime Jelly', type: 'material', rarity: 'common', qty: 1, desc: 'Gooey substance.', sellPrice: 3 }},
        { chance: 0.1, item: { id: 'potion_hp_s', name: 'HP Potion (S)', type: 'potion', rarity: 'common', healHp: 50, qty: 1, desc: 'Restores 50 HP.' }}
      ]
    },
    bat: {
      name: 'Bat', type: 'bat', icon: '🦇',
      baseHp: 30, baseAtk: 8, baseDef: 1, baseSpd: 12,
      expReward: 12, goldReward: [3, 8],
      skills: ['bite'],
      loot: [
        { chance: 0.3, item: { id: 'bat_wing', name: 'Bat Wing', type: 'material', rarity: 'common', qty: 1, desc: 'A leathery wing.', sellPrice: 4 }}
      ]
    },
    goblin: {
      name: 'Goblin', type: 'goblin', icon: '👺',
      baseHp: 65, baseAtk: 12, baseDef: 5, baseSpd: 8,
      expReward: 30, goldReward: [10, 25],
      skills: ['slash', 'steal'],
      loot: [
        { chance: 0.3, item: { id: 'goblin_dagger', name: 'Goblin Dagger', type: 'dagger', rarity: 'common', slot: 'weapon', stats: { atk: 5 }, desc: 'A crude but sharp dagger.' }},
        { chance: 0.2, item: { id: 'potion_hp_s', name: 'HP Potion (S)', type: 'potion', rarity: 'common', healHp: 50, qty: 1, desc: 'Restores 50 HP.' }}
      ]
    },
    wolf: {
      name: 'Shadow Wolf', type: 'wolf', icon: '🐺',
      baseHp: 80, baseAtk: 15, baseDef: 6, baseSpd: 14,
      expReward: 35, goldReward: [12, 20],
      skills: ['bite', 'howl'],
      loot: [
        { chance: 0.25, item: { id: 'wolf_pelt', name: 'Wolf Pelt', type: 'material', rarity: 'uncommon', qty: 1, desc: 'Thick dark fur.', sellPrice: 12 }},
        { chance: 0.08, item: { id: 'wolf_fang_ring', name: 'Wolf Fang Ring', type: 'ring', rarity: 'uncommon', slot: 'accessory', stats: { atk: 3, spd: 2 }, desc: 'Ring made from wolf fangs.' }}
      ]
    },
    spider: {
      name: 'Giant Spider', type: 'spider', icon: '🕷️',
      baseHp: 55, baseAtk: 11, baseDef: 4, baseSpd: 10,
      expReward: 25, goldReward: [8, 18],
      skills: ['bite', 'web'],
      loot: [
        { chance: 0.3, item: { id: 'spider_silk', name: 'Spider Silk', type: 'material', rarity: 'common', qty: 1, desc: 'Strong silk thread.', sellPrice: 8 }}
      ]
    },
    skeleton: {
      name: 'Skeleton', type: 'skeleton', icon: '💀',
      baseHp: 90, baseAtk: 16, baseDef: 8, baseSpd: 7,
      expReward: 45, goldReward: [15, 30],
      skills: ['slash', 'bone_throw'],
      loot: [
        { chance: 0.2, item: { id: 'bone_sword', name: 'Bone Sword', type: 'sword', rarity: 'uncommon', slot: 'weapon', stats: { atk: 10, def: 2 }, desc: 'Sword carved from bone.' }},
        { chance: 0.15, item: { id: 'bone_shield', name: 'Bone Shield', type: 'shield', rarity: 'uncommon', slot: 'armor', stats: { def: 8 }, desc: 'Shield of fused bones.' }}
      ]
    },
    ghost: {
      name: 'Ghost', type: 'ghost', icon: '👻',
      baseHp: 70, baseAtk: 20, baseDef: 3, baseSpd: 15,
      expReward: 50, goldReward: [20, 35],
      skills: ['curse', 'phase'],
      loot: [
        { chance: 0.2, item: { id: 'ectoplasm', name: 'Ectoplasm', type: 'material', rarity: 'rare', qty: 1, desc: 'Ghostly residue.', sellPrice: 25 }},
        { chance: 0.08, item: { id: 'ghost_cloak', name: 'Ghost Cloak', type: 'armor', rarity: 'rare', slot: 'armor', stats: { def: 5, spd: 8 }, desc: 'Translucent cloak.' }}
      ]
    },
    golem: {
      name: 'Sand Golem', type: 'golem', icon: '🗿',
      baseHp: 150, baseAtk: 18, baseDef: 20, baseSpd: 3,
      expReward: 60, goldReward: [25, 40],
      skills: ['smash', 'harden'],
      loot: [
        { chance: 0.2, item: { id: 'golem_core', name: 'Golem Core', type: 'material', rarity: 'rare', qty: 1, desc: 'Pulsating crystal core.', sellPrice: 35 }},
        { chance: 0.1, item: { id: 'stone_armor', name: 'Stone Armor', type: 'armor', rarity: 'rare', slot: 'armor', stats: { def: 15, spd: -3 }, desc: 'Extremely heavy armor.' }}
      ]
    },
    witch: {
      name: 'Desert Witch', type: 'witch', icon: '🧙‍♀️',
      baseHp: 85, baseAtk: 24, baseDef: 6, baseSpd: 11,
      expReward: 55, goldReward: [20, 35],
      skills: ['fireball', 'curse', 'heal_self'],
      loot: [
        { chance: 0.15, item: { id: 'magic_staff', name: 'Witch Staff', type: 'staff', rarity: 'rare', slot: 'weapon', stats: { atk: 14, mp: 20 }, desc: 'Staff crackling with dark energy.' }},
        { chance: 0.2, item: { id: 'potion_mp_m', name: 'MP Potion (M)', type: 'potion', rarity: 'uncommon', healMp: 80, qty: 1, desc: 'Restores 80 MP.' }}
      ]
    },
    demon: {
      name: 'Demon', type: 'demon', icon: '😈',
      baseHp: 200, baseAtk: 28, baseDef: 15, baseSpd: 12,
      expReward: 100, goldReward: [40, 80],
      skills: ['dark_slash', 'hellfire', 'drain'],
      loot: [
        { chance: 0.15, item: { id: 'demon_blade', name: 'Demon Blade', type: 'sword', rarity: 'epic', slot: 'weapon', stats: { atk: 22, critRate: 0.05 }, desc: 'Blade forged in hellfire.' }},
        { chance: 0.1, item: { id: 'demon_armor', name: 'Demon Armor', type: 'armor', rarity: 'epic', slot: 'armor', stats: { def: 18, hp: 50 }, desc: 'Armor infused with demonic power.' }}
      ]
    },
    phoenix: {
      name: 'Phoenix', type: 'phoenix', icon: '🔥',
      baseHp: 180, baseAtk: 30, baseDef: 12, baseSpd: 18,
      expReward: 120, goldReward: [50, 100],
      skills: ['flame_wing', 'rebirth', 'inferno'],
      isBoss: false,
      loot: [
        { chance: 0.2, item: { id: 'phoenix_feather', name: 'Phoenix Feather', type: 'material', rarity: 'epic', qty: 1, desc: 'A feather that burns eternally.', sellPrice: 80 }},
        { chance: 0.08, item: { id: 'phoenix_bow', name: 'Phoenix Bow', type: 'bow', rarity: 'epic', slot: 'weapon', stats: { atk: 20, spd: 5 }, desc: 'Bow wreathed in flames.' }}
      ]
    },
    minotaur: {
      name: 'Minotaur', type: 'minotaur', icon: '🐂',
      baseHp: 250, baseAtk: 25, baseDef: 18, baseSpd: 6,
      expReward: 80, goldReward: [35, 60],
      skills: ['charge', 'smash', 'rage'],
      loot: [
        { chance: 0.15, item: { id: 'minotaur_axe', name: 'Minotaur Axe', type: 'sword', rarity: 'rare', slot: 'weapon', stats: { atk: 18, def: 5 }, desc: 'A massive double-headed axe.' }}
      ]
    },
    treant: {
      name: 'Ancient Treant', type: 'treant', icon: '🌳',
      baseHp: 300, baseAtk: 20, baseDef: 22, baseSpd: 2,
      expReward: 70, goldReward: [30, 50],
      skills: ['root', 'heal_self', 'smash'],
      loot: [
        { chance: 0.2, item: { id: 'ancient_wood', name: 'Ancient Wood', type: 'material', rarity: 'rare', qty: 1, desc: 'Wood from an ancient tree.', sellPrice: 30 }}
      ]
    },
    dragon: {
      name: '🐉 Dragon King', type: 'dragon', icon: '🐉',
      baseHp: 500, baseAtk: 40, baseDef: 25, baseSpd: 15,
      expReward: 500, goldReward: [200, 500],
      isBoss: true,
      skills: ['dragon_breath', 'tail_swipe', 'inferno', 'rage'],
      loot: [
        { chance: 0.5, item: { id: 'dragon_scale', name: 'Dragon Scale', type: 'material', rarity: 'legendary', qty: 1, desc: 'An indestructible scale.', sellPrice: 200 }},
        { chance: 0.3, item: { id: 'dragonslayer', name: 'Dragonslayer', type: 'sword', rarity: 'legendary', slot: 'weapon', stats: { atk: 35, critRate: 0.1, spd: 3 }, desc: 'The legendary blade of dragon hunters.' }},
        { chance: 0.2, item: { id: 'dragon_armor', name: 'Dragon Armor', type: 'armor', rarity: 'legendary', slot: 'armor', stats: { def: 30, hp: 100, spd: 2 }, desc: 'Armor forged from dragon scales.' }}
      ]
    }
  };

  // Monster AI skills
  const AI_SKILLS = {
    tackle: { name: 'Tackle', dmgMult: 1.0 },
    bite: { name: 'Bite', dmgMult: 1.2 },
    slash: { name: 'Slash', dmgMult: 1.3 },
    steal: { name: 'Steal', dmgMult: 0.5, stealGold: true },
    howl: { name: 'Howl', dmgMult: 0, selfBuff: { stat: 'atk', mult: 0.3, duration: 2 } },
    web: { name: 'Web', dmgMult: 0.3, slow: 2 },
    bone_throw: { name: 'Bone Throw', dmgMult: 1.1 },
    curse: { name: 'Curse', dmgMult: 0.8, debuff: { stat: 'def', mult: -0.2, duration: 3 } },
    phase: { name: 'Phase', dmgMult: 0, selfDodge: 1 },
    smash: { name: 'Smash', dmgMult: 1.5 },
    harden: { name: 'Harden', dmgMult: 0, selfBuff: { stat: 'def', mult: 0.5, duration: 2 } },
    fireball: { name: 'Fireball', dmgMult: 1.6 },
    heal_self: { name: 'Heal', dmgMult: 0, healPercent: 0.15 },
    dark_slash: { name: 'Dark Slash', dmgMult: 1.4 },
    hellfire: { name: 'Hellfire', dmgMult: 1.8 },
    drain: { name: 'Life Drain', dmgMult: 1.0, lifesteal: 0.5 },
    flame_wing: { name: 'Flame Wing', dmgMult: 1.5 },
    rebirth: { name: 'Rebirth', dmgMult: 0, healPercent: 0.3, once: true },
    inferno: { name: 'Inferno', dmgMult: 2.0 },
    charge: { name: 'Charge', dmgMult: 1.8 },
    rage: { name: 'Rage', dmgMult: 0, selfBuff: { stat: 'atk', mult: 0.5, duration: 3 } },
    root: { name: 'Root', dmgMult: 0.5, stun: 1 },
    dragon_breath: { name: 'Dragon Breath', dmgMult: 2.5 },
    tail_swipe: { name: 'Tail Swipe', dmgMult: 1.5 }
  };

  function createMonster(type, zoneLevel = 1) {
    const md = MONSTER_DB[type];
    if (!md) return null;

    const levelScale = 1 + (zoneLevel - 1) * 0.15;
    return {
      type: md.type,
      name: md.name,
      icon: md.icon,
      isBoss: md.isBoss || false,
      level: zoneLevel + (Math.random() * 3 | 0),
      maxHp: Math.round(md.baseHp * levelScale),
      hp: Math.round(md.baseHp * levelScale),
      atk: Math.round(md.baseAtk * levelScale),
      def: Math.round(md.baseDef * levelScale),
      spd: md.baseSpd,
      skills: md.skills,
      expReward: Math.round(md.expReward * levelScale),
      goldReward: [
        Math.round(md.goldReward[0] * levelScale),
        Math.round(md.goldReward[1] * levelScale)
      ],
      loot: md.loot,
      buffs: [],
      usedOnce: {}
    };
  }

  function monsterChooseSkill(monster) {
    const available = monster.skills.filter(s => {
      const skill = AI_SKILLS[s];
      if (skill && skill.once && monster.usedOnce[s]) return false;
      // Heal only when HP < 40%
      if (skill && skill.healPercent && monster.hp > monster.maxHp * 0.4) return false;
      return true;
    });
    if (!available.length) return AI_SKILLS.tackle;
    const pick = available[Math.random() * available.length | 0];
    const skill = AI_SKILLS[pick];
    if (skill && skill.once) monster.usedOnce[pick] = true;
    return { ...skill, id: pick };
  }

  function rollLoot(monster) {
    const drops = [];
    if (!monster.loot) return drops;
    for (const l of monster.loot) {
      if (Math.random() < l.chance) {
        drops.push({ ...l.item });
      }
    }
    const gold = monster.goldReward[0] + Math.random() * (monster.goldReward[1] - monster.goldReward[0]) | 0;
    return { items: drops, gold, exp: monster.expReward };
  }

  return { MONSTER_DB, AI_SKILLS, createMonster, monsterChooseSkill, rollLoot };
})();
