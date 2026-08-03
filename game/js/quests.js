/* ============================================================
   QUESTS.JS — Quest System & NPC Dialogues
   ============================================================ */

const QuestSystem = (() => {

  const QUEST_DATABASE = [
    {
      id: 'q_slimes',
      title: '🌿 Slime Invasion',
      giver: 'Elder Kai',
      description: 'Defeat 5 Slimes in Greenfield Village to protect the villagers.',
      targetType: 'slime',
      targetCount: 5,
      rewardGold: 100,
      rewardExp: 80,
      rewardItem: { id: 'potion_hp_m', name: 'HP Potion (M)', type: 'potion', rarity: 'uncommon', healHp: 120, qty: 2, desc: 'Restores 120 HP.' }
    },
    {
      id: 'q_darkforest',
      title: '🐺 Wolves of the Dark Forest',
      giver: 'Elder Kai',
      description: 'Venture into the Dark Forest and hunt 4 Shadow Wolves.',
      targetType: 'wolf',
      targetCount: 4,
      rewardGold: 200,
      rewardExp: 180,
      rewardItem: { id: 'ring_atk', name: 'Ring of Might', type: 'ring', rarity: 'rare', slot: 'accessory', stats: { atk: 6, critRate: 0.03 }, desc: 'Boosts attack power.' }
    },
    {
      id: 'q_dungeon',
      title: '💀 Cleansing the Shadow Dungeon',
      giver: 'Desert Trader',
      description: 'Defeat 6 Skeletons inside the Shadow Dungeon.',
      targetType: 'skeleton',
      targetCount: 6,
      rewardGold: 350,
      rewardExp: 300,
      rewardItem: { id: 'plate_armor', name: 'Knight Plate', type: 'armor', rarity: 'rare', slot: 'armor', stats: { def: 22, hp: 80 }, desc: 'Heavy full-body armor.' }
    },
    {
      id: 'q_dragon',
      title: '🐉 Slay the Dragon King',
      giver: 'Priestess Lina',
      description: 'Travel to Volcanic Peak and slay the ancient Dragon King!',
      targetType: 'dragon',
      targetCount: 1,
      rewardGold: 1000,
      rewardExp: 1000,
      rewardItem: { id: 'dragonslayer', name: 'Dragonslayer', type: 'sword', rarity: 'legendary', slot: 'weapon', stats: { atk: 35, critRate: 0.1, spd: 3 }, desc: 'The legendary blade of dragon hunters.' }
    }
  ];

  function getActiveQuests(player) {
    return QUEST_DATABASE.filter(q => player.questProgress[q.id] && !player.completedQuests.includes(q.id));
  }

  function getAvailableQuests(player) {
    return QUEST_DATABASE.filter(q => !player.questProgress[q.id] && !player.completedQuests.includes(q.id));
  }

  function acceptQuest(player, questId) {
    const q = QUEST_DATABASE.find(item => item.id === questId);
    if (!q) return false;
    player.questProgress[questId] = 0;
    return true;
  }

  function updateQuestKill(player, monsterType) {
    let updated = false;
    for (const q of QUEST_DATABASE) {
      if (player.questProgress[q.id] !== undefined && !player.completedQuests.includes(q.id)) {
        if (q.targetType === monsterType && player.questProgress[q.id] < q.targetCount) {
          player.questProgress[q.id]++;
          updated = true;

          // Check completion
          if (player.questProgress[q.id] >= q.targetCount) {
            completeQuest(player, q.id);
          }
        }
      }
    }
    return updated;
  }

  function completeQuest(player, questId) {
    const q = QUEST_DATABASE.find(item => item.id === questId);
    if (!q) return;

    player.completedQuests.push(questId);
    player.gold += q.rewardGold;
    Player.addExp(player, q.rewardExp);

    if (q.rewardItem) {
      Player.addItem(player, { ...q.rewardItem });
    }
  }

  return { QUEST_DATABASE, getActiveQuests, getAvailableQuests, acceptQuest, updateQuestKill };
})();
