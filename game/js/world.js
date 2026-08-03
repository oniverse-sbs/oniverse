/* ============================================================
   WORLD.JS — Map Data, Tile System, Zones, Collision
   ============================================================ */

const World = (() => {
  const TILE_SIZE = 32;

  // Tile IDs
  const T = {
    GRASS: 0, WATER: 1, SAND: 2, STONE: 3, LAVA: 4,
    DIRT: 5, SNOW: 6, DARKGRASS: 7, WALL: 8, PATH: 9
  };

  const TILE_NAMES = ['grass','water','sand','stone','lava','dirt','snow','darkgrass','wall','path'];
  const SOLID_TILES = new Set([T.WATER, T.WALL, T.LAVA]);

  // Object types for map placement
  const OBJ = {
    NONE: 0, TREE: 1, ROCK: 2, CHEST: 3, NPC_SHOP: 4,
    NPC_QUEST: 5, NPC_HEALER: 6, PORTAL: 7, DEADTREE: 8,
    MONSTER_SPAWN: 9
  };

  const OBJ_NAMES = {
    1: 'tree', 2: 'rock', 3: 'chest', 4: 'npc_shop',
    5: 'npc_quest', 6: 'npc_healer', 7: 'portal', 8: 'deadtree'
  };

  const SOLID_OBJECTS = new Set([OBJ.TREE, OBJ.ROCK, OBJ.WALL]);

  // --- ZONE DEFINITIONS ---
  const ZONES = {
    greenfield: {
      name: 'Greenfield Village',
      description: 'A peaceful starting village surrounded by lush green plains.',
      bgm: 'peaceful',
      width: 50, height: 40,
      baseLevel: 1,
      monsterTypes: ['slime', 'bat'],
      monsterDensity: 0.02,
      generate: function() { return generateGreenfield(this); }
    },
    darkforest: {
      name: 'Dark Forest',
      description: 'A mysterious forest shrouded in shadow. Beware of wolves and goblins.',
      bgm: 'mystery',
      width: 45, height: 45,
      baseLevel: 5,
      monsterTypes: ['goblin', 'wolf', 'spider'],
      monsterDensity: 0.04,
      generate: function() { return generateDarkForest(this); }
    },
    desert: {
      name: 'Scorching Desert',
      description: 'An arid wasteland where ancient ruins hide untold secrets.',
      bgm: 'desert',
      width: 50, height: 40,
      baseLevel: 10,
      monsterTypes: ['skeleton', 'golem', 'witch'],
      monsterDensity: 0.04,
      generate: function() { return generateDesert(this); }
    },
    dungeon: {
      name: 'Shadow Dungeon',
      description: 'A dark underground dungeon filled with powerful monsters.',
      bgm: 'dungeon',
      width: 40, height: 40,
      baseLevel: 15,
      monsterTypes: ['skeleton', 'ghost', 'demon'],
      monsterDensity: 0.05,
      generate: function() { return generateDungeon(this); }
    },
    volcano: {
      name: 'Volcanic Peak',
      description: 'The final zone. Home of the Dragon King.',
      bgm: 'epic',
      width: 40, height: 40,
      baseLevel: 20,
      monsterTypes: ['demon', 'phoenix', 'dragon'],
      monsterDensity: 0.05,
      generate: function() { return generateVolcano(this); }
    }
  };

  // --- MAP GENERATORS ---
  function createEmptyMap(w, h, fill = T.GRASS) {
    const tiles = [];
    const objects = [];
    for (let y = 0; y < h; y++) {
      tiles.push(new Array(w).fill(fill));
      objects.push(new Array(w).fill(OBJ.NONE));
    }
    return { tiles, objects, width: w, height: h, entities: [], npcs: [], portals: [] };
  }

  function fillRect(map, x, y, w, h, tile) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (y+dy < map.height && x+dx < map.width)
          map.tiles[y+dy][x+dx] = tile;
  }

  function placeObj(map, x, y, obj) {
    if (y >= 0 && y < map.height && x >= 0 && x < map.width)
      map.objects[y][x] = obj;
  }

  function scatter(map, obj, count, avoidTiles = SOLID_TILES) {
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 10) {
      const x = (Math.random() * map.width) | 0;
      const y = (Math.random() * map.height) | 0;
      if (!avoidTiles.has(map.tiles[y][x]) && map.objects[y][x] === OBJ.NONE) {
        map.objects[y][x] = obj;
        placed++;
      }
      tries++;
    }
  }

  function generateGreenfield(zone) {
    const map = createEmptyMap(zone.width, zone.height, T.GRASS);

    // Path through village
    for (let x = 0; x < zone.width; x++) {
      map.tiles[zone.height / 2 | 0][x] = T.PATH;
      map.tiles[(zone.height / 2 | 0) + 1][x] = T.PATH;
    }
    for (let y = 0; y < zone.height; y++) {
      map.tiles[y][zone.width / 2 | 0] = T.PATH;
    }

    // Pond
    fillRect(map, 5, 5, 6, 5, T.WATER);
    fillRect(map, 6, 4, 4, 1, T.WATER);

    // Trees around edges
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() * zone.width) | 0;
      const y = (Math.random() * zone.height) | 0;
      if (map.tiles[y][x] === T.GRASS && map.objects[y][x] === OBJ.NONE &&
          (x < 5 || x > zone.width-5 || y < 5 || y > zone.height-5 ||
           Math.random() < 0.2)) {
        map.objects[y][x] = OBJ.TREE;
      }
    }

    // NPCs
    placeObj(map, zone.width/2|0, (zone.height/2|0) - 3, OBJ.NPC_SHOP);
    map.npcs.push({ x: zone.width/2|0, y: (zone.height/2|0)-3, type: 'shop', name: 'Merchant Rold', dialog: 'Welcome traveler! Browse my wares.' });

    placeObj(map, (zone.width/2|0) + 4, (zone.height/2|0) - 2, OBJ.NPC_QUEST);
    map.npcs.push({ x: (zone.width/2|0)+4, y: (zone.height/2|0)-2, type: 'quest', name: 'Elder Kai', dialog: 'Hero! Slimes are invading our village. Defeat 5 slimes to save us!' });

    placeObj(map, (zone.width/2|0) - 4, (zone.height/2|0) - 2, OBJ.NPC_HEALER);
    map.npcs.push({ x: (zone.width/2|0)-4, y: (zone.height/2|0)-2, type: 'healer', name: 'Priestess Lina', dialog: 'Let me heal your wounds, brave adventurer.' });

    // Chests
    scatter(map, OBJ.CHEST, 4);

    // Portal to Dark Forest
    placeObj(map, zone.width - 3, zone.height / 2 | 0, OBJ.PORTAL);
    map.portals.push({ x: zone.width-3, y: zone.height/2|0, target: 'darkforest', spawnX: 2, spawnY: 20, label: 'Dark Forest →' });

    // Rocks
    scatter(map, OBJ.ROCK, 10);

    // Player spawn
    map.spawnX = zone.width / 2 | 0;
    map.spawnY = (zone.height / 2 | 0) + 3;

    return map;
  }

  function generateDarkForest(zone) {
    const map = createEmptyMap(zone.width, zone.height, T.DARKGRASS);

    // Dense trees
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        if (Math.random() < 0.25 && map.objects[y][x] === OBJ.NONE) {
          map.objects[y][x] = OBJ.TREE;
        }
      }
    }

    // Clear paths
    for (let x = 0; x < zone.width; x++) {
      const cy = zone.height / 2 | 0;
      for (let dy = -1; dy <= 1; dy++) {
        map.tiles[cy + dy][x] = T.DIRT;
        map.objects[cy + dy][x] = OBJ.NONE;
      }
    }

    // Clearings
    const clearings = [[10,10], [35,30], [20,20]];
    clearings.forEach(([cx,cy]) => {
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++)
          if (cx+dx >= 0 && cx+dx < zone.width && cy+dy >= 0 && cy+dy < zone.height) {
            map.tiles[cy+dy][cx+dx] = T.GRASS;
            map.objects[cy+dy][cx+dx] = OBJ.NONE;
          }
    });

    // Water stream
    for (let y = 0; y < zone.height; y++) {
      const x = 30 + Math.sin(y * 0.3) * 3 | 0;
      if (x >= 0 && x < zone.width) {
        map.tiles[y][x] = T.WATER;
        map.objects[y][x] = OBJ.NONE;
      }
    }

    scatter(map, OBJ.CHEST, 5);

    // Portals
    placeObj(map, 2, zone.height/2|0, OBJ.PORTAL);
    map.portals.push({ x: 2, y: zone.height/2|0, target: 'greenfield', spawnX: 47, spawnY: 20, label: '← Greenfield' });

    placeObj(map, zone.width-3, zone.height/2|0, OBJ.PORTAL);
    map.portals.push({ x: zone.width-3, y: zone.height/2|0, target: 'desert', spawnX: 2, spawnY: 20, label: 'Desert →' });

    // Boss area portal to dungeon
    placeObj(map, 20, 20, OBJ.PORTAL);
    map.portals.push({ x: 20, y: 20, target: 'dungeon', spawnX: 20, spawnY: 37, label: '↓ Shadow Dungeon' });

    map.spawnX = 2; map.spawnY = zone.height/2|0;
    return map;
  }

  function generateDesert(zone) {
    const map = createEmptyMap(zone.width, zone.height, T.SAND);

    // Stone ruins
    for (let i = 0; i < 5; i++) {
      const rx = (Math.random() * (zone.width-8) + 4) | 0;
      const ry = (Math.random() * (zone.height-8) + 4) | 0;
      fillRect(map, rx, ry, 6, 6, T.STONE);
      fillRect(map, rx+1, ry+1, 4, 4, T.SAND);
    }

    // Oasis
    fillRect(map, 20, 18, 8, 6, T.WATER);
    for (let dx = -1; dx <= 8; dx++) {
      placeObj(map, 20+dx, 17, OBJ.TREE);
      placeObj(map, 20+dx, 24, OBJ.TREE);
    }

    scatter(map, OBJ.ROCK, 20);
    scatter(map, OBJ.CHEST, 4);
    scatter(map, OBJ.DEADTREE, 15);

    // NPC
    placeObj(map, 24, 20, OBJ.NPC_SHOP);
    map.npcs.push({ x: 24, y: 20, type: 'shop', name: 'Desert Trader', dialog: 'Water costs extra out here...' });

    // Portals
    placeObj(map, 2, zone.height/2|0, OBJ.PORTAL);
    map.portals.push({ x: 2, y: zone.height/2|0, target: 'darkforest', spawnX: 42, spawnY: 22, label: '← Dark Forest' });

    placeObj(map, zone.width-3, zone.height/2|0, OBJ.PORTAL);
    map.portals.push({ x: zone.width-3, y: zone.height/2|0, target: 'volcano', spawnX: 2, spawnY: 20, label: 'Volcano →' });

    map.spawnX = 2; map.spawnY = zone.height/2|0;
    return map;
  }

  function generateDungeon(zone) {
    const map = createEmptyMap(zone.width, zone.height, T.WALL);

    // Carve rooms
    const rooms = [];
    for (let i = 0; i < 8; i++) {
      const rw = 5 + (Math.random() * 6) | 0;
      const rh = 5 + (Math.random() * 6) | 0;
      const rx = (Math.random() * (zone.width - rw - 2) + 1) | 0;
      const ry = (Math.random() * (zone.height - rh - 2) + 1) | 0;
      fillRect(map, rx, ry, rw, rh, T.STONE);
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + rw/2|0, cy: ry + rh/2|0 });
    }

    // Connect rooms with corridors
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = rooms[i], b = rooms[i+1];
      let cx = a.cx, cy = a.cy;
      while (cx !== b.cx) {
        if (cy >= 0 && cy < zone.height && cx >= 0 && cx < zone.width) {
          map.tiles[cy][cx] = T.STONE;
          if (cy+1 < zone.height) map.tiles[cy+1][cx] = T.STONE;
        }
        cx += cx < b.cx ? 1 : -1;
      }
      while (cy !== b.cy) {
        if (cy >= 0 && cy < zone.height && cx >= 0 && cx < zone.width) {
          map.tiles[cy][cx] = T.STONE;
          if (cx+1 < zone.width) map.tiles[cy][cx+1] = T.STONE;
        }
        cy += cy < b.cy ? 1 : -1;
      }
    }

    scatter(map, OBJ.CHEST, 6, new Set([T.WALL]));

    // Exit portal
    placeObj(map, rooms[0].cx, rooms[0].cy+2, OBJ.PORTAL);
    map.portals.push({ x: rooms[0].cx, y: rooms[0].cy+2, target: 'darkforest', spawnX: 20, spawnY: 22, label: '↑ Exit Dungeon' });

    map.spawnX = rooms[rooms.length-1].cx;
    map.spawnY = rooms[rooms.length-1].cy;
    return map;
  }

  function generateVolcano(zone) {
    const map = createEmptyMap(zone.width, zone.height, T.DIRT);

    // Lava rivers
    for (let y = 0; y < zone.height; y++) {
      const x1 = 10 + Math.sin(y * 0.2) * 4 | 0;
      const x2 = 30 + Math.cos(y * 0.15) * 3 | 0;
      if (x1 >= 0 && x1 < zone.width) map.tiles[y][x1] = T.LAVA;
      if (x2 >= 0 && x2 < zone.width) map.tiles[y][x2] = T.LAVA;
    }

    // Stone platforms
    fillRect(map, 18, 5, 8, 8, T.STONE);
    fillRect(map, 15, 30, 10, 6, T.STONE);

    scatter(map, OBJ.ROCK, 25);
    scatter(map, OBJ.CHEST, 3);

    // Boss arena in center
    fillRect(map, 15, 15, 12, 10, T.STONE);
    fillRect(map, 16, 16, 10, 8, T.DIRT);

    // Portal back
    placeObj(map, 2, zone.height/2|0, OBJ.PORTAL);
    map.portals.push({ x: 2, y: zone.height/2|0, target: 'desert', spawnX: 47, spawnY: 20, label: '← Desert' });

    map.spawnX = 2; map.spawnY = zone.height/2|0;
    return map;
  }

  // --- MAP QUERIES ---
  function isSolid(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
    if (SOLID_TILES.has(map.tiles[ty][tx])) return true;
    if (SOLID_OBJECTS.has(map.objects[ty][tx])) return true;
    return false;
  }

  function getObject(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return OBJ.NONE;
    return map.objects[ty][tx];
  }

  function getNPC(map, tx, ty) {
    return map.npcs.find(n => n.x === tx && n.y === ty) || null;
  }

  function getPortal(map, tx, ty) {
    return map.portals.find(p => p.x === tx && p.y === ty) || null;
  }

  return {
    TILE_SIZE, T, TILE_NAMES, SOLID_TILES, OBJ, OBJ_NAMES,
    ZONES, isSolid, getObject, getNPC, getPortal
  };
})();
