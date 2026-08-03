/* ============================================================
   COMBAT.JS — Battle System, Turn Management, Skills & Damage Calc
   ============================================================ */

const Combat = (() => {
  let inBattle = false;
  let battleState = null;

  function startBattle(player, monster, onEnd) {
    inBattle = true;
    const playerStats = Player.getTotalStats(player);

    battleState = {
      player,
      monster: { ...monster },
      playerStats,
      turn: playerStats.spd >= monster.spd ? 'player' : 'monster',
      round: 1,
      log: [],
      onEnd,
      playerBuffs: [],
      monsterBuffs: [],
      playerStatus: { stun: 0, dodge: 0, stealth: 0, shield: 0 },
      monsterStatus: { stun: 0, slow: 0, mark: null },
      animating: false
    };

    addLog(battleState, `⚔️ Pertarungan dimulai! ${player.name} vs ${monster.name} (Lv. ${monster.level})`);
    if (battleState.turn === 'monster') {
      addLog(battleState, `⚡ ${monster.name} menyerang lebih dulu karena lebih cepat!`);
    }

    return battleState;
  }

  function addLog(bs, msg) {
    bs.log.push(msg);
    if (bs.log.length > 20) bs.log.shift();
  }

  function calcDamage(atk, def, mult = 1.0, isMagic = false) {
    const rawDef = isMagic ? def * 0.5 : def;
    const dmg = (atk * mult) * (100 / (100 + rawDef));
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.round(dmg * variance));
  }

  function executePlayerTurn(action, skillId = null) {
    if (!battleState || battleState.turn !== 'player' || battleState.animating) return null;

    const bs = battleState;
    const p = bs.player;
    const m = bs.monster;
    const ps = bs.playerStats;

    let result = { type: action, damage: 0, isCrit: false, text: '', heal: 0, effect: 'slash' };

    // Apply player buffs ATK/DEF multipliers
    let currentAtk = ps.atk;
    let currentDef = ps.def;
    for (const b of bs.playerBuffs) {
      if (b.stat === 'atk') currentAtk *= (1 + b.mult);
      if (b.stat === 'def') currentDef *= (1 + b.mult);
    }

    if (action === 'attack') {
      let isCrit = Math.random() < ps.critRate;
      let dmg = calcDamage(currentAtk, m.def, 1.0);
      if (isCrit) dmg = Math.round(dmg * 1.8);
      if (bs.monsterStatus.mark) dmg = Math.round(dmg * (1 + bs.monsterStatus.mark.mult));

      m.hp = Math.max(0, m.hp - dmg);
      result.damage = dmg;
      result.isCrit = isCrit;
      result.effect = 'slash';
      result.text = `${p.name} menyerang ${m.name} sebesar ${dmg} damage!${isCrit ? ' 💥 CRITICAL!' : ''}`;
      addLog(bs, `⚔️ ${result.text}`);

    } else if (action === 'skill' && skillId) {
      const allSkills = Player.getAvailableSkills(p);
      const skill = allSkills.find(s => s.id === skillId);
      if (!skill) return null;

      if (p.mp < skill.mpCost) {
        addLog(bs, `❌ MP tidak cukup untuk ${skill.name}!`);
        return null;
      }
      if (p.skillCooldowns[skill.id] > 0) {
        addLog(bs, `⏳ ${skill.name} masih cooldown (${p.skillCooldowns[skill.id]} turn)!`);
        return null;
      }

      // Consume MP & set CD
      p.mp -= skill.mpCost;
      p.skillCooldowns[skill.id] = skill.cooldown;
      result.effect = skill.effect || 'slash';

      if (skill.type === 'heal') {
        const healAmt = Math.round(ps.maxHp * (skill.healPercent || 0.3));
        p.hp = Math.min(ps.maxHp, p.hp + healAmt);
        result.heal = healAmt;
        result.text = `${p.name} menggunakan ${skill.name} dan memulihkan ${healAmt} HP! 💚`;
        addLog(bs, `✨ ${result.text}`);

      } else if (skill.type === 'buff') {
        if (skill.buff) bs.playerBuffs.push({ ...skill.buff });
        if (skill.dodge) bs.playerStatus.dodge = skill.dodge;
        if (skill.stealth) bs.playerStatus.stealth = skill.stealth;
        result.text = `${p.name} menggunakan ${skill.name}! Stats meningkat! 🛡️`;
        addLog(bs, `🌀 ${result.text}`);

      } else if (skill.type === 'shield') {
        bs.playerStatus.shield = Math.round(ps.maxHp * skill.shieldPercent);
        result.text = `${p.name} menggunakan ${skill.name}! Perisai menyerap ${bs.playerStatus.shield} damage! 🛡️`;
        addLog(bs, `🛡️ ${result.text}`);

      } else {
        // Attack skill
        let isCrit = skill.guaranteedCrit || Math.random() < ps.critRate;
        let mult = skill.dmgMult || 1.0;

        // Execute threshold check
        if (skill.executeThreshold && (m.hp / m.maxHp) <= skill.executeThreshold) {
          mult *= 2.0;
        }

        let totalDmg = 0;
        const hits = skill.hits || 1;
        for (let i = 0; i < hits; i++) {
          let d = calcDamage(currentAtk, m.def, mult, skill.type === 'magic');
          if (isCrit) d = Math.round(d * 1.8);
          totalDmg += d;
        }

        if (skill.recoil) {
          const recoilDmg = Math.round(p.hp * skill.recoil);
          p.hp = Math.max(1, p.hp - recoilDmg);
          addLog(bs, `⚠️ ${p.name} menerima ${recoilDmg} recoil damage!`);
        }

        if (skill.stun) bs.monsterStatus.stun = skill.stun;
        if (skill.slow) bs.monsterStatus.slow = skill.slow;
        if (skill.poison) m.poison = { ...skill.poison };

        m.hp = Math.max(0, m.hp - totalDmg);
        result.damage = totalDmg;
        result.isCrit = isCrit;
        result.text = `${p.name} menggunakan ${skill.name}! (${hits > 1 ? hits + 'x hits' : ''} ${totalDmg} damage)${isCrit ? ' 💥 CRITICAL!' : ''}`;
        addLog(bs, `⚡ ${result.text}`);
      }

    } else if (action === 'item') {
      const res = Player.useItem(p, skillId);
      if (!res) return null;
      result.text = `${p.name} menggunakan item dan memulihkan HP/MP!`;
      addLog(bs, `🧪 ${result.text}`);

    } else if (action === 'flee') {
      if (m.isBoss) {
        addLog(bs, `🚫 Kamu tidak bisa kabur dari Boss!`);
        return null;
      }
      if (Math.random() < 0.6) {
        addLog(bs, `🏃 ${p.name} berhasil melarikan diri!`);
        endBattle('flee');
        return { type: 'flee', success: true };
      } else {
        addLog(bs, `❌ Gagal melarikan diri!`);
      }
    }

    // Check monster death
    if (m.hp <= 0) {
      addLog(bs, `🏆 ${m.name} berhasil dikalahkan!`);
      endBattle('win');
      return result;
    }

    // Pass turn to monster
    bs.turn = 'monster';
    return result;
  }

  function executeMonsterTurn() {
    if (!battleState || battleState.turn !== 'monster') return null;

    const bs = battleState;
    const p = bs.player;
    const m = bs.monster;
    const ps = bs.playerStats;

    // Check monster stun
    if (bs.monsterStatus.stun > 0) {
      bs.monsterStatus.stun--;
      addLog(bs, `💫 ${m.name} terganggu (Stunned) dan tidak bisa bergerak!`);
      bs.turn = 'player';
      endRound();
      return { type: 'stunned', text: `${m.name} ter-stun!` };
    }

    // Check player dodge / stealth
    if (bs.playerStatus.stealth > 0) {
      bs.playerStatus.stealth--;
      addLog(bs, `👤 ${m.name} tidak bisa melihat ${p.name} di dalam bayangan!`);
      bs.turn = 'player';
      endRound();
      return { type: 'miss', text: `${m.name} meleset!` };
    }

    if (bs.playerStatus.dodge > 0) {
      bs.playerStatus.dodge--;
      addLog(bs, `💨 ${p.name} berhasil menghindar (Dodge) dari serangan ${m.name}!`);
      bs.turn = 'player';
      endRound();
      return { type: 'dodge', text: `Dodge!` };
    }

    // Monster chooses AI skill
    const skill = Monsters.monsterChooseSkill(m);
    let result = { type: 'monster_attack', damage: 0, text: '', skillName: skill.name };

    let currentAtk = m.atk;
    for (const b of bs.monsterBuffs) {
      if (b.stat === 'atk') currentAtk *= (1 + b.mult);
    }

    let currentDef = ps.def;
    for (const b of bs.playerBuffs) {
      if (b.stat === 'def') currentDef *= (1 + b.mult);
    }

    if (skill.selfBuff) {
      bs.monsterBuffs.push({ ...skill.selfBuff });
      addLog(bs, `🔥 ${m.name} menggunakan ${skill.name}! ATK/DEF meningkat!`);
    } else if (skill.healPercent) {
      const healAmt = Math.round(m.maxHp * skill.healPercent);
      m.hp = Math.min(m.maxHp, m.hp + healAmt);
      addLog(bs, `💚 ${m.name} memulihkan ${healAmt} HP!`);
    } else {
      let dmg = calcDamage(currentAtk, currentDef, skill.dmgMult || 1.0);

      // Shield absorb
      if (bs.playerStatus.shield > 0) {
        if (bs.playerStatus.shield >= dmg) {
          bs.playerStatus.shield -= dmg;
          dmg = 0;
          addLog(bs, `🛡️ Perisai menyerap seluruh serangan ${m.name}!`);
        } else {
          dmg -= bs.playerStatus.shield;
          bs.playerStatus.shield = 0;
          addLog(bs, `🛡️ Perisai hancur! ${p.name} menerima ${dmg} damage.`);
        }
      }

      if (dmg > 0) {
        p.hp = Math.max(0, p.hp - dmg);
        result.damage = dmg;
        addLog(bs, `💥 ${m.name} menggunakan ${skill.name} menyerang ${p.name} sebesar ${dmg} damage!`);
      }
    }

    // Check player death
    if (p.hp <= 0) {
      addLog(bs, `💀 ${p.name} telah dikalahkan oleh ${m.name}...`);
      endBattle('lose');
      return result;
    }

    bs.turn = 'player';
    endRound();
    return result;
  }

  function endRound() {
    if (!battleState) return;
    const bs = battleState;

    // Reduce skill cooldowns
    for (const k in bs.player.skillCooldowns) {
      if (bs.player.skillCooldowns[k] > 0) {
        bs.player.skillCooldowns[k]--;
      }
    }

    // Tick buffs duration
    bs.playerBuffs = bs.playerBuffs.filter(b => { b.duration--; return b.duration > 0; });
    bs.monsterBuffs = bs.monsterBuffs.filter(b => { b.duration--; return b.duration > 0; });

    // Poison tick on monster
    if (bs.monster.poison && bs.monster.poison.duration > 0) {
      const pDmg = Math.round(bs.monster.maxHp * bs.monster.poison.dmg);
      bs.monster.hp = Math.max(0, bs.monster.hp - pDmg);
      addLog(bs, `☠️ ${bs.monster.name} menderita ${pDmg} poison damage!`);
      bs.monster.poison.duration--;
      if (bs.monster.hp <= 0) {
        endBattle('win');
      }
    }

    bs.round++;
  }

  function endBattle(result) {
    if (!battleState) return;
    const bs = battleState;

    let loot = null;
    if (result === 'win') {
      loot = Monsters.rollLoot(bs.monster);
      bs.player.gold += loot.gold;
      const leveledUp = Player.addExp(bs.player, loot.exp);

      bs.player.monstersKilled++;
      if (bs.monster.isBoss) bs.player.bossesKilled++;

      // Auto add dropped items to inventory
      for (const item of loot.items) {
        Player.addItem(bs.player, item);
      }

      loot.leveledUp = leveledUp;
    }

    inBattle = false;
    const callback = bs.onEnd;
    const finalState = { result, loot, monster: bs.monster, player: bs.player };
    battleState = null;

    if (callback) callback(finalState);
  }

  function getBattleState() { return battleState; }
  function isInBattle() { return inBattle; }

  return { startBattle, executePlayerTurn, executeMonsterTurn, getBattleState, isInBattle };
})();
