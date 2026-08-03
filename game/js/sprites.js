/* ============================================================
   SPRITES.JS — Procedural Pixel Art Generator
   All game art is generated via Canvas — no external images needed
   ============================================================ */

const Sprites = (() => {
  const cache = {};

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function drawPixelData(ctx, data, size, ox = 0, oy = 0) {
    for (let y = 0; y < data.length; y++) {
      for (let x = 0; x < data[y].length; x++) {
        if (data[y][x]) {
          ctx.fillStyle = data[y][x];
          ctx.fillRect(ox + x * size, oy + y * size, size, size);
        }
      }
    }
  }

  // --- CHARACTER SPRITES (16x16 base, scaled) ---
  const CLASS_PALETTES = {
    warrior: { body: '#4a6741', armor: '#8b8b8b', skin: '#f0c89a', hair: '#5c3a1e', accent: '#c0a030', weapon: '#a0a0a0' },
    mage: { body: '#3a3a7a', armor: '#6a4aaa', skin: '#f0c89a', hair: '#e0e0ff', accent: '#aa60ff', weapon: '#60c0ff' },
    archer: { body: '#2a6a2a', armor: '#8b6b3a', skin: '#e8b888', hair: '#d4a050', accent: '#40aa40', weapon: '#6a4a2a' },
    assassin: { body: '#2a2a3a', armor: '#3a3a4a', skin: '#d8c8a8', hair: '#1a1a2a', accent: '#ff3050', weapon: '#606070' }
  };

  function generateCharacter(className, direction = 'down', frame = 0) {
    const key = `char_${className}_${direction}_${frame}`;
    if (cache[key]) return cache[key];

    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');
    const p = CLASS_PALETTES[className] || CLASS_PALETTES.warrior;
    const px = 2;

    // Base character body
    const bodyData = {
      down: [
        [0,0,0,0,0,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,0,0,0,0,0],
        [0,0,0,0,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,0,0,0,0],
        [0,0,0,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,p.hair,0,0,0],
        [0,0,0,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,0,0,0],
        [0,0,p.skin,p.skin,'#1a1a1a',p.skin,p.skin,p.skin,p.skin,p.skin,'#1a1a1a',p.skin,p.skin,p.skin,0,0],
        [0,0,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,0,0],
        [0,0,0,p.skin,p.skin,p.skin,'#cc5555',p.skin,p.skin,'#cc5555',p.skin,p.skin,p.skin,0,0,0],
        [0,0,0,0,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,p.skin,0,0,0,0],
        [0,0,0,p.accent,p.armor,p.armor,p.armor,p.armor,p.armor,p.armor,p.armor,p.armor,p.accent,0,0,0],
        [0,0,p.accent,p.armor,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.armor,p.accent,0,0],
        [0,p.skin,p.armor,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.armor,p.skin,0],
        [0,p.skin,p.skin,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.skin,p.skin,0],
        [0,0,p.skin,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.skin,0,0],
        [0,0,0,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,p.body,0,0,0],
        [0,0,0,0,p.body,p.body,p.body,0,0,p.body,p.body,p.body,0,0,0,0],
        [0,0,0,0,'#3a2a1a','#3a2a1a','#3a2a1a',0,0,'#3a2a1a','#3a2a1a','#3a2a1a',0,0,0,0],
      ],
      up: null, left: null, right: null
    };

    // Walking animation offset
    const walkOffset = frame % 2 === 1 ? 1 : 0;

    const data = bodyData.down; // simplified — using front view for all
    drawPixelData(ctx, data, px, 0, walkOffset);

    // Draw weapon based on class
    if (className === 'warrior') {
      ctx.fillStyle = p.weapon;
      ctx.fillRect(26, 8, 4, 18);
      ctx.fillStyle = p.accent;
      ctx.fillRect(24, 6, 8, 4);
    } else if (className === 'mage') {
      ctx.fillStyle = '#6a3a1a';
      ctx.fillRect(27, 4, 3, 22);
      ctx.fillStyle = p.weapon;
      ctx.beginPath();
      ctx.arc(28, 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (className === 'archer') {
      ctx.fillStyle = p.weapon;
      ctx.fillRect(27, 6, 2, 20);
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(28, 6); ctx.quadraticCurveTo(32, 16, 28, 26);
      ctx.stroke();
    } else if (className === 'assassin') {
      ctx.fillStyle = p.weapon;
      ctx.fillRect(26, 14, 6, 2);
      ctx.fillRect(28, 10, 2, 8);
    }

    cache[key] = c;
    return c;
  }

  // --- MONSTER SPRITES ---
  const MONSTER_DATA = {
    slime: { color: '#40cc40', eyeColor: '#fff', size: 24 },
    goblin: { color: '#5a8a3a', eyeColor: '#ff0', size: 28 },
    skeleton: { color: '#e0e0d0', eyeColor: '#f00', size: 30 },
    wolf: { color: '#707070', eyeColor: '#ff0', size: 28 },
    orc: { color: '#4a7a3a', eyeColor: '#f80', size: 32 },
    dragon: { color: '#cc2020', eyeColor: '#ff0', size: 48 },
    demon: { color: '#6a1a3a', eyeColor: '#f00', size: 40 },
    golem: { color: '#8a7a6a', eyeColor: '#0af', size: 40 },
    ghost: { color: '#c0c0ff', eyeColor: '#60f', size: 30 },
    minotaur: { color: '#7a4a2a', eyeColor: '#f00', size: 38 },
    witch: { color: '#5a3a7a', eyeColor: '#0f0', size: 30 },
    treant: { color: '#3a6a2a', eyeColor: '#ff0', size: 44 },
    spider: { color: '#2a2a2a', eyeColor: '#f00', size: 26 },
    bat: { color: '#4a3a5a', eyeColor: '#f00', size: 22 },
    phoenix: { color: '#ff6a00', eyeColor: '#ff0', size: 42 }
  };

  function generateMonster(type) {
    const key = `monster_${type}`;
    if (cache[key]) return cache[key];

    const md = MONSTER_DATA[type] || MONSTER_DATA.slime;
    const s = md.size;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');

    if (type === 'slime') {
      // Slime body
      ctx.fillStyle = md.color;
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.6, s*0.4, s*0.35, 0, 0, Math.PI*2);
      ctx.fill();
      // Shiny
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(s*0.4, s*0.45, s*0.1, s*0.12, -0.3, 0, Math.PI*2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = md.eyeColor;
      ctx.fillRect(s*0.35, s*0.52, 3, 3);
      ctx.fillRect(s*0.55, s*0.52, 3, 3);
      ctx.fillStyle = '#000';
      ctx.fillRect(s*0.36, s*0.54, 2, 2);
      ctx.fillRect(s*0.56, s*0.54, 2, 2);
    } else if (type === 'dragon') {
      // Dragon body
      ctx.fillStyle = md.color;
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.55, s*0.35, s*0.3, 0, 0, Math.PI*2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.25, s*0.2, s*0.18, 0, 0, Math.PI*2);
      ctx.fill();
      // Wings
      ctx.fillStyle = '#aa1818';
      ctx.beginPath();
      ctx.moveTo(s*0.15, s*0.4);
      ctx.lineTo(0, s*0.15);
      ctx.lineTo(s*0.1, s*0.55);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s*0.85, s*0.4);
      ctx.lineTo(s, s*0.15);
      ctx.lineTo(s*0.9, s*0.55);
      ctx.fill();
      // Eyes
      ctx.fillStyle = md.eyeColor;
      ctx.fillRect(s*0.38, s*0.2, 4, 4);
      ctx.fillRect(s*0.56, s*0.2, 4, 4);
      // Fire breath
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.moveTo(s*0.45, s*0.35);
      ctx.lineTo(s*0.5, s*0.42);
      ctx.lineTo(s*0.55, s*0.35);
      ctx.fill();
    } else if (type === 'skeleton') {
      ctx.fillStyle = md.color;
      // Skull
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.2, s*0.22, s*0.18, 0, 0, Math.PI*2);
      ctx.fill();
      // Body
      ctx.fillRect(s*0.42, s*0.35, s*0.16, s*0.35);
      // Ribs
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(s*0.3, s*0.4 + i*6, s*0.4, 2);
      }
      // Arms
      ctx.fillRect(s*0.2, s*0.38, s*0.12, 3);
      ctx.fillRect(s*0.68, s*0.38, s*0.12, 3);
      // Legs
      ctx.fillRect(s*0.38, s*0.7, 4, s*0.25);
      ctx.fillRect(s*0.56, s*0.7, 4, s*0.25);
      // Eyes
      ctx.fillStyle = md.eyeColor;
      ctx.fillRect(s*0.38, s*0.15, 3, 4);
      ctx.fillRect(s*0.56, s*0.15, 3, 4);
    } else if (type === 'ghost') {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = md.color;
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.35, s*0.3, s*0.28, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillRect(s*0.2, s*0.35, s*0.6, s*0.35);
      // Wavy bottom
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(s*0.25 + i*(s*0.18), s*0.7, s*0.09, 0, Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = md.eyeColor;
      ctx.fillRect(s*0.35, s*0.3, 3, 5);
      ctx.fillRect(s*0.55, s*0.3, 3, 5);
    } else {
      // Generic monster
      ctx.fillStyle = md.color;
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.5, s*0.38, s*0.4, 0, 0, Math.PI*2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.ellipse(s/2, s*0.22, s*0.22, s*0.2, 0, 0, Math.PI*2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = md.eyeColor;
      ctx.fillRect(s*0.36, s*0.18, 3, 3);
      ctx.fillRect(s*0.56, s*0.18, 3, 3);
      ctx.fillStyle = '#000';
      ctx.fillRect(s*0.37, s*0.19, 2, 2);
      ctx.fillRect(s*0.57, s*0.19, 2, 2);
      // Arms
      ctx.fillStyle = md.color;
      ctx.fillRect(s*0.08, s*0.35, s*0.14, 4);
      ctx.fillRect(s*0.78, s*0.35, s*0.14, 4);
    }

    cache[key] = c;
    return c;
  }

  // --- TILE SPRITES ---
  function generateTile(type) {
    const key = `tile_${type}`;
    if (cache[key]) return cache[key];

    const s = 32;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');

    const tiles = {
      grass: () => {
        ctx.fillStyle = '#3a7a2a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#4a8a3a';
        for (let i = 0; i < 8; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 2, 2);
        }
        ctx.fillStyle = '#2a6a1a';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 1, 3);
        }
      },
      water: () => {
        ctx.fillStyle = '#2050aa';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#3060bb';
        ctx.fillRect(4, 8, 12, 2);
        ctx.fillRect(16, 20, 12, 2);
        ctx.fillStyle = 'rgba(100,180,255,0.3)';
        ctx.fillRect(2, 6, 8, 1);
        ctx.fillRect(18, 18, 10, 1);
      },
      sand: () => {
        ctx.fillStyle = '#d4b478';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#c4a468';
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 2, 1);
        }
      },
      stone: () => {
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(0, 0, 15, 15);
        ctx.fillRect(16, 16, 16, 16);
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(1, 1, 13, 13);
        ctx.fillRect(17, 17, 14, 14);
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 16, 16);
        ctx.strokeRect(16, 16, 16, 16);
      },
      lava: () => {
        ctx.fillStyle = '#cc3300';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(4, 4, 10, 8);
        ctx.fillRect(18, 14, 8, 10);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(6, 6, 4, 3);
        ctx.fillRect(20, 18, 4, 4);
      },
      dirt: () => {
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#5a3a1a';
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 3, 2);
        }
      },
      snow: () => {
        ctx.fillStyle = '#e8e8f0';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 2, 2);
        }
      },
      darkgrass: () => {
        ctx.fillStyle = '#1a4a1a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#2a5a2a';
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 2, 3);
        }
      },
      wall: () => {
        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(1, 1, 14, 10);
        ctx.fillRect(17, 13, 14, 10);
        ctx.strokeStyle = '#2a2a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 16, 12);
        ctx.strokeRect(16, 12, 16, 12);
      },
      path: () => {
        ctx.fillStyle = '#9a8a6a';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#8a7a5a';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(Math.random()*s|0, Math.random()*s|0, 4, 2);
        }
      }
    };

    if (tiles[type]) tiles[type]();
    else {
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, s, s);
    }

    cache[key] = c;
    return c;
  }

  // --- OBJECT SPRITES (trees, chests, NPCs) ---
  function generateObject(type) {
    const key = `obj_${type}`;
    if (cache[key]) return cache[key];

    const c = createCanvas(32, 32);
    const ctx = c.getContext('2d');

    const objects = {
      tree: () => {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(13, 18, 6, 14);
        ctx.fillStyle = '#2a6a1a';
        ctx.beginPath();
        ctx.arc(16, 12, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a8a2a';
        ctx.beginPath();
        ctx.arc(14, 10, 6, 0, Math.PI * 2);
        ctx.fill();
      },
      deadtree: () => {
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(14, 10, 4, 22);
        ctx.fillRect(10, 12, 12, 3);
        ctx.fillRect(8, 8, 4, 3);
        ctx.fillRect(20, 6, 4, 3);
      },
      chest: () => {
        ctx.fillStyle = '#8a6a2a';
        ctx.fillRect(6, 14, 20, 14);
        ctx.fillStyle = '#aa8a3a';
        ctx.fillRect(6, 14, 20, 4);
        ctx.fillStyle = '#d4aa40';
        ctx.fillRect(14, 12, 4, 6);
        ctx.fillStyle = '#6a4a1a';
        ctx.fillRect(6, 14, 20, 1);
      },
      chest_open: () => {
        ctx.fillStyle = '#8a6a2a';
        ctx.fillRect(6, 18, 20, 10);
        ctx.fillStyle = '#aa8a3a';
        ctx.fillRect(6, 10, 20, 8);
        ctx.fillStyle = '#ffdd44';
        ctx.fillRect(10, 20, 4, 3);
        ctx.fillRect(18, 21, 3, 2);
        ctx.fillRect(14, 22, 2, 2);
      },
      rock: () => {
        ctx.fillStyle = '#7a7a7a';
        ctx.beginPath();
        ctx.ellipse(16, 22, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.ellipse(14, 20, 8, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
      },
      npc_shop: () => {
        // Simple NPC shopkeeper
        ctx.fillStyle = '#f0c89a';
        ctx.beginPath(); ctx.arc(16, 8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2a5aaa';
        ctx.fillRect(10, 14, 12, 14);
        ctx.fillStyle = '#f0c89a';
        ctx.fillRect(6, 16, 4, 8);
        ctx.fillRect(22, 16, 4, 8);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(13, 6, 2, 2);
        ctx.fillRect(17, 6, 2, 2);
        ctx.fillStyle = '#cc5555';
        ctx.fillRect(14, 10, 4, 1);
        // Hat
        ctx.fillStyle = '#cc9900';
        ctx.fillRect(8, 2, 16, 4);
        ctx.fillRect(12, 0, 8, 3);
      },
      npc_quest: () => {
        ctx.fillStyle = '#f0c89a';
        ctx.beginPath(); ctx.arc(16, 8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#6a2a6a';
        ctx.fillRect(10, 14, 12, 14);
        ctx.fillStyle = '#f0c89a';
        ctx.fillRect(6, 16, 4, 8);
        ctx.fillRect(22, 16, 4, 8);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(13, 6, 2, 2);
        ctx.fillRect(17, 6, 2, 2);
        // Quest marker
        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('!', 14, 0);
      },
      npc_healer: () => {
        ctx.fillStyle = '#f0c89a';
        ctx.beginPath(); ctx.arc(16, 8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 14, 12, 14);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(14, 17, 4, 8);
        ctx.fillRect(11, 20, 10, 3);
        ctx.fillStyle = '#f0c89a';
        ctx.fillRect(6, 16, 4, 8);
        ctx.fillRect(22, 16, 4, 8);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(13, 6, 2, 2);
        ctx.fillRect(17, 6, 2, 2);
      },
      portal: () => {
        ctx.strokeStyle = '#aa44ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(16, 16, 12, 14, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(120,40,200,0.3)';
        ctx.beginPath();
        ctx.ellipse(16, 16, 10, 12, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#cc88ff';
        ctx.fillRect(15, 8, 2, 2);
        ctx.fillRect(11, 14, 2, 2);
        ctx.fillRect(19, 18, 2, 2);
      }
    };

    if (objects[type]) objects[type]();
    cache[key] = c;
    return c;
  }

  // --- ITEM ICONS ---
  function generateItemIcon(item) {
    const key = `item_${item.id || item.name}`;
    if (cache[key]) return cache[key];

    const s = 32;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');

    const rarityColors = {
      common: '#888', uncommon: '#2ecc40', rare: '#0074d9', epic: '#b10dc9', legendary: '#ff851b'
    };
    const borderCol = rarityColors[item.rarity || 'common'];

    // Background
    ctx.fillStyle = 'rgba(20,20,40,0.8)';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s-2, s-2);

    // Icon by type
    const iconColor = borderCol;
    ctx.fillStyle = iconColor;

    switch(item.type) {
      case 'sword':
        ctx.fillRect(14, 4, 4, 18);
        ctx.fillRect(8, 20, 16, 3);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(14, 4, 4, 14);
        break;
      case 'staff':
        ctx.fillRect(15, 6, 3, 20);
        ctx.fillStyle = '#aa60ff';
        ctx.beginPath(); ctx.arc(16, 6, 5, 0, Math.PI*2); ctx.fill();
        break;
      case 'bow':
        ctx.strokeStyle = iconColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, 4); ctx.quadraticCurveTo(26, 16, 16, 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(16, 4); ctx.lineTo(16, 28);
        ctx.stroke();
        break;
      case 'dagger':
        ctx.fillRect(15, 8, 3, 12);
        ctx.fillRect(10, 18, 12, 2);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(15, 8, 3, 8);
        break;
      case 'armor':
        ctx.fillRect(8, 8, 16, 18);
        ctx.fillStyle = '#555';
        ctx.fillRect(10, 10, 12, 14);
        ctx.fillStyle = iconColor;
        ctx.fillRect(12, 12, 8, 4);
        break;
      case 'helmet':
        ctx.beginPath(); ctx.arc(16, 14, 10, Math.PI, 0); ctx.fill();
        ctx.fillRect(6, 14, 20, 6);
        ctx.fillStyle = '#555';
        ctx.fillRect(10, 16, 12, 4);
        break;
      case 'shield':
        ctx.beginPath();
        ctx.moveTo(16, 4); ctx.lineTo(26, 10); ctx.lineTo(24, 24);
        ctx.lineTo(16, 28); ctx.lineTo(8, 24); ctx.lineTo(6, 10);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ddd';
        ctx.fillRect(14, 10, 4, 12);
        ctx.fillRect(10, 16, 12, 3);
        break;
      case 'potion':
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(12, 14, 8, 12);
        ctx.beginPath(); ctx.arc(16, 14, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.fillRect(14, 6, 4, 6);
        break;
      case 'ring':
        ctx.strokeStyle = iconColor;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(16, 16, 8, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath(); ctx.arc(16, 8, 3, 0, Math.PI*2); ctx.fill();
        break;
      default:
        ctx.fillRect(8, 8, 16, 16);
    }

    cache[key] = c;
    return c;
  }

  // --- SKILL EFFECT SPRITES ---
  function generateSkillEffect(type, frame = 0) {
    const key = `fx_${type}_${frame}`;
    if (cache[key]) return cache[key];

    const s = 48;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');
    const t = frame * 0.2;

    switch(type) {
      case 'slash':
        ctx.strokeStyle = `rgba(255,255,255,${0.8 - t*0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s/2, s/2, 10 + frame*4, -1 + t, 1 + t);
        ctx.stroke();
        break;
      case 'fireball':
        ctx.fillStyle = `rgba(255,${100 + frame*20},0,${0.9 - t*0.2})`;
        ctx.beginPath();
        ctx.arc(s/2, s/2, 8 + frame*2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,100,${0.6 - t*0.15})`;
        ctx.beginPath();
        ctx.arc(s/2, s/2, 4 + frame, 0, Math.PI*2);
        ctx.fill();
        break;
      case 'heal':
        ctx.fillStyle = `rgba(100,255,100,${0.7 - t*0.2})`;
        for (let i = 0; i < 5; i++) {
          const a = (i/5)*Math.PI*2 + t*3;
          const r = 8 + frame*2;
          ctx.beginPath();
          ctx.arc(s/2 + Math.cos(a)*r, s/2 + Math.sin(a)*r, 3, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      case 'arrow':
        ctx.fillStyle = `rgba(200,180,120,${0.9 - t*0.2})`;
        ctx.save();
        ctx.translate(s/2, s/2);
        ctx.rotate(-0.4);
        ctx.fillRect(-12, -1, 24, 3);
        ctx.beginPath();
        ctx.moveTo(12, -4); ctx.lineTo(16, 0); ctx.lineTo(12, 4);
        ctx.fill();
        ctx.restore();
        break;
      case 'poison':
        ctx.fillStyle = `rgba(100,200,0,${0.6 - t*0.15})`;
        for (let i = 0; i < 6; i++) {
          const x = s/2 + Math.cos(i+t*2)*(6+frame*2);
          const y = s/2 + Math.sin(i+t*2)*(6+frame*2) - frame*2;
          ctx.beginPath();
          ctx.arc(x, y, 2 + Math.random(), 0, Math.PI*2);
          ctx.fill();
        }
        break;
    }

    cache[key] = c;
    return c;
  }

  function clearCache() {
    for (const k in cache) delete cache[k];
  }

  return {
    generateCharacter,
    generateMonster,
    generateTile,
    generateObject,
    generateItemIcon,
    generateSkillEffect,
    clearCache,
    MONSTER_DATA,
    CLASS_PALETTES
  };
})();
