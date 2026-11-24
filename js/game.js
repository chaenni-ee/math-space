// ===== 3D 게임 엔진 (Three.js) =====
// 눈사람 포수가 좌우로 움직이며 자동으로 눈뭉치를 쏩니다.
// 상자 눈괴물이 방어선에 닿으면 하트가 줄어요.
const Game = (() => {
  const LANE = 7;            // 플레이어가 움직일 수 있는 범위 (-LANE ~ LANE)
  const LINE_Z = 1.6;        // 방어선
  const SPAWN_Z = -56;
  const PALETTE = [0x4fa8ff, 0x9b7bff, 0xff7fb4, 0x3fcf9f, 0xffbf3c, 0x7f95ff, 0xff8a5c];

  let renderer, scene, camera, fx, fxc, hooks = {};
  let mode = 'menu', s = null, last = 0, clock = 0;
  let player, cannonTip, lineMesh;
  let targetX = 0, keyDir = 0, pointerActive = false;
  let snowPts, particles, roundTex, sun, muzzle;
  let quality = Store.get('gfx_q', 0), fpsAcc = 0, fpsN = 0;
  const shared = {};

  // ---------- 준비 ----------
  function init(canvas, h) {
    hooks = h || {};
    if (typeof THREE === 'undefined') { hooks.onError && hooks.onError(); return; }
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);   // 뒤에 배경 그림이 보이도록 투명하게
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

    fx = document.getElementById('fx');
    fxc = fx.getContext('2d');

    roundTex = makeRoundTexture();
    buildWorld();
    buildPlayer();
    particles = makeParticles(900);
    applyQuality();
    resize();
    addEventListener('resize', resize);

    // 조작: 마우스/손가락 x 위치를 따라감, 방향키·A/D
    const onPtr = e => {
      if (mode !== 'play') return;
      if (e.pointerType !== 'mouse' && e.type === 'pointermove' && !pointerActive) return;
      targetX = screenToLane(e.clientX);
    };
    canvas.addEventListener('pointerdown', e => { pointerActive = true; Sound.unlock(); onPtr(e); });
    addEventListener('pointermove', onPtr);
    addEventListener('pointerup', () => { pointerActive = false; });
    addEventListener('keydown', e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyDir = -1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keyDir = 1;
    });
    addEventListener('keyup', e => {
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && keyDir < 0) keyDir = 0;
      if ((e.code === 'ArrowRight' || e.code === 'KeyD') && keyDir > 0) keyDir = 0;
    });
    requestAnimationFrame(loop);
  }

  // 느린 기기면 화질을 한 단계씩 낮춤 (0: 최고 → 3: 가장 가벼움)
  function applyQuality() {
    const pr = [1.5, 1, 1, 0.75][quality];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pr));
    sun.castShadow = quality < 2;
    if (snowPts) snowPts.geometry.setDrawRange(0, quality >= 3 ? 500 : quality >= 2 ? 900 : 1600);
    if (camera.userData.base) resize();
  }
  function watchFps(dt) {
    if (!dt || quality >= 3) return;
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 2.5) {
      const fps = fpsN / fpsAcc;
      fpsAcc = 0; fpsN = 0;
      if (fps < 38) { quality++; Store.set('gfx_q', quality); applyQuality(); }
    }
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 세로로 긴 화면에서도 좌우 끝이 보이도록
    const narrow = Math.max(0, 1.6 - camera.aspect);
    camera.fov = 52 + narrow * 22;
    camera.userData.base = new THREE.Vector3(0, 7.4 + narrow * 2.4, 9.2 + narrow * 4);
    camera.position.copy(camera.userData.base);
    camera.lookAt(0, 0.2, -17);
    camera.updateProjectionMatrix();
    alignBackground(w, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = Math.round(w * dpr); fx.height = Math.round(h * dpr);
    fxc.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function alignBackground(w, h) {
    const bg = document.getElementById('bg');
    if (!bg) return;
    const IW = 1466, IH = 1073, HOR = 0.296;
    camera.updateMatrixWorld();
    const v = new THREE.Vector3(camera.position.x, 0, camera.position.z - 2000).project(camera);
    const hy = Math.max(h * 0.05, Math.min(h * 0.9, (1 - v.y) / 2 * h));   // 화면 위 지평선 높이
    const sc = Math.max(w / IW, hy / (HOR * IH), (h - hy) / ((1 - HOR) * IH));
    const bw = IW * sc, bh = IH * sc;
    bg.style.backgroundSize = bw + 'px ' + bh + 'px';
    bg.style.backgroundPosition = ((w - bw) / 2) + 'px ' + (hy - HOR * bh) + 'px';
  }

  function screenToLane(clientX) {
    const a = new THREE.Vector3(-LANE, 0, 0).project(camera), b = new THREE.Vector3(LANE, 0, 0).project(camera);
    const nx = clientX / innerWidth * 2 - 1;
    const t = (nx - a.x) / (b.x - a.x);
    return Math.max(-LANE, Math.min(LANE, -LANE + t * 2 * LANE));
  }

  // ---------- 재료 ----------
  function makeRoundTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  }
  // 그림을 3D 공간에 세우는 판 (아래쪽 가운데가 기준점)
  const TL = new THREE.TextureLoader();
  const billboards = [];
  const IMG = {
    snowmanBack: ['assets/snowman-back.webp', 530 / 700],
    treeSnow: ['assets/tree-snow.webp', 526 / 768],
    treeXmas: ['assets/tree-xmas.webp', 574 / 900],
    treeGift: ['assets/tree-gift.webp', 600 / 900],
  };
  const texCache = {};
  function imgTex(url) {
    if (!texCache[url]) {
      const t = TL.load(url); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      texCache[url] = t;
    }
    return texCache[url];
  }
  function billboard(key, height, tint, face) {
    const [url, aspect] = IMG[key];
    const geo = new THREE.PlaneGeometry(height * aspect, height);
    geo.translate(0, height / 2, 0);
    const map = imgTex(url);
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.12, color: tint || 0xffffff, toneMapped: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.45 });
    if (face !== false) billboards.push(m);
    return m;
  }

  const std = (color, o) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...(o || {}) });

  // ---------- 배경 ----------
  function buildWorld() {
    // 하늘·산·숲·눈밭은 배경 그림(assets/bg-forest.webp)이 담당
    scene.fog = new THREE.Fog(0xd8e2fd, 34, 120);

    // 조명
    scene.add(new THREE.HemisphereLight(0xe4e8ff, 0xaeb6e8, 0.85));
    sun = new THREE.DirectionalLight(0xfff6ee, 0.95);
    sun.position.set(9, 18, 8); sun.target.position.set(0, 0, -12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 30, bottom: -30, near: 1, far: 70 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    // 그림자만 받는 투명한 바닥 (배경 그림의 눈밭 위에 그림자가 생김)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: 0x3b4a99, opacity: 0.28 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.01; ground.receiveShadow = true; scene.add(ground);

    // 방어선 (빛나는 얼음 띠) + 눈 벽돌 성벽
    lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2 + 3, 0.35), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.8 }));
    lineMesh.rotation.x = -Math.PI / 2; lineMesh.position.set(0, 0.06, LINE_Z); scene.add(lineMesh);
    const brick = new THREE.BoxGeometry(1.25, 0.6, 0.7), brickMat = std(0xffffff, { roughness: 0.9 });
    for (let row = 0; row < 2; row++) for (let i = -8; i <= 8; i++) {
      const b = new THREE.Mesh(brick, brickMat);
      b.position.set(i * 1.3 + (row % 2) * 0.65, 0.3 + row * 0.62, LINE_Z + 3.2);
      b.castShadow = b.receiveShadow = true; scene.add(b);
    }

    // 길가 나무 (그림) — 줄지어 세우지 않고 몇 그루씩 무리 지어 자연스럽게
    const blobMat = new THREE.MeshBasicMaterial({ map: roundTex, color: 0x8f96d6, transparent: true, opacity: 0.32, depthWrite: false });
    const plant = (key, x, z, hgt, tint) => {
      const t = billboard(key, hgt, tint);
      t.position.set(x, -0.15, z);
      if (Math.random() < 0.5) t.scale.x = -1;          // 좌우 뒤집어 똑같아 보이지 않게
      scene.add(t);
      const blob = new THREE.Mesh(shared.disc, blobMat); // 밑동 그림자
      blob.rotation.x = -Math.PI / 2; blob.position.set(x, 0.02, z + 0.2);
      blob.scale.set(hgt * 0.32, hgt * 0.13, 1); scene.add(blob);
      return t;
    };
    // 길가 나무와 트리는 배경 그림에 그려져 있음
    shared.xmasLights = [];

    // 내리는 눈
    const n = 1600, sgeo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 90; arr[i * 3 + 1] = Math.random() * 30; arr[i * 3 + 2] = -100 + Math.random() * 115; }
    sgeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    snowPts = new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 0.22, map: roundTex, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.9 }));
    snowPts.userData.speed = Array.from({ length: n }, () => 1.2 + Math.random() * 2);
    scene.add(snowPts);

    // 자주 쓰는 모양
    shared.ball = new THREE.SphereGeometry(0.28, 14, 10);
    shared.ballMat = std(0xffffff, { roughness: 0.6, emissive: 0x9cc9ff, emissiveIntensity: 0.25 });
    shared.trail = new THREE.CylinderGeometry(0.24, 0.02, 2.2, 8, 1, true);
    shared.trail.rotateX(-Math.PI / 2); shared.trail.translate(0, 0, 1.2);
    shared.trailMat = new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.35, depthWrite: false });
    shared.eyeW = new THREE.SphereGeometry(1, 12, 10);
    shared.white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    shared.black = new THREE.MeshStandardMaterial({ color: 0x18203a, roughness: 0.3 });
    shared.box = new THREE.BoxGeometry(1, 1, 1);
    shared.ring = new THREE.RingGeometry(0.78, 1, 40);
    shared.disc = new THREE.CircleGeometry(1, 40);
  }

  // ---------- 플레이어 (눈사람 포수) ----------
  function buildPlayer() {
    player = new THREE.Group();
    const body = billboard('snowmanBack', 3.4, 0xffffff, false);
    body.castShadow = true;
    player.add(body);
    player.userData.body = body;
    // 발사 위치(눈사람 가슴 앞) — 보이지 않는 그룹, 총구 불꽃만 표시
    const gun = new THREE.Group(); gun.position.set(0, 1.55, -0.3);
    muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: roundTex, color: 0xcfeaff, transparent: true, opacity: 0, depthWrite: false }));
    muzzle.position.z = -0.5; muzzle.scale.set(1.1, 1.1, 1); gun.add(muzzle);
    player.add(gun);
    player.userData.gun = gun;
    cannonTip = new THREE.Vector3(0, 1.55, -0.9);
    // 발밑 그림자
    const sh = new THREE.Mesh(shared.disc, new THREE.MeshBasicMaterial({ color: 0x3a5a9a, transparent: true, opacity: 0.22, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.set(1.3, 0.8, 1); player.add(sh);
    scene.add(player);
  }

  // ---------- 파티클 ----------
  function makeParticles(n) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3).fill(-999), col = new Float32Array(n * 3).fill(1);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.38, map: roundTex, vertexColors: true, transparent: true, depthWrite: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, pos, col, n, vel: new Float32Array(n * 3), life: new Float32Array(n), next: 0 };
  }
  function burst(x, y, z, color, count, power) {
    const c = new THREE.Color(color), P = particles;
    for (let k = 0; k < count; k++) {
      const i = P.next; P.next = (P.next + 1) % P.n;
      P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, v = (2 + Math.random() * 6) * (power || 1);
      P.vel[i * 3] = Math.cos(a) * Math.cos(b) * v; P.vel[i * 3 + 1] = Math.abs(Math.sin(b)) * v + 2; P.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * v;
      const w = Math.random() < 0.5;
      P.col[i * 3] = w ? 1 : c.r; P.col[i * 3 + 1] = w ? 1 : c.g; P.col[i * 3 + 2] = w ? 1 : c.b;
      P.life[i] = 0.5 + Math.random() * 0.6;
    }
  }
  function updateParticles(dt) {
    const P = particles;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt;
      if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -999; continue; }
      P.vel[i * 3 + 1] -= 14 * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      if (P.pos[i * 3 + 1] < 0.05) { P.pos[i * 3 + 1] = 0.05; P.vel[i * 3 + 1] *= -0.3; P.vel[i * 3] *= 0.6; P.vel[i * 3 + 2] *= 0.6; }
    }
    P.pts.geometry.attributes.position.needsUpdate = true;
    P.pts.geometry.attributes.color.needsUpdate = true;
  }

  // ---------- 눈괴물 ----------
  function makeMonster(gift, hp, boss) {
    const g = new THREE.Group();
    let w, h, d;
    if (boss) { w = 3.6; h = 3.0; d = 2.6; }
    else if (gift) { w = h = d = 1.5; }
    else if (Math.random() < 0.25) { w = h = d = 1.3 + Math.random() * 0.5; }          // 정육면체 괴물
    else { w = 1.2 + Math.random() * 1.1; h = 1.0 + Math.random() * 1.0; d = 0.9 + Math.random() * 0.7; }
    if (!boss) { const k = 1.3 * (1 + (hp - 1) * 0.22); w *= k; h *= k; d *= k; }
    const color = boss ? 0x7b4dff : gift ? 0xe8424f : PALETTE[(Math.random() * PALETTE.length) | 0];
    const mat = std(color, { roughness: 0.55 });
    const body = new THREE.Mesh(shared.box, mat);
    body.scale.set(w, h, d); body.position.y = h / 2 + 0.35; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    // 위에 쌓인 눈
    const cap = new THREE.Mesh(shared.box, std(0xffffff, { roughness: 0.9 }));
    cap.scale.set(w * 1.04, 0.16, d * 1.04); cap.position.y = h + 0.35 + 0.06; cap.castShadow = true; g.add(cap);
    // 발
    const feet = [];
    for (const sx of [-0.28, 0.28]) {
      const f = new THREE.Mesh(shared.box, std(new THREE.Color(color).multiplyScalar(0.7)));
      f.scale.set(w * 0.26, 0.4, d * 0.5); f.position.set(sx * w, 0.2, 0); f.castShadow = true; g.add(f); feet.push(f);
    }
    const face = new THREE.Group(); face.position.set(0, h * 0.58 + 0.35, d / 2 + 0.01); g.add(face);
    if (gift) {
      const rib = std(0xffd43b, { roughness: 0.4, emissive: 0x664400, emissiveIntensity: 0.3 });
      const r1 = new THREE.Mesh(shared.box, rib); r1.scale.set(0.28, h + 0.02, d + 0.02); r1.position.y = body.position.y;
      const r2 = new THREE.Mesh(shared.box, rib); r2.scale.set(w + 0.02, h + 0.02, 0.28); r2.position.y = body.position.y;
      const bow1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 16), rib); bow1.position.set(-0.25, h + 0.6, 0); bow1.rotation.y = Math.PI / 2;
      const bow2 = bow1.clone(); bow2.position.x = 0.25;
      g.add(r1, r2, bow1, bow2);
      const q = makeLabelSprite('?', '#fff', '#b02a2a'); q.position.set(0, h + 1.5, 0); q.scale.set(1.1, 1.1, 1); g.add(q);
      g.userData.q = q;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: roundTex, color: 0xffe066, transparent: true, opacity: 0.5, depthWrite: false }));
      halo.scale.set(w * 2.6, w * 2.6, 1); halo.position.y = body.position.y; g.add(halo); g.userData.halo = halo;
    } else {
      const er = Math.min(w, h) * 0.13;
      const eyes = [];
      for (const sx of [-0.22, 0.22]) {
        const e = new THREE.Mesh(shared.eyeW, shared.white); e.scale.set(er, er, er * 0.5); e.position.set(sx * w, 0, 0);
        const p = new THREE.Mesh(shared.eyeW, shared.black); p.scale.set(er * 0.55, er * 0.55, er * 0.3); p.position.set(sx * w, -er * 0.15, er * 0.35);
        face.add(e, p); eyes.push(e, p);
      }
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(er * 0.9, er * 0.18, 6, 12, Math.PI), shared.black);
      mouth.position.set(0, -er * 2.1, 0.02); mouth.rotation.z = Math.PI; face.add(mouth);
      const brows = [];
      for (const sx of [-1, 1]) {
        const b = new THREE.Mesh(shared.box, shared.black); b.scale.set(er * 1.6, er * 0.35, 0.05);
        b.position.set(sx * 0.22 * w, er * 1.5, 0.03); b.rotation.z = sx * -0.45; b.visible = false; face.add(b); brows.push(b);
      }
      g.userData.brows = brows; g.userData.eyes = eyes; g.userData.mouth = mouth;
      if (hp > 1) {
        const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1b2440, transparent: true, opacity: 0.55, depthTest: false }));
        const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff5d73, depthTest: false }));
        bg.center.set(0, 0.5); fg.center.set(0, 0.5);
        const bh = boss ? 0.32 : 0.18; bg.scale.set(w, bh, 1); fg.scale.set(w, bh, 1);
        const by = h + (boss ? 1.9 : 1.0); bg.position.set(-w / 2, by, 0); fg.position.set(-w / 2, by, 0.01);
        bg.renderOrder = 10; fg.renderOrder = 11;
        g.add(bg, fg); g.userData.hpBar = fg;
      }
    }
    if (boss) {
      const gold = std(0xffcc33, { metalness: 0.6, roughness: 0.3, emissive: 0x664400, emissiveIntensity: 0.4 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.45, 20, 1, true), gold);
      band.position.y = h + 0.35 + 0.4; g.add(band);
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 6), gold);
        const a = i / 5 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.95, h + 0.35 + 0.85, Math.sin(a) * 0.95); g.add(sp);
      }
    }
    g.userData.mat = mat; g.userData.feet = feet;
    return { g, w, h, d, gift, hp, maxHp: hp, color, hit: 0, ph: Math.random() * 6, sway: Math.random() * 1.2, vz: 0, dead: false, dying: 0, squash: 0, boss: !!boss };
  }

  function makeLabelSprite(text, fill, stroke) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.font = '96px HakgyoDung, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = stroke; g.strokeText(text, 64, 70); g.fillStyle = fill; g.fillText(text, 64, 70);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  }

  function disposeGroup(g) { scene.remove(g); g.traverse(o => { if (o.material && o.material !== shared.white && o.material !== shared.black && o.material !== shared.ballMat) { if (o.material.map && o.material.map !== roundTex) o.material.map.dispose(); o.material.dispose(); } }); }

  // ---------- 판 시작/정지 ----------
  function clearWorld() {
    if (!s) return;
    s.monsters.forEach(m => disposeGroup(m.g));
    s.bullets.forEach(b => scene.remove(b.mesh));
    s.hazards.forEach(z => { scene.remove(z.ring, z.fill, z.obj); z.ring.material.dispose(); z.fill.material.dispose(); });
  }
  // opts: { boss: true } 단원 평가(보스전)
  function start(opts) {
    opts = opts || {};
    clearWorld();
    s = {
      t: 0, score: 0, lives: APP_CONFIG.START_LIVES, anger: 1, wave: 1,
      monsters: [], bullets: [], hazards: [], texts: [],
      spawnT: 1.2, giftT: 9 + Math.random() * 4, quizT: opts.boss ? 20 : APP_CONFIG.QUIZ_INTERVAL, quizInterval: opts.boss ? 20 : APP_CONFIG.QUIZ_INTERVAL, bossEvery: opts.boss ? 2 : 4, bossMode: !!opts.boss, hazT: 8,
      fireCd: 0, freeze: 0, triple: 0, rapid: 0, slow: 0, shake: 0, flash: 0, hurt: 0, inv: 0,
      kills: 0, combo: 0, quizStreak: 0, banner: null, dodged: 0, muzzle: 0, rage: 0, danger: 0, bossWave: 0, comboPop: 0, comboText: '',
    };
    targetX = 0; player.position.x = 0; keyDir = 0;
    mode = 'play';
    showBanner(opts.boss ? '👑 단원 평가 시작!' : '난이도 1', opts.boss ? '#ffe066' : '#ffffff');
    if (opts.boss) s.bossT = 18;   // 첫 대왕 괴물은 18초 뒤
  }
  function pause() { if (mode === 'play') mode = 'pause'; }
  function resume() { if (mode === 'pause') { mode = 'play'; last = performance.now(); } }
  function stop() { clearWorld(); mode = 'menu'; s = null; }
  const getState = () => s, getMode = () => mode;

  // ---------- 문제 결과 · 보상 ----------
  function onQuizResult(correct) {
    s.quizT = s.quizInterval;
    if (correct) {
      s.quizStreak++;
      const pts = 100 + Math.min(s.quizStreak - 1, 6) * 50;
      s.score += pts;
      addText(new THREE.Vector3(player.position.x, 4, 0), `정답 +${pts}`, '#ffe066', 34);
    } else {
      s.quizStreak = 0;
      s.anger = Math.min(3, s.anger + 0.3);
      s.rage = 8;
      s.spawnT = Math.min(s.spawnT, 0.3);
      showBanner('😡 분노 폭주! 괴물이 빨라졌어요', '#ff8a8a');
      Sound.rage();
    }
  }
  const REWARDS = {
    heal:   { icon: '❤️', name: '생명 +1', desc: '하트를 하나 더 받아요' },
    freeze: { icon: '🧊', name: '얼음 폭풍', desc: '괴물을 7초 동안 꽁꽁 얼려요' },
    triple: { icon: '🔱', name: '세 갈래 눈총', desc: '15초 동안 눈뭉치 3개씩 발사' },
    rapid:  { icon: '⚡', name: '연사 눈총', desc: '15초 동안 두 배 빠르게 발사' },
    slow:   { icon: '🐢', name: '진정 마법', desc: '괴물의 화를 크게 가라앉히고 10초 동안 느리게' },
    bomb:   { icon: '💥', name: '눈사태', desc: '화면의 괴물을 한 번에 날려요' },
  };
  function rewardChoices() {
    let keys = Object.keys(REWARDS);
    if (s.lives >= APP_CONFIG.MAX_LIVES) keys = keys.filter(k => k !== 'heal');
    if (s.anger <= 1.01) keys = keys.filter(k => k !== 'slow');
    else if (s.anger >= 1.6 && !keys.slice(0, 3).includes('slow')) keys.splice(2, 0, 'slow');
    keys.sort(() => Math.random() - 0.5);
    if (s.lives === 1 && !keys.slice(0, 3).includes('heal')) keys.unshift('heal');
    return keys.slice(0, 3).map(k => ({ key: k, ...REWARDS[k] }));
  }
  function applyReward(k) {
    if (k === 'heal') s.lives = Math.min(APP_CONFIG.MAX_LIVES, s.lives + 1);
    if (k === 'freeze') s.freeze = 7;
    if (k === 'triple') s.triple = 15;
    if (k === 'rapid') s.rapid = 15;
    if (k === 'slow') { s.anger = Math.max(1, s.anger - 0.6); s.rage = 0; s.slow = 10; }
    if (k === 'bomb') {
      s.combo = 0;
      s.flash = 0.4; s.shake = 0.4;
      for (const m of s.monsters) { if (m.gift || m.dying > 0) continue; kill(m, true); }
      Sound.boom();
    }
    showBanner(REWARDS[k].icon + ' ' + REWARDS[k].name + '!', '#bfe9ff');
  }

  // ---------- 효과 ----------
  function showBanner(text, color) { if (s) s.banner = { text, color, t: 2.2 }; }
  function addText(v3, text, color, size) { s.texts.push({ p: v3.clone(), text, color, size: size || 24, t: 1 }); }

  // ---------- 생성 ----------
  function spawnMonster(gift) {
    const t = s.t, r = Math.random();
    let hp = 1;
    if (!gift) {
      if (t > 35 && r < 0.35) hp = 2;
      if (t > 85 && r < 0.2) hp = 3;
      if (t > 150 && r < 0.12) hp = 5;
    }
    const m = makeMonster(gift, hp);
    m.x = -LANE + 0.8 + Math.random() * (LANE * 2 - 1.6);
    m.z = SPAWN_Z;
    m.vz = gift ? 2.6 : (2.4 + Math.min(t, 240) * 0.021) * (hp >= 3 ? 0.8 : 1) * (0.85 + Math.random() * 0.3);
    m.g.position.set(m.x, 0, m.z);
    scene.add(m.g);
    s.monsters.push(m);
  }

  function spawnBoss() {
    const hp = 18 + s.wave * 2;
    const m = makeMonster(false, hp, true);
    m.x = 0; m.z = SPAWN_Z; m.vz = 1.3 + s.wave * 0.04; m.sway = 0.6;
    m.g.position.set(0, 0, m.z);
    scene.add(m.g); s.monsters.push(m);
  }

  function fire() {
    const base = player.localToWorld(cannonTip.clone());
    const spread = s.triple > 0 ? [-0.11, 0, 0.11] : [0];
    for (const a of spread) {
      const mesh = new THREE.Mesh(shared.ball, shared.ballMat);
      mesh.position.copy(base); mesh.castShadow = quality < 2; scene.add(mesh);
      const tr = new THREE.Mesh(shared.trail, shared.trailMat); tr.rotation.y = -a; mesh.add(tr);
      s.bullets.push({ mesh, vx: Math.sin(a) * 40, vz: -Math.cos(a) * 40 });
    }
    s.fireCd = s.rapid > 0 ? 0.14 : 0.28;
    s.recoil = 0.07;     // 반동
    s.muzzle = 0.07;
    Sound.shoot();
  }

  function kill(m, bomb) {
    burst(m.g.position.x, m.h / 2 + 0.5, m.g.position.z, m.color, m.boss ? 80 : bomb ? 22 : 30, m.boss ? 1.8 : 1.1);
    if (m.gift) { m.dead = true; return; }
    m.dying = 0.14;
    s.kills++; if (!bomb) s.combo++;
    let pts = m.boss ? 300 + s.wave * 20 : 10 * m.maxHp + (bomb ? 0 : Math.min(s.combo, 20));
    if (!bomb && s.combo > 0 && s.combo % 5 === 0) {
      const bonus = s.combo * 5; pts += bonus;
      s.comboPop = 1.2; s.comboText = '🔥 ' + s.combo + ' 콤보! +' + bonus;
      Sound.combo();
    }
    s.score += pts;
    addText(new THREE.Vector3(m.g.position.x, m.h + 1.2, m.g.position.z), '+' + pts, m.boss ? '#ffe066' : '#ffffff', m.boss ? 40 : 22);
    if (m.boss) { s.flash = 0.3; s.shake = 0.5; showBanner('👑 대왕 눈괴물을 물리쳤다!', '#ffe066'); Sound.boom(); }
  }

  function hurtPlayer(by) {
    if (s.inv > 0) return false;
    s.lives--; s.hurt = 0.6; s.shake = 0.45; s.combo = 0; s.inv = 1.3;
    burst(player.position.x, 1.5, 0.3, 0xff8a8a, 20);
    Sound.hurt();
    if (by) addText(new THREE.Vector3(player.position.x, 3.8, 0), by, '#ff9b9b', 26);
    if (s.lives <= 0) { gameOver(); return true; }
    return false;
  }

  // ---------- 업데이트 ----------
  function update(dt) {
    s.t += dt;
    for (const k of ['freeze', 'triple', 'rapid', 'slow', 'shake', 'flash', 'hurt', 'inv', 'muzzle', 'comboPop', 'rage']) s[k] = Math.max(0, s[k] - dt);
    if (s.banner) { s.banner.t -= dt; if (s.banner.t <= 0) s.banner = null; }
    const wave = 1 + Math.floor(s.t / 30);
    if (wave !== s.wave) {
      s.wave = wave; Sound.wave();
      if (wave % s.bossEvery === 0 && s.bossWave !== wave) { s.bossWave = wave; spawnBoss(); showBanner('⚠ 대왕 눈괴물 등장!', '#ffb3c1'); }
      else showBanner('난이도 ' + wave + '! ⬆', '#ffffff');
    }
    if (s.bossT != null) { s.bossT -= dt; if (s.bossT <= 0) { s.bossT = null; spawnBoss(); showBanner('⚠ 대왕 눈괴물 등장!', '#ffb3c1'); } }
    muzzle.material.opacity = s.muzzle > 0 ? 0.9 : 0;

    s.quizT -= dt;
    if (s.quizT <= 0) { triggerQuiz('timer'); return; }

    // 플레이어 이동
    if (keyDir) targetX = Math.max(-LANE, Math.min(LANE, targetX + keyDir * 13 * dt));
    const dx = targetX - player.position.x;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), 16 * dt);
    player.position.x += step;
    const vel = dt > 0 ? step / dt : 0;
    player.rotation.z += (-vel * 0.012 - player.rotation.z) * Math.min(1, dt * 10);
    s.recoil = Math.max(0, (s.recoil || 0) - dt);
    s.walk = (s.walk || 0) + Math.abs(vel) * dt * 1.6;
    const body = player.userData.body, r = s.recoil / 0.07 * 0.05;
    body.scale.set(1 + r, 1 - r, 1);
    body.position.y = Math.abs(vel) > 0.5 ? Math.abs(Math.sin(s.walk)) * 0.15 : body.position.y * 0.8;
    const blink = s.inv > 0 && s.inv < 1.3 && Math.floor(s.inv * 12) % 2 === 0;
    player.visible = !blink;

    // 생성
    s.spawnT -= dt;
    if (s.spawnT <= 0) { spawnMonster(false); s.spawnT = Math.max(0.55, 2.1 - s.t * 0.011) * (0.7 + Math.random() * 0.6) * (s.rage > 0 ? 0.55 : 1); }
    s.giftT -= dt;
    if (s.giftT <= 0) { spawnMonster(true); s.giftT = 15 + Math.random() * 8; }
    // 발사 (자동)
    s.fireCd -= dt;
    if (s.fireCd <= 0) fire();
    for (const b of s.bullets) { b.mesh.position.x += b.vx * dt; b.mesh.position.z += b.vz * dt; if (b.mesh.position.z < SPAWN_Z - 6) b.dead = true; }

    // 괴물 이동
    const slowF = s.slow > 0 ? 0.55 : 1;
    let near = -999;
    for (const m of s.monsters) {
      if (m.dying > 0) {
        m.dying -= dt;
        const k = 1 - Math.max(0, m.dying) / 0.14;
        m.g.scale.set(1 + k * 0.6, 1 - k * 0.5, 1 + k * 0.6);
        if (m.dying <= 0) m.dead = true;
        continue;
      }
      m.hit = Math.max(0, m.hit - dt);
      m.squash = Math.max(0, m.squash - dt);
      const sq = m.squash / 0.12;
      m.g.scale.set(1 + sq * 0.18, 1 - sq * 0.18, 1 + sq * 0.18);
      if (!m.gift) near = Math.max(near, m.z + m.d / 2);
      const mat = m.g.userData.mat;
      if (s.freeze > 0) { mat.emissive.setHex(0x6fc6ff); mat.emissiveIntensity = 0.55; }
      else if (m.hit > 0) { mat.emissive.setHex(0xffffff); mat.emissiveIntensity = 0.9; }
      else if (!m.gift && s.rage > 0) { mat.emissive.setHex(0xff1020); mat.emissiveIntensity = 0.45 + 0.2 * Math.sin(clock * 14); }
      else if (!m.gift && s.anger > 1.05) { mat.emissive.setHex(0xff2030); mat.emissiveIntensity = Math.min(0.35, (s.anger - 1) * 0.2); }
      else { mat.emissiveIntensity = 0; }
      if (m.g.userData.brows) m.g.userData.brows.forEach(b => b.visible = s.anger > 1.05);
      if (m.g.userData.halo) { m.g.userData.halo.material.opacity = 0.3 + 0.25 * Math.sin(clock * 6); m.g.userData.q.position.y = m.h + 1.5 + Math.sin(clock * 3) * 0.2; }
      if (s.freeze > 0) continue;
      m.ph += dt * 7;
      m.z += m.vz * (m.gift ? 1 : s.anger * (s.rage > 0 ? 1.5 : 1)) * slowF * dt;
      m.x += Math.cos(m.ph * 0.18) * m.sway * dt;
      m.x = Math.max(-LANE, Math.min(LANE, m.x));
      m.g.position.set(m.x, Math.abs(Math.sin(m.ph)) * 0.18, m.z);
      m.g.rotation.z = Math.sin(m.ph) * 0.06 + (s.rage > 0 && !m.gift ? (Math.random() - 0.5) * 0.12 : 0);
      const [f1, f2] = m.g.userData.feet; f1.position.z = Math.sin(m.ph) * 0.2; f2.position.z = -Math.sin(m.ph) * 0.2;
      if (m.z + m.d / 2 >= LINE_Z) {
        m.dead = true;
        burst(m.x, 1, LINE_Z, m.gift ? 0xffd43b : 0xff8a8a, 18);
        if (!m.gift && hurtPlayer(m.boss ? '대왕 괴물 돌파!' : '방어선 돌파!')) return;
        if (m.boss && s.lives > 0) { s.inv = 0; if (hurtPlayer()) return; }
      }
    }

    // 방어선 위험도
    s.danger = Math.max(0, Math.min(1, (near - (LINE_Z - 14)) / 14));

    // 충돌: 눈뭉치 ↔ 괴물
    for (const b of s.bullets) {
      if (b.dead) continue;
      const p = b.mesh.position;
      for (const m of s.monsters) {
        if (m.dead || m.dying > 0) continue;
        if (Math.abs(p.x - m.g.position.x) < m.w / 2 + 0.3 && Math.abs(p.z - m.g.position.z) < m.d / 2 + 0.4 && p.y < m.h + 0.8) {
          b.dead = true; m.hp--; m.hit = 0.09; m.squash = 0.12;
          if (s.freeze <= 0) m.z -= m.boss ? 0.08 : 0.45;   // 뒤로 밀려남
          burst(p.x, p.y, p.z, 0xdff4ff, 5, 0.6);
          if (m.g.userData.hpBar) m.g.userData.hpBar.scale.x = m.w * Math.max(0, m.hp) / m.maxHp;
          if (m.hp <= 0) {
            kill(m);
            if (m.gift) { Sound.gift(); cleanup(); triggerQuiz('gift'); return; }
            Sound.pop();
          } else Sound.tick();
          break;
        }
      }
    }

    cleanup();
    for (const t of s.texts) { t.p.y += 1.6 * dt; t.t -= dt; }
    s.texts = s.texts.filter(t => t.t > 0);
  }

  function cleanup() {
    s.bullets = s.bullets.filter(b => { if (b.dead) scene.remove(b.mesh); return !b.dead; });
    s.monsters = s.monsters.filter(m => { if (m.dead) disposeGroup(m.g); return !m.dead; });
    s.hazards = s.hazards.filter(z => {
      if (z.dead) { scene.remove(z.ring, z.fill, z.obj); z.ring.material.dispose(); z.fill.material.dispose(); z.obj.geometry.dispose(); z.obj.material.dispose(); }
      return !z.dead;
    });
  }

  function triggerQuiz(reason) {
    mode = 'pause';
    if (hooks.onQuiz) hooks.onQuiz(reason);
  }
  function gameOver() {
    mode = 'over';
    if (hooks.onGameOver) hooks.onGameOver({ score: s.score, wave: s.wave, time: Math.round(s.t), kills: s.kills });
  }

  // ---------- 그리기 ----------
  function loop(now) {
    const raw = (now - last) / 1000 || 0;
    const dt = Math.min(0.05, raw);
    last = now;
    if (mode === 'play') update(dt);
    if ((mode === 'play' || mode === 'menu') && !document.hidden && raw < 0.25) watchFps(raw);
    if (mode !== 'pause' && mode !== 'over') { clock += dt; animateAmbient(dt); }
    render();
    if (hooks.onFrame) hooks.onFrame(s, mode);
    requestAnimationFrame(loop);
  }

  function animateAmbient(dt) {
    const a = snowPts.geometry.attributes.position, sp = snowPts.userData.speed;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - sp[i] * dt;
      if (y < 0) y += 30;
      a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(clock + i) * 0.3 * dt);
    }
    a.needsUpdate = true;
    updateParticles(dt);
    const dg = s && mode !== 'menu' ? s.danger : 0;
    lineMesh.material.color.setRGB(0.5 + dg * 0.5, 0.85 - dg * 0.6, 1 - dg * 0.7);
    lineMesh.material.opacity = 0.55 + 0.3 * Math.sin(clock * (3 + dg * 9));
    if (mode === 'menu') {
      player.position.x = Math.sin(clock * 0.6) * 3;
      player.rotation.z = -Math.cos(clock * 0.6) * 0.08;
    }
  }

  function faceCamera() {
    for (const b of billboards) b.rotation.y = Math.atan2(camera.position.x - b.position.x, camera.position.z - b.position.z);
    for (const L of shared.xmasLights) {
      const f = 0.85 + 0.15 * Math.sin(clock * 3 + L.ph) + 0.08 * Math.sin(clock * 11 + L.ph * 2);
      L.pl.intensity = 0.8 * f; L.halo.material.opacity = 0.2 * f;
    }
  }

  function render() {
    const base = camera.userData.base;
    camera.position.copy(base);
    if (mode === 'menu') camera.position.x = Math.sin(clock * 0.15) * 1.5;
    else if (s) camera.position.x = player.position.x * 0.25;
    if (s && s.shake > 0) { camera.position.x += (Math.random() - 0.5) * s.shake * 1.2; camera.position.y += (Math.random() - 0.5) * s.shake * 1.2; }
    camera.lookAt(camera.position.x * 0.6, 0.2, -17);
    faceCamera();
    renderer.render(scene, camera);
    drawFx();
  }

  function drawFx() {
    const g = fxc, W = innerWidth, H = innerHeight;
    g.clearRect(0, 0, W, H);
    if (!s || mode === 'menu') return;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const v = new THREE.Vector3();
    for (const t of s.texts) {
      v.copy(t.p).project(camera);
      if (v.z > 1) continue;
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      g.globalAlpha = Math.min(1, t.t * 1.5);
      g.font = `${t.size}px HakgyoDung, sans-serif`;
      g.lineWidth = 5; g.strokeStyle = 'rgba(13,27,61,0.75)'; g.strokeText(t.text, x, y);
      g.fillStyle = t.color; g.fillText(t.text, x, y);
    }
    g.globalAlpha = 1;
    if (s.banner) {
      g.globalAlpha = Math.min(1, s.banner.t * 2);
      const fs = Math.min(60, W * 0.07);
      g.font = `${fs}px HakgyoDung, sans-serif`;
      g.lineWidth = 9; g.strokeStyle = 'rgba(13,27,61,0.8)'; g.strokeText(s.banner.text, W / 2, H * 0.3);
      g.fillStyle = s.banner.color; g.fillText(s.banner.text, W / 2, H * 0.3);
      g.globalAlpha = 1;
    }
    if (s.hurt > 0) {
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      gr.addColorStop(0, 'rgba(255,40,60,0)'); gr.addColorStop(1, `rgba(255,40,60,${s.hurt * 0.8})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (s.rage > 0 && mode === 'play') {
      const a = Math.min(1, s.rage / 2) * (0.18 + 0.1 * Math.sin(clock * 12));
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
      gr.addColorStop(0, 'rgba(255,30,50,0)'); gr.addColorStop(1, 'rgba(255,30,50,' + a + ')');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (s.danger > 0.35 && mode === 'play') {
      const a = (s.danger - 0.35) * 0.55 * (0.7 + 0.3 * Math.sin(clock * 10));
      const gr = g.createLinearGradient(0, H, 0, H * 0.55);
      gr.addColorStop(0, 'rgba(255,50,70,' + a + ')'); gr.addColorStop(1, 'rgba(255,50,70,0)');
      g.fillStyle = gr; g.fillRect(0, H * 0.55, W, H * 0.45);
    }
    if (s.combo >= 3) {
      const fs = Math.min(34, W * 0.045);
      g.font = fs + 'px HakgyoDung, sans-serif'; g.textAlign = 'right';
      g.lineWidth = 6; g.strokeStyle = 'rgba(13,27,61,0.7)';
      const txt = '콤보 ×' + s.combo;
      g.strokeText(txt, W - 18, H * 0.42); g.fillStyle = s.combo >= 10 ? '#ffb347' : '#ffffff'; g.fillText(txt, W - 18, H * 0.42);
      g.textAlign = 'center';
    }
    if (s.comboPop > 0) {
      const k = s.comboPop / 1.2, fs = Math.min(48, W * 0.06) * (1 + (k > 0.85 ? (k - 0.85) * 2 : 0));
      g.globalAlpha = Math.min(1, s.comboPop * 2);
      g.font = fs + 'px HakgyoDung, sans-serif';
      g.lineWidth = 8; g.strokeStyle = 'rgba(120,30,0,0.75)'; g.strokeText(s.comboText, W / 2, H * 0.5);
      g.fillStyle = '#ffd25a'; g.fillText(s.comboText, W / 2, H * 0.5);
      g.globalAlpha = 1;
    }
    if (s.freeze > 0) { g.fillStyle = 'rgba(150,215,255,0.12)'; g.fillRect(0, 0, W, H); }
    if (s.flash > 0) { g.fillStyle = `rgba(255,255,255,${s.flash * 1.8})`; g.fillRect(0, 0, W, H); }
  }

  // 점검용: 시간을 강제로 진행 (화면이 백그라운드일 때 테스트)
  function _step(sec) { for (let i = 0; i < sec * 30 && mode === 'play'; i++) { update(1 / 30); clock += 1 / 30; animateAmbient(1 / 30); } render(); }
  function _move(x) { targetX = x; }
  function _quality() { return quality; }

  return { init, start, pause, resume, stop, getState, getMode, onQuizResult, rewardChoices, applyReward, _step, _move, _quality, _spawnBoss: () => spawnBoss() };
})();

// ===== 효과음 (파일 없이 코드로 만든 소리) =====
const Sound = (() => {
  let ac = null, on = Store.get('sound_on', true);
  function unlock() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); }
  function tone(freq, dur, type, vol, slide) {
    if (!on || !ac) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
  }
  return {
    unlock,
    isOn: () => on,
    toggle() { on = !on; Store.set('sound_on', on); unlock(); return on; },
    shoot() { tone(520, 0.06, 'triangle', 0.03, 320); },
    tick() { tone(300, 0.05, 'square', 0.04); },
    pop() { tone(700, 0.12, 'sine', 0.1, 1200); },
    hurt() { tone(180, 0.3, 'sawtooth', 0.1, 80); },
    thud() { tone(90, 0.25, 'sine', 0.18, 45); },
    gift() { [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.1), i * 70)); },
    wave() { tone(440, 0.15, 'triangle', 0.08, 660); },
    boom() { tone(120, 0.5, 'sawtooth', 0.15, 40); },
    correct() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.12), i * 90)); },
    wrong() { tone(300, 0.2, 'square', 0.08, 200); setTimeout(() => tone(200, 0.3, 'square', 0.08, 120), 180); },
    click() { tone(800, 0.04, 'sine', 0.06); },
    rage() { tone(110, 0.5, 'sawtooth', 0.12, 70); setTimeout(() => tone(95, 0.4, 'sawtooth', 0.1, 60), 220); },
    combo() { [784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'square', 0.06), i * 60)); },
  };
})();
