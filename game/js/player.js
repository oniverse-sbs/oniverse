/* ============================================================
   PLAYER.JS — Player Class, Stats, Movement, Skills
   ============================================================ */

const Player = (() => {
  const CLASS_DATA = {
    warrior: {
      name: 'Warrior', icon: '⚔️',
      description: 'A powerful melee fighter with high HP and defense.',
      baseStats: { hp: 150, mp: 40, atk: 18, def: 14, spd: 8, critRate: 0.08 },
      growthStats: { hp: 18, mp: 4, atk: 3, def: 2.5, spd: 0.3, critRate: 0.003 },
      skills: [
        { id: 'slash', name: 'Power Slash', icon: '⚔️', desc: 'A mighty slash dealing 150% ATK damage.', mpCost: 8, cooldown: 2, dmgMult: 1.5, type: 'physical', effect: 'slash', unlockLevel: 1 },
        { id: 'shield_bash', name: 'Shield Bash', icon: '🛡️', desc: 'Bash enemy, dealing 120% ATK + stun 1 turn.', mpCost: 12, cooldown: 3, dmgMult: 1.2, type: 'physical', effect: 'slash', stun: 1, unlockLevel: 3 },
        { id: 'war_cry', name: 'War Cry', icon: '📯', desc: 'Boost ATK by 30% for 3 turns.', mpCost: 15, cooldown: 5, dmgMult: 0, type: 'buff', buff: { stat: 'atk', mult: 0.3, duration: 3 }, effect: 'heal', unlockLevel: 6 },
        { id: 'berserk', name: 'Berserk', icon: '🔥', desc: 'Deal 200% ATK but take 20% recoil.', mpCost: 20, cooldown: 4, dmgMult: 2.0, type: 'physical', recoil: 0.2, effect: 'fireball', unlockLevel: 10 },
        { id: 'iron_wall', name: 'Iron Wall', icon: '🏰', desc: 'Boost DEF by 50% for 3 turns.', mpCost: 18, cooldown: 5, dmgMult: 0, type: 'buff', buff: { stat: 'def', mult: 0.5, duration: 3 }, effect: 'heal', unlockLevel: 14 },
        { id: 'execute', name: 'Execute', icon: '💀', desc: 'Deal 300% ATK to enemies below 30% HP.', mpCost: 30, cooldown: 6, dmgMult: 3.0, type: 'physical', executeThreshold: 0.3, effect: 'slash', unlockLevel: 18 }
      ]
    },
    mage: {
      name: 'Mage', icon: '🔮',
      description: 'A master of arcane magic with devastating spells.',
      baseStats: { hp: 90, mp: 120, atk: 22, def: 6, spd: 10, critRate: 0.12 },
      growthStats: { hp: 10, mp: 12, atk: 4, def: 1, spd: 0.4, critRate: 0.005 },
      skills: [
        { id: 'fireball', name: 'Fireball', icon: '🔥', desc: 'Hurl a fireball dealing 160% ATK magic damage.', mpCost: 10, cooldown: 2, dmgMult: 1.6, type: 'magic', effect: 'fireball', unlockLevel: 1 },
        { id: 'ice_shard', name: 'Ice Shard', icon: '❄️', desc: 'Deal 130% ATK + slow enemy 1 turn.', mpCost: 12, cooldown: 2, dmgMult: 1.3, type: 'magic', slow: 1, effect: 'fireball', unlockLevel: 3 },
        { id: 'heal', name: 'Heal', icon: '💚', desc: 'Restore 40% of max HP.', mpCost: 20, cooldown: 4, dmgMult: 0, type: 'heal', healPercent: 0.4, effect: 'heal', unlockLevel: 5 },
        { id: 'thunder', name: 'Thunder', icon: '⚡', desc: 'Deal 200% ATK magic damage.', mpCost: 25, cooldown: 4, dmgMult: 2.0, type: 'magic', effect: 'fireball', unlockLevel: 10 },
        { id: 'barrier', name: 'Magic Barrier', icon: '🔵', desc: 'Shield absorbs 50% max HP damage.', mpCost: 25, cooldown: 6, dmgMult: 0, type: 'shield', shieldPercent: 0.5, effect: 'heal', unlockLevel: 14 },
        { id: 'meteor', name: 'Meteor Strike', icon: '☄️', desc: 'Deal 350% ATK to all enemies.', mpCost: 45, cooldown: 8, dmgMult: 3.5, type: 'magic', aoe: true, effect: 'fireball', unlockLevel: 18 }
      ]
    },
    archer: {
      name: 'Archer', icon: '🏹',
      description: 'A swift ranged fighter with high critical hit rate.',
      baseStats: { hp: 110, mp: 60, atk: 16, def: 8, spd: 14, critRate: 0.18 },
      growthStats: { hp: 12, mp: 6, atk: 3, def: 1.5, spd: 0.6, critRate: 0.008 },
      skills: [
        { id: 'double_shot', name: 'Double Shot', icon: '🏹', desc: 'Fire two arrows dealing 80% ATK each.', mpCost: 8, cooldown: 2, dmgMult: 0.8, hits: 2, type: 'physical', effect: 'arrow', unlockLevel: 1 },
        { id: 'poison_arrow', name: 'Poison Arrow', icon: '☠️', desc: 'Deal 100% ATK + poison 3 turns.', mpCost: 10, cooldown: 3, dmgMult: 1.0, type: 'physical', poison: { dmg: 0.05, duration: 3 }, effect: 'poison', unlockLevel: 4 },
        { id: 'evasion', name: 'Evasion', icon: '💨', desc: 'Dodge next 2 attacks.', mpCost: 15, cooldown: 5, dmgMult: 0, type: 'buff', dodge: 2, effect: 'heal', unlockLevel: 7 },
        { id: 'rain_arrows', name: 'Rain of Arrows', icon: '🌧️', desc: 'Deal 60% ATK x5 hits.', mpCost: 25, cooldown: 5, dmgMult: 0.6, hits: 5, type: 'physical', effect: 'arrow', unlockLevel: 11 },
        { id: 'snipe', name: 'Snipe', icon: '🎯', desc: '250% ATK, guaranteed critical hit.', mpCost: 20, cooldown: 4, dmgMult: 2.5, type: 'physical', guaranteedCrit: true, effect: 'arrow', unlockLevel: 15 },
        { id: 'barrage', name: 'Barrage', icon: '💥', desc: 'Deal 100% ATK x8 random hits.', mpCost: 40, cooldown: 7, dmgMult: 1.0, hits: 8, type: 'physical', effect: 'arrow', unlockLevel: 19 }
      ]
    },
    assassin: {
      name: 'Assassin', icon: '🗡️',
      description: 'A deadly shadow striker with burst damage.',
      baseStats: { hp: 100, mp: 70, atk: 20, def: 7, spd: 16, critRate: 0.22 },
      growthStats: { hp: 11, mp: 7, atk: 3.5, def: 1.2, spd: 0.7, critRate: 0.01 },
      skills: [
        { id: 'backstab', name: 'Backstab', icon: '🗡️', desc: 'Deal 180% ATK from the shadows.', mpCost: 10, cooldown: 2, dmgMult: 1.8, type: 'physical', effect: 'slash', unlockLevel: 1 },
        { id: 'smoke_bomb', name: 'Smoke Bomb', icon: '💨', desc: 'Become invisible for 2 turns (untargetable).', mpCost: 15, cooldown: 4, dmgMult: 0, type: 'buff', stealth: 2, effect: 'poison', unlockLevel: 4 },
        { id: 'venom_blade', name: 'Venom Blade', icon: '🐍', desc: 'Deal 140% ATK + poison 3 turns.', mpCost: 12, cooldown: 3, dmgMult: 1.4, type: 'physical', poison: { dmg: 0.06, duration: 3 }, effect: 'poison', unlockLevel: 7 },
        { id: 'shadow_step', name: 'Shadow Step', icon: '👤', desc: 'Teleport behind enemy, deal 200% ATK.', mpCost: 20, cooldown: 4, dmgMult: 2.0, type: 'physical', effect: 'slash', unlockLevel: 11 },
        { id: 'death_mark', name: 'Death Mark', icon: '💀', desc: 'Mark enemy: next 3 attacks deal 50% more.', mpCost: 18, cooldown: 5, dmgMult: 0, type: 'debuff', mark: { mult: 0.5, duration: 3 }, effect: 'poison', unlockLevel: 15 },
        { id: 'assassinate', name: 'Assassinate', icon: '☠️', desc: 'Deal 400% ATK. 2x vs marked enemies.', mpCost: 35, cooldown: 7, dmgMult: 4.0, type: 'physical', effect: 'slash', unlockLevel: 19 }
      ]
    }
  };

  // EXP curve
  function expForLevel(lv) {
    return Math.floor(50 * lv * lv + 30 * lv);
  }

  function createPlayer(className) {
    const cd = CLASS_DATA[className];
    const bs = cd.baseStats;
    return {
      className,
      name: cd.name,
      level: 1,
      exp: 0,
      expToNext: expForLevel(2),
      gold: 50,

      // Stats
      maxHp: bs.hp, hp: bs.hp,
      maxMp: bs.mp, mp: bs.mp,
      atk: bs.atk, def: bs.def, spd: bs.spd,
      critRate: bs.critRate,
      statPoints: 0,

      // Position
      x: 0, y: 0,
      tileX: 0, tileY: 0,
      direction: 'down',
      moving: false,
      moveFrame: 0,

      // Equipment slots
      equipment: {
        weapon: null,
        armor: null,
        helmet: null,
        accessory: null
      },

      // Inventory (max 20 slots)
      inventory: [
        { id: 'potion_hp_s', name: 'HP Potion (S)', type: 'potion', rarity: 'common', healHp: 50, qty: 5, desc: 'Restores 50 HP.' },
        { id: 'potion_mp_s', name: 'MP Potion (S)', type: 'potion', rarity: 'common', healMp: 30, qty: 3, desc: 'Restores 30 MP.' }
      ],

      // Skill cooldowns (runtime)
      skillCooldowns: {},

      // Buffs active
      buffs: [],

      // Combat state
      shield: 0,
      dodgeCharges: 0,
      stealthTurns: 0,

      // Quest tracking
      questProgress: {},
      completedQuests: [],

      // Stats tracking
      monstersKilled: 0,
      bossesKilled: 0,
      totalDamage: 0,
      chestsOpened: 0,
      zonesVisited: new Set(['greenfield'])
    };
  }

  function getAvailableSkills(player) {
    const cd = CLASS_DATA[player.className];
    return cd.skills.filter(s => player.level >= s.unlockLevel);
  }

  function getAllSkills(player) {
    return CLASS_DATA[player.className].skills;
  }

  function addExp(player, amount) {
    player.exp += amount;
    let leveledUp = false;
    while (player.exp >= player.expToNext) {
      player.exp -= player.expToNext;
      player.level++;
      player.expToNext = expForLevel(player.level + 1);
      leveledUp = true;

      // Apply growth stats
      const gs = CLASS_DATA[player.className].growthStats;
      player.maxHp += gs.hp | 0;
      player.maxMp += gs.mp | 0;
      player.atk += gs.atk;
      player.def += gs.def;
      player.spd += gs.spd;
      player.critRate = Math.min(0.8, player.critRate + gs.critRate);

      // Full heal on level up
      player.hp = player.maxHp;
      player.mp = player.maxMp;

      // Bonus stat points
      player.statPoints += 3;
    }
    return leveledUp;
  }

  function allocateStat(player, stat) {
    if (player.statPoints <= 0) return false;
    player.statPoints--;
    switch (stat) {
      case 'hp': player.maxHp += 10; player.hp = Math.min(player.hp + 10, player.maxHp); break;
      case 'mp': player.maxMp += 5; player.mp = Math.min(player.mp + 5, player.maxMp); break;
      case 'atk': player.atk += 2; break;
      case 'def': player.def += 2; break;
      case 'spd': player.spd += 1; break;
    }
    return true;
  }

  function getEquipBonuses(player) {
    let bonus = { atk: 0, def: 0, hp: 0, mp: 0, spd: 0, critRate: 0 };
    for (const slot in player.equipment) {
      const item = player.equipment[slot];
      if (item && item.stats) {
        for (const s in item.stats) {
          bonus[s] = (bonus[s] || 0) + item.stats[s];
        }
      }
    }
    return bonus;
  }

  function getTotalStats(player) {
    const eb = getEquipBonuses(player);
    return {
      atk: Math.round(player.atk + eb.atk),
      def: Math.round(player.def + eb.def),
      maxHp: Math.round(player.maxHp + (eb.hp || 0)),
      maxMp: Math.round(player.maxMp + (eb.mp || 0)),
      spd: Math.round(player.spd + (eb.spd || 0)),
      critRate: Math.min(0.8, player.critRate + (eb.critRate || 0))
    };
  }

  function heal(player, hpAmount, mpAmount = 0) {
    const ts = getTotalStats(player);
    player.hp = Math.min(ts.maxHp, player.hp + hpAmount);
    player.mp = Math.min(ts.maxMp, player.mp + mpAmount);
  }

  function fullHeal(player) {
    const ts = getTotalStats(player);
    player.hp = ts.maxHp;
    player.mp = ts.maxMp;
  }

  function useItem(player, itemIdx) {
    const item = player.inventory[itemIdx];
    if (!item) return null;

    if (item.healHp || item.healMp) {
      heal(player, item.healHp || 0, item.healMp || 0);
      item.qty--;
      if (item.qty <= 0) player.inventory.splice(itemIdx, 1);
      return { type: 'heal', hp: item.healHp || 0, mp: item.healMp || 0 };
    }
    return null;
  }

  function addItem(player, item) {
    // Stack if same id
    const existing = player.inventory.find(i => i.id === item.id && i.qty !== undefined);
    if (existing && item.qty) {
      existing.qty += item.qty || 1;
      return true;
    }
    if (player.inventory.length >= 20) return false;
    player.inventory.push({ ...item, qty: item.qty || 1 });
    return true;
  }

  function equipItem(player, itemIdx) {
    const item = player.inventory[itemIdx];
    if (!item || !item.slot) return false;

    const slot = item.slot;
    const current = player.equipment[slot];

    // Unequip current
    if (current) {
      if (player.inventory.length >= 20) return false;
      player.inventory.push(current);
    }

    player.equipment[slot] = item;
    player.inventory.splice(itemIdx, 1);
    return true;
  }

  function saveGame(player, currentZone) {
    const data = {
      ...player,
      zonesVisited: [...player.zonesVisited],
      currentZone,
      savedAt: Date.now()
    };
    localStorage.setItem('mmorpg_save', JSON.stringify(data));
  }

  function loadGame() {
    const raw = localStorage.getItem('mmorpg_save');
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      data.zonesVisited = new Set(data.zonesVisited || ['greenfield']);
      return data;
    } catch { return null; }
  }

  return {
    CLASS_DATA, createPlayer, getAvailableSkills, getAllSkills,
    addExp, allocateStat, getTotalStats, getEquipBonuses,
    heal, fullHeal, useItem, addItem, equipItem,
    expForLevel, saveGame, loadGame
  };
})();
