/* ============================================================
   INVENTORY.JS — Items, Equipment, Shop, Chest Loot Tables
   ============================================================ */

const InventorySystem = (() => {

  const ITEM_DATABASE = {
    // Potions
    potion_hp_s: { id: 'potion_hp_s', name: 'HP Potion (S)', type: 'potion', rarity: 'common', healHp: 50, buyPrice: 15, sellPrice: 5, desc: 'Restores 50 HP.' },
    potion_hp_m: { id: 'potion_hp_m', name: 'HP Potion (M)', type: 'potion', rarity: 'uncommon', healHp: 120, buyPrice: 40, sellPrice: 15, desc: 'Restores 120 HP.' },
    potion_hp_l: { id: 'potion_hp_l', name: 'HP Potion (L)', type: 'potion', rarity: 'rare', healHp: 300, buyPrice: 100, sellPrice: 40, desc: 'Restores 300 HP.' },
    potion_mp_s: { id: 'potion_mp_s', name: 'MP Potion (S)', type: 'potion', rarity: 'common', healMp: 30, buyPrice: 15, sellPrice: 5, desc: 'Restores 30 MP.' },
    potion_mp_m: { id: 'potion_mp_m', name: 'MP Potion (M)', type: 'potion', rarity: 'uncommon', healMp: 80, buyPrice: 40, sellPrice: 15, desc: 'Restores 80 MP.' },

    // Weapons
    iron_sword: { id: 'iron_sword', name: 'Iron Sword', type: 'sword', rarity: 'common', slot: 'weapon', stats: { atk: 8 }, buyPrice: 50, sellPrice: 20, desc: 'A basic iron sword.' },
    steel_sword: { id: 'steel_sword', name: 'Steel Greatsword', type: 'sword', rarity: 'uncommon', slot: 'weapon', stats: { atk: 16, def: 2 }, buyPrice: 150, sellPrice: 60, desc: 'Heavy steel sword.' },
    oak_staff: { id: 'oak_staff', name: 'Oak Staff', type: 'staff', rarity: 'common', slot: 'weapon', stats: { atk: 6, mp: 15 }, buyPrice: 50, sellPrice: 20, desc: 'A simple wooden staff.' },
    crystal_staff: { id: 'crystal_staff', name: 'Crystal Wand', type: 'staff', rarity: 'uncommon', slot: 'weapon', stats: { atk: 14, mp: 40 }, buyPrice: 160, sellPrice: 65, desc: 'Staff topped with a magic crystal.' },
    hunter_bow: { id: 'hunter_bow', name: 'Hunter Bow', type: 'bow', rarity: 'common', slot: 'weapon', stats: { atk: 7, spd: 2 }, buyPrice: 50, sellPrice: 20, desc: 'Flexible wooden bow.' },
    shadow_bow: { id: 'shadow_bow', name: 'Shadow Bow', type: 'bow', rarity: 'uncommon', slot: 'weapon', stats: { atk: 15, critRate: 0.05 }, buyPrice: 160, sellPrice: 65, desc: 'Bow crafted from dark wood.' },
    iron_dagger: { id: 'iron_dagger', name: 'Iron Dagger', type: 'dagger', rarity: 'common', slot: 'weapon', stats: { atk: 7, spd: 3 }, buyPrice: 45, sellPrice: 18, desc: 'Lightweight dagger.' },

    // Armor
    leather_armor: { id: 'leather_armor', name: 'Leather Vest', type: 'armor', rarity: 'common', slot: 'armor', stats: { def: 6, hp: 15 }, buyPrice: 40, sellPrice: 15, desc: 'Basic leather protection.' },
    chainmail: { id: 'chainmail', name: 'Iron Chainmail', type: 'armor', rarity: 'uncommon', slot: 'armor', stats: { def: 12, hp: 35 }, buyPrice: 120, sellPrice: 45, desc: 'Sturdy interlocking iron rings.' },
    plate_armor: { id: 'plate_armor', name: 'Knight Plate', type: 'armor', rarity: 'rare', slot: 'armor', stats: { def: 22, hp: 80 }, buyPrice: 300, sellPrice: 120, desc: 'Heavy full-body armor.' },

    // Helmets
    leather_cap: { id: 'leather_cap', name: 'Leather Cap', type: 'helmet', rarity: 'common', slot: 'helmet', stats: { def: 3, hp: 10 }, buyPrice: 30, sellPrice: 10, desc: 'Simple cap.' },
    iron_helmet: { id: 'iron_helmet', name: 'Iron Helm', type: 'helmet', rarity: 'uncommon', slot: 'helmet', stats: { def: 7, hp: 25 }, buyPrice: 80, sellPrice: 30, desc: 'Protects the head well.' },

    // Shields & Accessories
    wooden_shield: { id: 'wooden_shield', name: 'Wooden Shield', type: 'shield', rarity: 'common', slot: 'armor', stats: { def: 5 }, buyPrice: 35, sellPrice: 12, desc: 'Basic shield.' },
    ring_hp: { id: 'ring_hp', name: 'Ring of Vitality', type: 'ring', rarity: 'uncommon', slot: 'accessory', stats: { hp: 40 }, buyPrice: 100, sellPrice: 40, desc: 'Boosts max HP.' },
    ring_atk: { id: 'ring_atk', name: 'Ring of Might', type: 'ring', rarity: 'rare', slot: 'accessory', stats: { atk: 6, critRate: 0.03 }, buyPrice: 200, sellPrice: 80, desc: 'Boosts attack power.' }
  };

  const SHOP_ITEMS = [
    'potion_hp_s', 'potion_hp_m', 'potion_mp_s', 'potion_mp_m',
    'iron_sword', 'steel_sword', 'oak_staff', 'hunter_bow',
    'leather_armor', 'chainmail', 'leather_cap', 'iron_helmet', 'wooden_shield'
  ];

  function getShopCatalog() {
    return SHOP_ITEMS.map(id => ({ ...ITEM_DATABASE[id] }));
  }

  function rollChestLoot(zoneLevel = 1) {
    const gold = 20 + (Math.random() * 30 * zoneLevel | 0);

    const lootPool = [
      'potion_hp_s', 'potion_hp_m', 'potion_mp_s',
      'iron_sword', 'leather_armor', 'ring_hp', 'wooden_shield'
    ];

    if (zoneLevel >= 5) lootPool.push('steel_sword', 'chainmail', 'ring_atk', 'potion_hp_l');
    if (zoneLevel >= 10) lootPool.push('plate_armor', 'iron_helmet');

    const pickId = lootPool[Math.random() * lootPool.length | 0];
    const item = { ...ITEM_DATABASE[pickId] };

    return { gold, item };
  }

  return { ITEM_DATABASE, getShopCatalog, rollChestLoot };
})();
