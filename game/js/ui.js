/* ============================================================
   UI.JS — HUD, Modals, Chat System, Damage Numbers, Skill Hotbar
   ============================================================ */

const UI = (() => {

  const floatingNumbers = [];
  const simulatedChat = [];

  function initChat() {
    const defaultMessages = [
      { sender: 'System', text: 'Selamat datang di OniVerse MMORPG!', color: '#aa60ff' },
      { sender: 'ShadowKnight', text: 'Ada yang mau party hunt Dragon King di Volcano?', color: '#60c0ff' },
      { sender: 'LunaMage', text: 'Shop NPC jual MP Potion diskon hari ini guys!', color: '#40aa40' },
      { sender: 'ViperX', text: 'Level 15 Assassin di sini, nyari guild aktif.', color: '#ff8800' }
    ];
    simulatedChat.push(...defaultMessages);
  }

  function addChatMessage(sender, text, color = '#fff') {
    simulatedChat.push({ sender, text, color });
    if (simulatedChat.length > 30) simulatedChat.shift();
    renderChat();
  }

  function renderChat() {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    box.innerHTML = simulatedChat.map(c => `
      <div class="chat-line">
        <strong style="color: ${c.color}">${c.sender}:</strong> <span>${c.text}</span>
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
  }

  function addFloatingNumber(x, y, text, color = '#ff3333', size = 20) {
    floatingNumbers.push({ x, y, text, color, size, alpha: 1.0, dy: -1 });
  }

  function updateAndDrawFloating(ctx) {
    for (let i = floatingNumbers.length - 1; i >= 0; i--) {
      const f = floatingNumbers[i];
      f.y += f.dy;
      f.alpha -= 0.02;

      if (f.alpha <= 0) {
        floatingNumbers.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.font = `bold ${f.size}px "Outfit", sans-serif`;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function updateHUD(player, zoneName) {
    const stats = Player.getTotalStats(player);

    // HP Bar
    const hpPct = Math.max(0, Math.min(100, (player.hp / stats.maxHp) * 100));
    const hpBar = document.getElementById('hud-hp-bar');
    if (hpBar) hpBar.style.width = `${hpPct}%`;
    const hpText = document.getElementById('hud-hp-text');
    if (hpText) hpText.textContent = `${player.hp} / ${stats.maxHp}`;

    // MP Bar
    const mpPct = Math.max(0, Math.min(100, (player.mp / stats.maxMp) * 100));
    const mpBar = document.getElementById('hud-mp-bar');
    if (mpBar) mpBar.style.width = `${mpPct}%`;
    const mpText = document.getElementById('hud-mp-text');
    if (mpText) mpText.textContent = `${player.mp} / ${stats.maxMp}`;

    // EXP Bar
    const expPct = Math.max(0, Math.min(100, (player.exp / player.expToNext) * 100));
    const expBar = document.getElementById('hud-exp-bar');
    if (expBar) expBar.style.width = `${expPct}%`;

    // Level & Class Name
    const lvlEl = document.getElementById('hud-level');
    if (lvlEl) lvlEl.textContent = `Lv. ${player.level}`;

    const nameEl = document.getElementById('hud-name');
    if (nameEl) nameEl.textContent = player.name;

    const goldEl = document.getElementById('hud-gold');
    if (goldEl) goldEl.textContent = `${player.gold} 💰`;

    const zoneEl = document.getElementById('hud-zone');
    if (zoneEl) zoneEl.textContent = zoneName;

    // Stat points alert
    const spBtn = document.getElementById('hud-stat-points');
    if (spBtn) {
      if (player.statPoints > 0) {
        spBtn.classList.remove('hidden');
        spBtn.textContent = `+${player.statPoints} Stat Points`;
      } else {
        spBtn.classList.add('hidden');
      }
    }

    renderHotbar(player);
  }

  function renderHotbar(player) {
    const bar = document.getElementById('hud-hotbar');
    if (!bar) return;

    const skills = Player.getAvailableSkills(player);
    bar.innerHTML = skills.map((s, idx) => {
      const cd = player.skillCooldowns[s.id] || 0;
      const mpReq = s.mpCost;
      const noMp = player.mp < mpReq;
      return `
        <div class="hotbar-slot ${cd > 0 ? 'on-cd' : ''} ${noMp ? 'no-mp' : ''}" data-skill-id="${s.id}">
          <span class="hotbar-key">${idx + 1}</span>
          <span class="hotbar-icon">${s.icon}</span>
          ${cd > 0 ? `<span class="hotbar-cd">${cd}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderMinimap(ctx, worldMap, playerX, playerY) {
    const mmSize = 120;
    const px = 10;
    const py = 10;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 25, 0.85)';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.fillRect(px, py, mmSize, mmSize);
    ctx.strokeRect(px, py, mmSize, mmSize);

    const scaleX = mmSize / worldMap.width;
    const scaleY = mmSize / worldMap.height;

    // Draw tiles
    for (let y = 0; y < worldMap.height; y += 2) {
      for (let x = 0; x < worldMap.width; x += 2) {
        const t = worldMap.tiles[y][x];
        if (t === World.T.WATER) ctx.fillStyle = '#2050aa';
        else if (t === World.T.LAVA) ctx.fillStyle = '#cc3300';
        else if (t === World.T.WALL) ctx.fillStyle = '#4a4a5a';
        else ctx.fillStyle = '#2a5a2a';
        ctx.fillRect(px + x * scaleX, py + y * scaleY, 2, 2);
      }
    }

    // Draw Player dot
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(px + playerX * scaleX, py + playerY * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw Portals
    ctx.fillStyle = '#aa44ff';
    for (const port of worldMap.portals) {
      ctx.fillRect(px + port.x * scaleX - 2, py + port.y * scaleY - 2, 4, 4);
    }

    ctx.restore();
  }

  return { initChat, addChatMessage, addFloatingNumber, updateAndDrawFloating, updateHUD, renderMinimap };
})();
