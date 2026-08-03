/* ============================================================
   ENGINE.JS — Game Engine, Renderer, Camera, Input, Audio, Loop
   ============================================================ */

const Engine = (() => {

  let canvas, ctx;
  let currentZoneKey = 'greenfield';
  let currentWorldMap = null;
  let player = null;
  let camera = { x: 0, y: 0 };
  let keys = {};
  let lastTime = 0;
  let moveTimer = 0;

  // Audio synth (Web Audio API)
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
  }

  function playSound(type) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'levelUp') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261, now);
        osc.frequency.setValueAtTime(329, now + 0.1);
        osc.frequency.setValueAtTime(392, now + 0.2);
        osc.frequency.setValueAtTime(523, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
      }
    } catch {}
  }

  function init(className = 'warrior') {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Resize Canvas dynamically
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inputs
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      initAudio();
    });
    window.addEventListener('keyup', e => {
      keys[e.code] = false;
    });

    // Touch & Mouse Click movement
    canvas.addEventListener('click', handleCanvasClick);

    // Initialize player or load save
    const saved = Player.loadGame();
    if (saved) {
      player = saved;
      currentZoneKey = saved.currentZone || 'greenfield';
    } else {
      player = Player.createPlayer(className);
    }

    loadZone(currentZoneKey);
    UI.initChat();

    // Game Loop
    requestAnimationFrame(gameLoop);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function loadZone(zoneKey, spawnX = null, spawnY = null) {
    currentZoneKey = zoneKey;
    const zoneDef = World.ZONES[zoneKey];
    currentWorldMap = zoneDef.generate();

    player.tileX = spawnX !== null ? spawnX : currentWorldMap.spawnX;
    player.tileY = spawnY !== null ? spawnY : currentWorldMap.spawnY;
    player.x = player.tileX * World.TILE_SIZE;
    player.y = player.tileY * World.TILE_SIZE;

    player.zonesVisited.add(zoneKey);
    UI.addChatMessage('System', `Kamu telah memasuki zona: ${zoneDef.name}`, '#f59e0b');
  }

  function handleInput(dt) {
    if (Combat.isInBattle()) return;

    moveTimer += dt;
    if (moveTimer < 0.15) return; // Movement speed throttle

    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) { dy = -1; player.direction = 'up'; }
    else if (keys['KeyS'] || keys['ArrowDown']) { dy = 1; player.direction = 'down'; }
    else if (keys['KeyA'] || keys['ArrowLeft']) { dx = -1; player.direction = 'left'; }
    else if (keys['KeyD'] || keys['ArrowRight']) { dx = 1; player.direction = 'right'; }

    if (dx !== 0 || dy !== 0) {
      const nextX = player.tileX + dx;
      const nextY = player.tileY + dy;

      if (!World.isSolid(currentWorldMap, nextX, nextY)) {
        player.tileX = nextX;
        player.tileY = nextY;
        player.x = nextX * World.TILE_SIZE;
        player.y = nextY * World.TILE_SIZE;
        player.moveFrame = (player.moveFrame + 1) % 2;
        moveTimer = 0;

        // Check Portal trigger
        const portal = World.getPortal(currentWorldMap, nextX, nextY);
        if (portal) {
          loadZone(portal.target, portal.spawnX, portal.spawnY);
          return;
        }

        // Check NPC trigger
        const npc = World.getNPC(currentWorldMap, nextX, nextY);
        if (npc) {
          handleNPCTrigger(npc);
          return;
        }

        // Check Chest trigger
        const obj = World.getObject(currentWorldMap, nextX, nextY);
        if (obj === World.OBJ.CHEST) {
          currentWorldMap.objects[nextY][nextX] = World.OBJ.NONE;
          const loot = InventorySystem.rollChestLoot(World.ZONES[currentZoneKey].baseLevel);
          player.gold += loot.gold;
          Player.addItem(player, loot.item);
          player.chestsOpened++;
          UI.addChatMessage('System', `🎁 Membuka Peti Harta! Mendapatkan +${loot.gold} Gold & ${loot.item.name}!`, '#ffd700');
          playSound('levelUp');
          return;
        }

        // Random Monster Encounter
        const zDef = World.ZONES[currentZoneKey];
        if (Math.random() < zDef.monsterDensity) {
          const mType = zDef.monsterTypes[Math.floor(Math.random() * zDef.monsterTypes.length)];
          const monster = Monsters.createMonster(mType, zDef.baseLevel);
          if (monster) {
            triggerBattle(monster);
          }
        }
      }
    }
  }

  function handleCanvasClick(e) {
    if (Combat.isInBattle()) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left + camera.x;
    const clickY = e.clientY - rect.top + camera.y;

    const tileX = Math.floor(clickX / World.TILE_SIZE);
    const tileY = Math.floor(clickY / World.TILE_SIZE);

    // Simple path step towards click
    const dx = Math.sign(tileX - player.tileX);
    const dy = Math.sign(tileY - player.tileY);

    if ((dx !== 0 || dy !== 0) && !World.isSolid(currentWorldMap, player.tileX + dx, player.tileY + dy)) {
      player.tileX += dx;
      player.tileY += dy;
      player.x = player.tileX * World.TILE_SIZE;
      player.y = player.tileY * World.TILE_SIZE;
    }
  }

  function handleNPCTrigger(npc) {
    if (npc.type === 'healer') {
      Player.fullHeal(player);
      UI.addChatMessage(npc.name, 'Luka-lukamu telah disembuhkan sepenuhnya oleh kekuatan suci!', '#40aa40');
      playSound('heal');
    } else if (npc.type === 'shop') {
      window.openShopModal();
    } else if (npc.type === 'quest') {
      window.openQuestModal();
    }
  }

  function triggerBattle(monster) {
    UI.addChatMessage('System', `⚔️ Bertemu monster: ${monster.name}!`, '#ef4444');
    window.openBattleModal(monster);
  }

  function updateCamera() {
    camera.x = player.x - canvas.width / 2 + World.TILE_SIZE / 2;
    camera.y = player.y - canvas.height / 2 + World.TILE_SIZE / 2;

    camera.x = Math.max(0, Math.min(camera.x, currentWorldMap.width * World.TILE_SIZE - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, currentWorldMap.height * World.TILE_SIZE - canvas.height));
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    const startCol = Math.floor(camera.x / World.TILE_SIZE);
    const endCol = startCol + Math.ceil(canvas.width / World.TILE_SIZE) + 1;
    const startRow = Math.floor(camera.y / World.TILE_SIZE);
    const endRow = startRow + Math.ceil(canvas.height / World.TILE_SIZE) + 1;

    // Draw Map Tiles
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (r >= 0 && r < currentWorldMap.height && c >= 0 && c < currentWorldMap.width) {
          const tileType = currentWorldMap.tiles[r][c];
          const tileName = World.TILE_NAMES[tileType];
          const tileImg = Sprites.generateTile(tileName);
          ctx.drawImage(tileImg, c * World.TILE_SIZE, r * World.TILE_SIZE);

          // Draw Objects (Trees, Rocks, Chests)
          const objType = currentWorldMap.objects[r][c];
          if (objType !== World.OBJ.NONE) {
            const objName = World.OBJ_NAMES[objType];
            if (objName) {
              const objImg = Sprites.generateObject(objName);
              ctx.drawImage(objImg, c * World.TILE_SIZE, r * World.TILE_SIZE);
            }
          }
        }
      }
    }

    // Draw Player
    const playerSprite = Sprites.generateCharacter(player.className, player.direction, player.moveFrame);
    ctx.drawImage(playerSprite, player.x, player.y);

    // Draw Player Name Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, player.x + World.TILE_SIZE / 2, player.y - 6);

    // Draw Floating Damage Numbers
    UI.updateAndDrawFloating(ctx);

    ctx.restore();

    // Draw UI HUD & Minimap
    UI.updateHUD(player, World.ZONES[currentZoneKey].name);
    UI.renderMinimap(ctx, currentWorldMap, player.tileX, player.tileY);
  }

  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    handleInput(dt);
    updateCamera();
    render();

    requestAnimationFrame(gameLoop);
  }

  function getPlayer() { return player; }
  function getCurrentZone() { return currentZoneKey; }

  return { init, getPlayer, getCurrentZone, playSound, triggerBattle };
})();
