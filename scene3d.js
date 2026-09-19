"use strict";
/* ============================================================
   ESCENARIO 3D (Three.js): paisaje del reino, héroe y personaje.
   Si WebGL o Three.js no están disponibles, Stage.ok es false
   y el juego sigue funcionando con emojis en el DOM.
   ============================================================ */
const Stage = (() => {
  let renderer = null, scene = null, camera = null, clock = null;
  let ok = false, night = false, biomeName = null;
  let hero = null, heroId = null, npc = null, blobs = [];
  let biomeGroup = null, clouds = [], lights = {};
  let lay = { rect: null, npc: false };
  const heroAnim = { mode: 'idle', t0: 0, dur: 0 };
  const npcAnim = { mode: 'idle', t0: 0, dur: 0 };
  const sparks = [];
  const FOV = 40;

  const BIOMES = {
    meadow:   { sky: 0x8EC5FF, ground: 0x6BBF59, fog: 0xBFE3FF },
    village:  { sky: 0x9AD0FF, ground: 0x83B85C, fog: 0xC7E4FF },
    forest:   { sky: 0x5E9A86, ground: 0x3F7D4B, fog: 0x86B39E },
    castle:   { sky: 0x4A4A78, ground: 0x767C88, fog: 0x63628F },
    mountain: { sky: 0xB9D8F2, ground: 0xEAF2F9, fog: 0xD9E8F4 },
    dark:     { sky: 0x2A1740, ground: 0x352A42, fog: 0x3E2557 }
  };

  const mat = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
  function mesh(geo, m, x, y, z) { const me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); return me; }

  /* ---------- Decorado ---------- */
  function tree(x, z, s, leaf) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 1.1 * s, 6), mat(0x7A4A24), 0, 0.55 * s, 0));
    g.add(mesh(new THREE.SphereGeometry(0.75 * s, 10, 8), mat(leaf || 0x2F9E44), 0, 1.5 * s, 0));
    g.add(mesh(new THREE.SphereGeometry(0.5 * s, 10, 8), mat(leaf || 0x2F9E44), 0.4 * s, 1.15 * s, 0.1 * s));
    g.position.set(x, 0, z); return g;
  }
  function pine(x, z, s, leaf) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.7 * s, 6), mat(0x6B4226), 0, 0.35 * s, 0));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry((1 - i * 0.24) * s * 0.85, 1.2 * s, 8), mat(leaf || 0x1E6B3A), 0, (1 + i * 0.7) * s, 0));
    g.position.set(x, 0, z); return g;
  }
  function house(x, z, s, wall, roof) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2 * s, 1.3 * s, 1.6 * s), mat(wall || 0xF1DFB8), 0, 0.65 * s, 0));
    const r = mesh(new THREE.ConeGeometry(1.7 * s, 1.1 * s, 4), mat(roof || 0xB45309), 0, 1.85 * s, 0); r.rotation.y = Math.PI / 4; g.add(r);
    g.add(mesh(new THREE.BoxGeometry(0.4 * s, 0.7 * s, 0.05), mat(0x5B3A1E), 0, 0.35 * s, 0.82 * s));
    g.add(mesh(new THREE.BoxGeometry(0.35 * s, 0.35 * s, 0.05), mat(0x9FD3FF), 0.6 * s, 0.85 * s, 0.82 * s));
    g.position.set(x, 0, z); return g;
  }
  function rock(x, z, s, c) { const m = mesh(new THREE.DodecahedronGeometry(0.7 * s, 0), mat(c || 0x8A8F98), x, 0.4 * s, z); m.scale.y = 0.75; return m; }
  function peak(x, z, s, snow) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(2.6 * s, 4.6 * s, 6), mat(0x7B8494), 0, 2.3 * s, 0));
    g.add(mesh(new THREE.ConeGeometry(1.15 * s, 1.7 * s, 6), mat(0xFFFFFF), 0, 3.85 * s, 0));
    g.position.set(x, 0, z); return g;
  }
  function tower(x, z, s, stone, roof) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(1 * s, 1.15 * s, 4 * s, 10), mat(stone || 0x8B8F9C), 0, 2 * s, 0));
    g.add(mesh(new THREE.ConeGeometry(1.3 * s, 1.8 * s, 10), mat(roof || 0xB91C1C), 0, 4.9 * s, 0));
    g.add(mesh(new THREE.BoxGeometry(0.3 * s, 0.6 * s, 0.05), basic(0xFFD166), 0, 2.6 * s, 1.05 * s));
    g.position.set(x, 0, z); return g;
  }
  function wall(x, z, w, stone) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(w, 2.4, 0.8), mat(stone || 0x8B8F9C), 0, 1.2, 0));
    for (let i = 0; i < Math.floor(w / 1.2); i++) g.add(mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), mat(stone || 0x8B8F9C), -w / 2 + 0.6 + i * 1.2, 2.65, 0));
    g.position.set(x, 0, z); return g;
  }
  function torch(x, z) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), mat(0x5B3A1E), 0, 0.7, 0));
    g.add(mesh(new THREE.SphereGeometry(0.22, 8, 6), basic(0xFFA62B), 0, 1.5, 0));
    g.position.set(x, 0, z); g.userData.flame = g.children[1]; return g;
  }
  function flower(x, z, c) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), mat(0x2F9E44), 0, 0.17, 0));
    g.add(mesh(new THREE.SphereGeometry(0.11, 6, 5), mat(c), 0, 0.4, 0));
    g.position.set(x, 0, z); return g;
  }
  function mushroom(x, z, s) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.1 * s, 0.13 * s, 0.4 * s, 6), mat(0xF5EBDD), 0, 0.2 * s, 0));
    g.add(mesh(new THREE.SphereGeometry(0.32 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xE63946), 0, 0.4 * s, 0));
    g.position.set(x, 0, z); return g;
  }
  function spike(x, z, s) { return mesh(new THREE.ConeGeometry(0.5 * s, 3.4 * s, 5), mat(0x241A33), x, 1.7 * s, z); }
  function cloud(x, y, z, s) {
    const g = new THREE.Group(); const m = basic(0xFFFFFF, { transparent: true, opacity: 0.92 });
    [[0, 0, 0, 1], [0.9, -0.1, 0, 0.75], [-0.9, -0.15, 0, 0.7], [0.3, 0.35, 0, 0.7]].forEach(p =>
      g.add(mesh(new THREE.SphereGeometry(p[3] * s, 8, 6), m, p[0] * s, p[1] * s, p[2] * s)));
    g.position.set(x, y, z); g.userData.speed = 0.15 + Math.random() * 0.2; return g;
  }

  function disposeGroup(g) {
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
  }

  function nightMix(hex, k) { const c = new THREE.Color(hex); if (night) c.lerp(new THREE.Color(0x0B1026), k == null ? 0.6 : k); return c; }

  function buildBiome(name) {
    if (biomeGroup) { scene.remove(biomeGroup); disposeGroup(biomeGroup); }
    const B = BIOMES[name] || BIOMES.meadow;
    const g = new THREE.Group(); clouds = [];
    const ground = mesh(new THREE.CircleGeometry(60, 40), mat(nightMix(B.ground, 0.5).getHex()), 0, 0, 0);
    ground.rotation.x = -Math.PI / 2; g.add(ground);
    // camino claro
    const path = mesh(new THREE.PlaneGeometry(3.4, 60), mat(nightMix(name === 'mountain' ? 0xC9D6E2 : name === 'dark' ? 0x4A3B5C : 0xD8B77A, 0.5).getHex()), 0, 0.01, -10);
    path.rotation.x = -Math.PI / 2; g.add(path);

    const add = o => { g.add(o); return o; };
    if (name === 'meadow') {
      [[-9,-7,1.3],[9,-9,1.5],[-15,-12,1.8],[14,-13,1.6],[5,-16,1.4],[-5,-18,1.5]].forEach(p => add(tree(p[0], p[1], p[2])));
      const cols = [0xFF6B6B, 0xFFD166, 0xF78FB3, 0xB197FC];
      for (let i = 0; i < 26; i++) add(flower((Math.random() - 0.5) * 30, -2 - Math.random() * 12, cols[i % 4]));
      add(house(-14, -16, 1.4, 0xF6E6C4, 0xC2410C));
    } else if (name === 'village') {
      add(house(-8, -8, 1.2, 0xF1DFB8, 0xB45309)); add(house(8.5, -9, 1.3, 0xEBD5A8, 0x9A3412));
      add(house(-15, -14, 1.5, 0xF6E6C4, 0xB91C1C)); add(house(16, -15, 1.5, 0xF1DFB8, 0x7C2D12));
      add(tree(-4.5, -12, 1.2)); add(tree(5, -13, 1.3, 0x3AA655)); add(tree(-20, -10, 1.6)); add(tree(21, -9, 1.5));
      add(tower(-24, -26, 1.6, 0x9CA3AF, 0xB91C1C));
    } else if (name === 'forest') {
      for (let i = 0; i < 22; i++) add(pine(-26 + Math.random() * 52, -6 - Math.random() * 22, 1.1 + Math.random() * 1.1, i % 3 ? 0x1E6B3A : 0x2A7F47));
      [[-5,-2,1],[6,-3,1.2],[-8,-4,0.8],[9,-5,1]].forEach(p => add(mushroom(p[0], p[1], p[2])));
    } else if (name === 'castle') {
      add(wall(0, -14, 26, 0x8A90A0)); add(tower(-13, -14, 1.5, 0x8A90A0, 0xB91C1C)); add(tower(13, -14, 1.5, 0x8A90A0, 0xB91C1C));
      add(mesh(new THREE.BoxGeometry(3.4, 3.6, 0.9), mat(0x4A3B2E), 0, 1.8, -13.5));
      add(torch(-4, -3)); add(torch(4, -3)); add(torch(-9, -12)); add(torch(9, -12));
      const banner = add(mesh(new THREE.BoxGeometry(0.9, 2.2, 0.06), mat(0xB91C1C), 0, 5.2, -13.6));
      banner.userData.sway = true;
    } else if (name === 'mountain') {
      [[-14,-22,1.6],[8,-32,2.2],[19,-24,1.7],[-28,-30,2],[30,-32,2]].forEach(p => add(peak(p[0], p[1], p[2])));
      [[-7,-8,1],[8,-7,1.2],[-12,-11,1.4],[13,-12,1.1]].forEach(p => add(rock(p[0], p[1], p[2], 0x9AA3B2)));
      [[-9,-14,1.4],[10,-15,1.6]].forEach(p => add(pine(p[0], p[1], p[2], 0x2E6E5A)));
    } else if (name === 'dark') {
      [[-16,-16,1.5],[16,-16,1.5],[-6,-30,2.4]].forEach(p => add(tower(p[0], p[1], p[2], 0x3B2F4D, 0x5B1030)));
      [[-8,-10],[9,-9],[-13,-6],[12,-5],[-4,-15],[5,-16]].forEach((p, i) => add(spike(p[0], p[1], 0.8 + (i % 3) * 0.35)));
      add(torch(-3.5, -3)); add(torch(3.5, -3));
    }

    // Sol / luna
    const moon = name === 'dark' ? 0xFF4D6D : (night ? 0xE8EEFF : 0xFFE27A);
    add(mesh(new THREE.SphereGeometry(2.4, 16, 12), basic(moon), -14, 14, -45));
    // Nubes
    if (name !== 'castle' && name !== 'dark' || night) { /* sin nubes de día en interiores oscuros */ }
    if (name !== 'dark') for (let i = 0; i < 5; i++) { const c = cloud(-30 + i * 14, 11 + Math.random() * 5, -32 - Math.random() * 8, 1.2 + Math.random()); if (night) c.children.forEach(m => m.material.opacity = 0.25); clouds.push(c); g.add(c); }

    biomeGroup = g; scene.add(g);
    scene.background = nightMix(B.sky, 0.65);
    scene.fog = new THREE.Fog(nightMix(B.fog, 0.65).getHex(), 24, 70);
    lights.amb.intensity = night ? 0.45 : 0.75; lights.sun.intensity = night ? 0.5 : 1.0;
    biomeName = name;
  }

  /* ---------- Personajes ---------- */
  function arm(x, color, len) {
    const p = new THREE.Group(); p.position.set(x, 1.55, 0);
    p.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, len || 0.65, 8), mat(color), 0, -(len || 0.65) / 2 + 0.05, 0));
    p.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0xF2C29B), 0, -(len || 0.65), 0));
    return p;
  }
  function face(parent, y, z, r) {
    const eyeM = basic(0x1F2937);
    [-1, 1].forEach(s => {
      parent.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM, s * 0.16, y + 0.03, z));
      parent.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), basic(0xFF9AA2, { transparent: true, opacity: 0.6 }), s * 0.27, y - 0.09, z - 0.03));
    });
    const mouth = mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 10, Math.PI), basic(0x7F1D1D), 0, y - 0.1, z);
    mouth.rotation.z = Math.PI; parent.add(mouth);
  }

  function buildHero(id) {
    const g = new THREE.Group(); const o = { group: g };
    const skin = mat(0xF2C29B);
    if (id === 'dragon') {
      const green = mat(0x34B36B), belly = mat(0xF6E7A6), horn = mat(0xFFF1C1);
      const body = mesh(new THREE.SphereGeometry(0.85, 16, 12), green, 0, 1.0, 0); body.scale.set(1, 1.1, 0.9); g.add(body);
      const bl = mesh(new THREE.SphereGeometry(0.62, 12, 10), belly, 0, 0.95, 0.35); bl.scale.set(1, 1.1, 0.5); g.add(bl);
      const head = new THREE.Group(); head.position.set(0, 2.05, 0.1); g.add(head); o.head = head;
      head.add(mesh(new THREE.SphereGeometry(0.55, 14, 12), green, 0, 0, 0));
      head.add(mesh(new THREE.SphereGeometry(0.3, 10, 8), green, 0, -0.12, 0.45));
      [-1, 1].forEach(s => {
        head.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), basic(0xFFF7D6), s * 0.22, 0.12, 0.42));
        head.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), basic(0x1F2937), s * 0.22, 0.12, 0.52));
        const h = mesh(new THREE.ConeGeometry(0.11, 0.45, 6), horn, s * 0.3, 0.55, -0.05); h.rotation.z = -s * 0.35; head.add(h);
        head.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), basic(0x14532D), s * 0.08, -0.03, 0.72));
      });
      const smile = mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 10, Math.PI), basic(0x7F1D1D), 0, -0.22, 0.6); smile.rotation.z = Math.PI; head.add(smile);
      for (let i = 0; i < 4; i++) { const sp = mesh(new THREE.ConeGeometry(0.12, 0.3, 5), mat(0xF59E0B), 0, 1.7 - i * 0.32, -0.62 + i * 0.03); sp.rotation.x = -0.5; g.add(sp); }
      const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(1.1, 0.5); wingShape.lineTo(0.9, -0.15); wingShape.lineTo(0.55, -0.05); wingShape.lineTo(0.4, -0.5); wingShape.lineTo(0, -0.2);
      const wingM = new THREE.MeshLambertMaterial({ color: 0xF59E0B, side: THREE.DoubleSide });
      [-1, 1].forEach(s => { const w = mesh(new THREE.ShapeGeometry(wingShape), wingM, s * 0.55, 1.5, -0.5); if (s < 0) w.scale.x = -1; w.rotation.y = s * 0.5; g.add(w); if (s > 0) o.wingR = w; else o.wingL = w; });
      const tail = mesh(new THREE.ConeGeometry(0.3, 1.5, 8), green, 0.7, 0.55, -0.55); tail.rotation.z = -1.1; tail.rotation.x = -0.4; g.add(tail);
      [-1, 1].forEach(s => g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.3, 8), green, s * 0.4, 0.15, 0.15)));
      o.rArm = new THREE.Group(); o.rArm.position.set(0.8, 1.35, 0.15); o.rArm.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), green, 0, -0.22, 0)); g.add(o.rArm);
      o.lArm = new THREE.Group(); o.lArm.position.set(-0.8, 1.35, 0.15); o.lArm.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), green, 0, -0.22, 0)); g.add(o.lArm);
      return o;
    }
    // Humanoides
    const legs = mat(id === 'wizard' ? 0x4C1D95 : id === 'princess' ? 0xF5D0E6 : 0x475569);
    [-1, 1].forEach(s => { g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 8), legs, s * 0.22, 0.35, 0)); g.add(mesh(new THREE.BoxGeometry(0.28, 0.14, 0.4), mat(0x5B3A1E), s * 0.22, 0.07, 0.06)); });
    const head = new THREE.Group(); head.position.set(0, 1.95, 0); g.add(head); o.head = head;
    head.add(mesh(new THREE.SphereGeometry(0.42, 16, 12), skin, 0, 0, 0));
    face(head, 0, 0.38, 0.42);

    if (id === 'knight') {
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.0, 14), mat(0x2563EB), 0, 1.1, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 14), mat(0xF59E0B), 0, 0.68, 0));
      g.add(mesh(new THREE.BoxGeometry(0.34, 0.5, 0.05), mat(0xFDE047), 0, 1.15, 0.5));
      const helm = mesh(new THREE.SphereGeometry(0.47, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), mat(0xB8C0CC), 0, 0.06, 0); head.add(helm);
      head.add(mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mat(0x9AA3B2), 0, 0.14, 0.42));
      const plume = mesh(new THREE.ConeGeometry(0.13, 0.5, 6), mat(0xDC2626), 0, 0.62, -0.05); head.add(plume);
      o.rArm = arm(0.62, 0x2563EB); o.lArm = arm(-0.62, 0x2563EB);
      const sword = new THREE.Group(); sword.position.set(0, -0.7, 0.05);
      sword.add(mesh(new THREE.BoxGeometry(0.1, 0.95, 0.03), mat(0xE5E7EB), 0, 0.5, 0));
      sword.add(mesh(new THREE.BoxGeometry(0.4, 0.07, 0.07), mat(0xF59E0B), 0, 0.02, 0));
      sword.add(mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), mat(0x7C2D12), 0, -0.1, 0)); o.rArm.add(sword);
      const shield = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 14), mat(0xDC2626), -0.1, -0.5, 0.15); shield.rotation.x = Math.PI / 2;
      shield.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 10), mat(0xFDE047))); o.lArm.add(shield);
    } else if (id === 'princess') {
      g.add(mesh(new THREE.ConeGeometry(0.95, 1.5, 20), mat(0xEC4899), 0, 0.75, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.36, 0.45, 0.6, 12), mat(0xF472B6), 0, 1.3, 0));
      const belt = mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 16), mat(0xFDE047), 0, 1.02, 0); belt.rotation.x = Math.PI / 2; g.add(belt);
      const hair = mesh(new THREE.SphereGeometry(0.47, 14, 10), mat(0x7C3F1D), 0, 0.05, -0.1); hair.scale.set(1, 1.05, 0.95); head.add(hair);
      const crown = new THREE.Group(); crown.position.y = 0.42;
      crown.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.14, 10), mat(0xFDE047), 0, 0, 0));
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; crown.add(mesh(new THREE.ConeGeometry(0.06, 0.2, 5), mat(0xFDE047), Math.cos(a) * 0.24, 0.16, Math.sin(a) * 0.24)); }
      head.add(crown);
      o.rArm = arm(0.6, 0xF472B6, 0.6); o.lArm = arm(-0.6, 0xF472B6, 0.6);
      const wand = new THREE.Group(); wand.position.set(0, -0.62, 0.05);
      wand.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5), mat(0xFDE047), 0, 0.4, 0));
      wand.add(mesh(new THREE.OctahedronGeometry(0.15, 0), basic(0xFFF3A3), 0, 0.92, 0)); o.rArm.add(wand);
    } else { // wizard
      g.add(mesh(new THREE.ConeGeometry(0.85, 1.7, 16), mat(0x6D28D9), 0, 0.85, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 12), mat(0x7C3AED), 0, 1.35, 0));
      g.add(mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), mat(0xFDE047), 0, 1.05, 0.45));
      head.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.07, 16), mat(0x5B21B6), 0, 0.3, 0));
      head.add(mesh(new THREE.ConeGeometry(0.46, 1.15, 12), mat(0x6D28D9), 0, 0.88, 0));
      head.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), basic(0xFDE047), 0, 1.5, 0));
      const beard = mesh(new THREE.ConeGeometry(0.34, 0.85, 10), mat(0xF3F4F6), 0, -0.6, 0.22); beard.rotation.x = Math.PI - 0.15; head.add(beard);
      head.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xF3F4F6), 0, -0.13, 0.4));
      o.rArm = arm(0.62, 0x6D28D9); o.lArm = arm(-0.62, 0x6D28D9);
      const staff = new THREE.Group(); staff.position.set(0.05, -0.65, 0.05);
      staff.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), mat(0x7A4A24), 0, 0.75, 0));
      const orb = mesh(new THREE.SphereGeometry(0.2, 12, 10), basic(0x67E8F9), 0, 1.75, 0); staff.add(orb); o.orb = orb; o.rArm.add(staff);
    }
    g.add(o.rArm); g.add(o.lArm);
    return o;
  }

  function emojiTexture(ch) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    x.font = '180px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, 128, 140);
    return new THREE.CanvasTexture(c);
  }

  function blob(x) {
    const b = mesh(new THREE.CircleGeometry(0.85, 16), basic(0x000000, { transparent: true, opacity: 0.22 }), x, 0.02, 0);
    b.rotation.x = -Math.PI / 2; return b;
  }

  /* ---------- API ---------- */
  function init(canvas) {
    try {
      if (typeof THREE === 'undefined') return false;
      const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.25 : 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 200);
      clock = new THREE.Clock();
      lights.amb = new THREE.AmbientLight(0xFFFFFF, 0.75); scene.add(lights.amb);
      lights.sun = new THREE.DirectionalLight(0xFFF3D6, 1.0); lights.sun.position.set(10, 20, 14); scene.add(lights.sun);
      // sparkles reutilizables
      const sm = basic(0xFFE066);
      for (let i = 0; i < 28; i++) { const s = mesh(new THREE.OctahedronGeometry(0.11, 0), sm); s.visible = false; s.userData = { v: new THREE.Vector3(), life: 0 }; scene.add(s); sparks.push(s); }
      buildBiome('meadow');
      ok = true;
      renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); ok = false; document.body.classList.add('no3d'); });
      window.addEventListener('resize', resize);
      requestAnimationFrame(loop);
      return true;
    } catch (e) { ok = false; return false; }
  }

  function setBiome(name) { if (!ok || name === biomeName) return; buildBiome(name); }

  function setNight(v) { night = !!v; if (ok) { const n = biomeName; biomeName = null; buildBiome(n || 'meadow'); } }

  function setHero(id) {
    if (!ok || (id === heroId && hero)) return;
    if (hero) { scene.remove(hero.group); disposeGroup(hero.group); }
    hero = buildHero(id); heroId = id; scene.add(hero.group);
    if (!blobs[0]) { blobs[0] = blob(0); scene.add(blobs[0]); }
    applyLayout();
  }

  function setNPC(emoji) {
    if (!ok) return;
    if (npc) { scene.remove(npc); if (npc.material.map) npc.material.map.dispose(); npc.material.dispose(); npc = null; }
    lay.npc = !!emoji;
    if (emoji) {
      npc = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true }));
      npc.scale.set(2.3, 2.3, 1); scene.add(npc);
      if (!blobs[1]) { blobs[1] = blob(0); scene.add(blobs[1]); }
      blobs[1].visible = true;
    } else if (blobs[1]) blobs[1].visible = false;
    applyLayout();
  }

  /* rect: zona de pantalla (px) donde deben verse los personajes */
  function setLayout(rect) { lay.rect = rect; applyLayout(); }

  function applyLayout() {
    if (!ok || !lay.rect) return;
    const W = window.innerWidth, H = window.innerHeight, r = lay.rect;
    const rw = Math.max(80, r.x1 - r.x0), rh = Math.max(80, r.y1 - r.y0);
    const needH = 3.2, needW = lay.npc ? 5.0 : 2.8;
    const halfH = Math.max(needH * H / (2 * rh), needW * H / (2 * rw));
    const dist = Math.min(48, Math.max(7, halfH / Math.tan(FOV * Math.PI / 360)));
    camera.position.set(0, 1.9, dist); camera.lookAt(0, 1.3, 0);
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
    const worldPerPx = 2 * (dist * Math.tan(FOV * Math.PI / 360)) / H;
    const a = Math.max(1.25, Math.min(5.2, rw * worldPerPx * 0.26));
    if (hero) { hero.group.position.x = lay.npc ? -a : 0; hero.baseX = hero.group.position.x; hero.group.rotation.y = lay.npc ? 0.4 : 0; }
    if (blobs[0]) blobs[0].position.x = lay.npc ? -a : 0;
    if (npc) { npc.userData.baseX = a; npc.position.set(a, 1.35, 0); }
    if (blobs[1]) blobs[1].position.x = a;
  }

  function resize() {
    if (!ok) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    applyLayout();
  }

  function play(target, mode, dur) { target.mode = mode; target.t0 = clock ? clock.elapsedTime : 0; target.dur = dur || 1; }
  function anim(who, mode) {
    if (!ok) return;
    if (who === 'hero') play(heroAnim, mode, mode === 'cheer' ? 1.1 : mode === 'sad' ? 0.9 : mode === 'wave' ? 2.4 : 1);
    else play(npcAnim, mode, mode === 'cheer' ? 0.9 : 0.7);
  }

  function burst(who) {
    if (!ok) return;
    const src = (who === 'npc' && npc) ? npc.position : (hero ? hero.group.position : { x: 0 });
    sparks.forEach((s, i) => {
      s.visible = true; s.position.set(src.x, 1.9, 0.6);
      const a = (i / sparks.length) * Math.PI * 2;
      s.userData.v.set(Math.cos(a) * (1.2 + Math.random()), 2.4 + Math.random() * 2, Math.sin(a) * 0.8);
      s.userData.life = 1;
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!ok || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 42) c.position.x = -42; });
    if (biomeGroup) biomeGroup.children.forEach(o => {
      if (o.userData.flame) o.userData.flame.scale.setScalar(1 + Math.sin(t * 12 + o.position.x) * 0.15);
      if (o.userData.sway) o.rotation.z = Math.sin(t * 1.5) * 0.08;
    });
    if (hero) {
      const g = hero.group; const p = Math.min(1, (t - heroAnim.t0) / heroAnim.dur);
      let y = Math.sin(t * 2.2) * 0.035, rz = 0, ra = 0, la = 0, sc = 1;
      if (heroAnim.mode === 'cheer' && p < 1) { y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.8; ra = 2.7; la = -2.7; }
      else if (heroAnim.mode === 'sad' && p < 1) { rz = Math.sin(t * 16) * 0.06 * (1 - p); y = -0.05; sc = 0.96; }
      else if (heroAnim.mode === 'wave' && p < 1) { ra = 2.5 + Math.sin(t * 11) * 0.45; }
      else if (p >= 1) heroAnim.mode = 'idle';
      g.position.y = y; g.rotation.z = rz; g.scale.setScalar(sc);
      if (hero.rArm) hero.rArm.rotation.z = ra ? -ra : -0.12 + Math.sin(t * 2) * 0.03;
      if (hero.lArm) hero.lArm.rotation.z = la ? -la : 0.12 - Math.sin(t * 2) * 0.03;
      if (hero.head) hero.head.rotation.z = heroAnim.mode === 'sad' && p < 1 ? -0.15 : Math.sin(t * 1.3) * 0.03;
      if (hero.orb) hero.orb.scale.setScalar(1 + Math.sin(t * 5) * 0.15);
      if (hero.wingR) { hero.wingR.rotation.z = Math.sin(t * 3.2) * 0.12; hero.wingL.rotation.z = -Math.sin(t * 3.2) * 0.12; }
      if (blobs[0]) blobs[0].scale.setScalar(1 - Math.min(0.4, y * 0.4));
    }
    if (npc) {
      const p = Math.min(1, (t - npcAnim.t0) / npcAnim.dur);
      let y = 1.35 + Math.sin(t * 1.9 + 1) * 0.05;
      if (npcAnim.mode === 'cheer' && p < 1) y += Math.abs(Math.sin(p * Math.PI * 2)) * 0.6;
      else if (npcAnim.mode === 'sad' && p < 1) y -= 0.08;
      else if (p >= 1) npcAnim.mode = 'idle';
      npc.position.y = y;
    }
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i]; if (!s.visible) continue;
      const u = s.userData; u.life -= dt * 1.1;
      if (u.life <= 0) { s.visible = false; continue; }
      u.v.y -= 6 * dt; s.position.addScaledVector(u.v, dt); s.rotation.y += dt * 8; s.scale.setScalar(u.life);
    }
    renderer.render(scene, camera);
  }

  return { init, setBiome, setNight, setHero, setNPC, setLayout, anim, burst, resize, get ok() { return ok; } };
})();
