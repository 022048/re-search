// 사건 03 — 클리어 호수 (절차적 3D). 새벽 호수, 살포선, 논병아리, 물속 플랑크톤과 물고기.
import * as THREE from 'three';
import { skyGradient, softDot } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const LAKE_R = 15;

function waterNormal() {
  const N = 256, d = new Uint8Array(N * N * 4), r = rnd(11);
  const h = new Float32Array(N * N);
  for (let o = 0; o < 4; o++) {
    const f = 2 ** (o + 2), a = 1 / (o + 1), ph = [r() * 6, r() * 6, r() * 6, r() * 6];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += a * (Math.sin((x / N) * Math.PI * 2 * f + ph[0]) * Math.sin((y / N) * Math.PI * 2 * f + ph[1]) + 0.5 * Math.sin(((x + y) / N) * Math.PI * 2 * f + ph[2]));
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const nx = -dx * 0.9, ny = -dy * 0.9, nz = 1, l = Math.hypot(nx, ny, nz);
    const i = (y * N + x) * 4; d[i] = ((nx / l) * 0.5 + 0.5) * 255; d[i + 1] = ((ny / l) * 0.5 + 0.5) * 255; d[i + 2] = ((nz / l) * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true; t.colorSpace = THREE.NoColorSpace; return t;
}

function terrain() {
  const S = 140, seg = 160, g = new THREE.PlaneGeometry(S, S, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x * 1.0, z * 0.85);
    const bump = 0.6 * Math.sin(x * 0.21 + 1) * Math.cos(z * 0.17) + 0.4 * Math.sin(x * 0.53 + z * 0.41) + 0.25 * Math.sin(x * 1.3) * Math.cos(z * 1.1);
    let y;
    if (r < LAKE_R) y = -2.2 + 1.6 * (r / LAKE_R) ** 6;
    else { const t = Math.min((r - LAKE_R) / 26, 1); y = -0.6 + 0.9 * Math.min((r - LAKE_R) / 2, 1) + t * t * 11 * (0.7 + 0.5 * Math.sin(Math.atan2(z, x) * 3 + 1)) + bump * (0.3 + t); }
    p.setY(i, y);
    if (y < 0.05) c.set(0x7d7452); else if (y < 0.6) c.set(0x6f7f45); else if (y < 4) c.set(0x4f6a35).lerp(new THREE.Color(0x6b7b3f), (Math.sin(x * 0.7) * 0.5 + 0.5) * 0.5); else c.set(0x3b4f2f).lerp(new THREE.Color(0x6a6552), Math.min((y - 4) / 8, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 0.35 }));
}

/** 오리 한 마리. 부드러운 둥근 몸에 어두운 갈색 윤곽선을 둘러 손그림 느낌을 낸다. 앞쪽은 +x. */
export function makeDuck(seed) {
  const g = new THREE.Group(), r = rnd(seed * 7919); r(); r(); r();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.85, emissive: 0x000000 });
  const wingM = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.85 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.4 });
  const inkM = new THREE.MeshBasicMaterial({ color: 0x4a3320, side: THREE.BackSide });
  const part = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, outline = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m);
    if (outline) { const o = new THREE.Mesh(geo, inkM); o.position.copy(m.position); o.scale.set(sx * 1.07, sy * 1.07, sz * 1.07); g.add(o); }
    return m;
  };
  const S = new THREE.SphereGeometry(1, 24, 18);
  part(S, yellow, 0, 0.12, 0, 0.36, 0.27, 0.27);                     // 몸
  part(S, wingM, -0.02, 0.15, 0.2, 0.2, 0.12, 0.05);                  // 날개 (한쪽)
  part(S, wingM, -0.02, 0.15, -0.2, 0.2, 0.12, 0.05);
  part(S, yellow, 0.3, 0.38, 0, 0.21, 0.2, 0.2);                      // 머리
  part(S, orange, 0.5, 0.33, 0, 0.12, 0.045, 0.1);                    // 부리
  part(S, dark, 0.42, 0.43, 0.13, 0.025, 0.025, 0.025, false); part(S, dark, 0.42, 0.43, -0.13, 0.025, 0.025, 0.025, false);   // 눈
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.022, 8, 28), new THREE.MeshStandardMaterial({ color: 0x3b6ea5, roughness: 0.6 }));
  strap.position.set(0.28, 0.48, 0); strap.rotation.set(0, Math.PI / 2, 0.25); g.add(strap);                                   // 보안경 끈
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: 0xcdeaf6, roughness: 0.15, metalness: 0.1 }));
  lens.position.set(0.37, 0.57, 0); lens.scale.set(0.6, 1, 1.2); g.add(lens);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { ang: r() * 6.28, rad: 3 + r() * 8, spd: (0.01 + r() * 0.02) * (r() > 0.5 ? 1 : -1), ph: r() * 6, mat: yellow };
  return g;
}
export const makeGrebe = makeDuck;

function makeBoat() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d5cb, roughness: 0.55, metalness: 0.1 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.6, metalness: 0.5 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 1.1), white); hull.position.y = 0.12;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 4), white); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.scale.set(1, 1, 0.5 / 0.55); bow.position.set(1.8, 0.12, 0); bow.scale.set(1.0, 1.0, 1.0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.8), new THREE.MeshStandardMaterial({ color: 0x8c9aa2, roughness: 0.4, metalness: 0.2 })); cabin.position.set(-0.2, 0.6, 0);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x7a3320, roughness: 0.5, metalness: 0.5 })); tank.rotation.x = Math.PI / 2; tank.position.set(-1.0, 0.55, 0);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 8), dark); boom.rotation.x = Math.PI / 2; boom.position.set(-1.3, 0.35, 0);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.25), dark); motor.position.set(-1.5, 0.3, 0);
  [hull, bow, cabin, tank, boom, motor].forEach((m) => { m.castShadow = true; g.add(m); });
  return g;
}

export function createLakeScene(engine) {
  const scene = new THREE.Scene();
  const sky = skyGradient([[0, '#8fb2cc'], [0.45, '#dfd2b8'], [1, '#f3d9aa']]);
  scene.background = sky; scene.fog = new THREE.FogExp2(0xdbe8ee, 0.01);
  if (engine.env) scene.environment = engine.env;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  const sun = new THREE.DirectionalLight(0xffe2b0, 2.6); sun.position.set(-22, 16, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 }); sun.shadow.bias = -0.0006; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbcd2e6, 0x4a5a3a, 0.9));

  const ground = terrain(); ground.receiveShadow = true; scene.add(ground);
  const nm = waterNormal();
  const water = new THREE.Mesh(new THREE.CircleGeometry(LAKE_R + 1.2, 96), new THREE.MeshPhysicalMaterial({ color: 0x2a5a63, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82, normalMap: nm, normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 1.2, clearcoat: 0.6, clearcoatRoughness: 0.1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0; water.scale.set(1, 0.85, 1); scene.add(water);

  /* 갈대 */
  const reedGeo = new THREE.ConeGeometry(0.03, 1.1, 5); reedGeo.translate(0, 0.55, 0);
  const NR = 700, reeds = new THREE.InstancedMesh(reedGeo, new THREE.MeshStandardMaterial({ color: 0x8c8a4a, roughness: 0.9 }), NR), dm = new THREE.Object3D(), rr = rnd(5);
  for (let i = 0; i < NR; i++) { const a = rr() * 6.283, rad = LAKE_R * (0.93 + rr() * 0.07) + (rr() - 0.3) * 0.8; dm.position.set(Math.cos(a) * rad, -0.05, Math.sin(a) * rad * 0.85); dm.rotation.set((rr() - 0.5) * 0.3, 0, (rr() - 0.5) * 0.3); dm.scale.set(1, 0.7 + rr() * 0.9, 1); dm.updateMatrix(); reeds.setMatrixAt(i, dm.matrix); }
  scene.add(reeds);

  /* 나무 */
  const trunkG = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6), leafG = new THREE.ConeGeometry(0.6, 1.8, 7);
  const NT = 160, trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }), NT), leaves = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0x2f4a2c, roughness: 0.95 }), NT), tr = rnd(9);
  const hAt = (x, z) => { const r = Math.hypot(x, z * (1 / 0.85)) ; const t = Math.min((r - LAKE_R) / 26, 1); return -0.6 + 0.9 * Math.min((r - LAKE_R) / 2, 1) + t * t * 11 * 0.7; };
  for (let i = 0; i < NT; i++) { const a = tr() * 6.283, rad = LAKE_R + 3 + tr() * 22, x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.85, y = hAt(x, z); const s = 0.9 + tr() * 1.4;
    dm.rotation.set(0, 0, 0); dm.scale.setScalar(s); dm.position.set(x, y + 0.4 * s, z); dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix);
    dm.position.set(x, y + 1.5 * s, z); dm.updateMatrix(); leaves.setMatrixAt(i, dm.matrix); }
  scene.add(trunks, leaves);

  /* 플랑크톤 (물속 점) */
  const NP = 900, pp = new Float32Array(NP * 3), pr = rnd(21);
  for (let i = 0; i < NP; i++) { const a = pr() * 6.283, rad = Math.sqrt(pr()) * (LAKE_R - 1); pp[i * 3] = Math.cos(a) * rad; pp[i * 3 + 1] = -0.2 - pr() * 1.4; pp[i * 3 + 2] = Math.sin(a) * rad * 0.85; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const plankMat = new THREE.PointsMaterial({ size: 0.07, map: softDot(), color: 0x9be0a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const plankton = new THREE.Points(pg, plankMat); scene.add(plankton);

  /* 물고기: 작은 것·큰 것 */
  const fishes = [];
  const fishGeo = new THREE.SphereGeometry(0.5, 14, 10);
  const mkFish = (len, color, seed, depth) => {
    const g = new THREE.Group(), r = rnd(seed * 7919); r(); r(); r();
    const body = new THREE.Mesh(fishGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3, emissive: color, emissiveIntensity: 0 })); body.scale.set(len, len * 0.32, len * 0.2);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(len * 0.18, len * 0.4, 4), body.material); tail.rotation.z = Math.PI / 2; tail.position.x = -len * 0.55; tail.scale.set(1, 1, 0.3);
    g.add(body, tail); g.userData = { ang: r() * 6.28, rad: 1 + r() * 9, spd: (0.05 + r() * 0.08) * (r() > 0.5 ? 1 : -1), depth, ph: r() * 6, mat: body.material }; scene.add(g); return g;
  };
  const small = [], big = [];
  for (let i = 0; i < 16; i++) small.push(mkFish(0.34, 0xf3b08a, 100 + i, -0.5 - (i % 4) * 0.25));
  for (let i = 0; i < 5; i++) big.push(mkFish(0.9, 0x7fb3c8, 200 + i, -1.3 - (i % 3) * 0.2));
  fishes.push(...small, ...big);

  /* 논병아리 */
  const NG = 14, grebes = Array.from({ length: NG }, (_, i) => { const g = makeDuck(300 + i); g.position.y = 0.05; scene.add(g); return g; });

  /* 살포선 + 분무 */
  const boat = makeBoat(); scene.add(boat);
  const NS = 260, sp = new Float32Array(NS * 3), sv = new Float32Array(NS * 3), sl = new Float32Array(NS);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sprayMat = new THREE.PointsMaterial({ size: 0.12, map: softDot(), color: 0xf2f1e6, transparent: true, opacity: 0.75, depthWrite: false });
  const spray = new THREE.Points(sg, sprayMat); spray.frustumCulled = false; scene.add(spray);
  const sr = rnd(77);

  const S = { spray: 0, sprayT: 0, boatA: 0.6, grebe: 1, grebeT: 1, hl: -1, tt: 0 };
  const k = (a, b, s, dt) => a + (b - a) * (1 - Math.exp(-s * dt));
  const api = {
    setSpray(on) { S.sprayT = on ? 1 : 0; },
    setGrebes(f) { S.grebeT = Math.min(Math.max(f, 0), 1); },
    /** 먹이사슬 강조: 0 물, 1 플랑크톤, 2 작은 물고기, 3 큰 물고기, 4 논병아리, -1 없음 */
    highlight(i) { S.hl = i; },
    reset() { S.hl = -1; S.sprayT = 0; S.grebeT = 1; },
  };

  const tmp = new THREE.Vector3();
  const update = (dt, t) => {
    S.tt = t;
    S.spray = k(S.spray, S.sprayT, 3, dt); S.grebe = k(S.grebe, S.grebeT, 1.5, dt);
    nm.offset.x = t * 0.004; nm.offset.y = t * 0.003;
    // 보트: 호수를 느리게 돈다
    S.boatA += dt * (0.05 + 0.06 * S.spray);
    boat.position.set(Math.cos(S.boatA) * 8.5, 0.1 + Math.sin(t * 1.3) * 0.03, Math.sin(S.boatA) * 7.2);
    boat.rotation.y = Math.atan2(-Math.cos(S.boatA), -Math.sin(S.boatA)); boat.rotation.z = Math.sin(t * 1.1) * 0.02;
    // 분무 입자
    const T = V(-Math.sin(S.boatA), 0, Math.cos(S.boatA)), back = V(-T.x, 0, -T.z);
    const nz = tmp.set(Math.cos(S.boatA), 0, Math.sin(S.boatA));
    for (let i = 0; i < NS; i++) {
      sl[i] -= dt;
      if (sl[i] <= 0) {
        if (S.spray > 0.2 && sr() < S.spray) {
          const side = sr() > 0.5 ? 1 : -1;
          sp[i * 3] = boat.position.x + back.x * 1.4 + nz.x * side * (0.3 + sr() * 1.2); sp[i * 3 + 1] = 0.5; sp[i * 3 + 2] = boat.position.z + back.z * 1.4 + nz.z * side * (0.3 + sr() * 1.2);
          sv[i * 3] = nz.x * side * (0.6 + sr()) + back.x * 0.5; sv[i * 3 + 1] = 1.4 + sr() * 1.2; sv[i * 3 + 2] = nz.z * side * (0.6 + sr()) + back.z * 0.5; sl[i] = 0.9 + sr() * 0.6;
        } else { sp[i * 3 + 1] = -50; sl[i] = 0.3 + sr() * 0.4; sv[i * 3 + 1] = 0; }
      } else { sv[i * 3 + 1] -= dt * 3.2; sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt; if (sp[i * 3 + 1] < 0) sl[i] = 0; }
    }
    sg.attributes.position.needsUpdate = true;
    // 논병아리
    grebes.forEach((g, i) => {
      const u = g.userData, alive = i < Math.round(S.grebe * NG);
      u.ang += u.spd * dt; const x = Math.cos(u.ang) * u.rad, z = Math.sin(u.ang) * u.rad * 0.85;
      g.position.set(x, 0.03 + Math.sin(t * 1.6 + u.ph) * 0.012, z); g.rotation.y = Math.atan2(-Math.cos(u.ang), -Math.sin(u.ang)) + (u.spd > 0 ? 0 : Math.PI);
      const s = k(g.scale.x, alive ? 1 : 0.001, 3, dt); g.scale.setScalar(Math.max(s, 0.001)); g.visible = s > 0.02;
      const e = S.hl === 4 ? 0.5 + 0.5 * Math.sin(t * 5) : 0; u.mat.emissive.setRGB(e * 0.6, e * 0.4, e * 0.05);
    });
    // 물고기
    fishes.forEach((f) => {
      const u = f.userData; u.ang += u.spd * dt; const x = Math.cos(u.ang) * u.rad, z = Math.sin(u.ang) * u.rad * 0.85;
      f.position.set(x, u.depth + Math.sin(t * 0.8 + u.ph) * 0.1, z); f.rotation.y = Math.atan2(-Math.cos(u.ang), -Math.sin(u.ang)) + (u.spd > 0 ? 0 : Math.PI);
      f.children[1].rotation.y = Math.sin(t * 6 + u.ph) * 0.4;
      const on = (S.hl === 2 && small.includes(f)) || (S.hl === 3 && big.includes(f)); u.mat.emissiveIntensity = on ? 0.6 + 0.4 * Math.sin(t * 5) : 0;
    });
    plankMat.color.set(S.hl === 1 ? 0xffe066 : 0x9be0a0); plankMat.size = S.hl === 1 ? 0.12 : 0.07; plankMat.opacity = S.hl === 1 ? 0.95 : 0.5;
    water.material.color.set(S.hl === 0 ? 0x3a8aa0 : 0x2a5a63);
  };

  const addLabels = () => {
    const L = (h, x, y, z) => engine.addLabel(h, V(x, y, z));
    L('<b>살포선</b> 약제를 호수에 뿌린다', 8.5, 1.6, 0); L('<b>논병아리</b> 물고기를 먹고 산다', -5.5, 0.9, 2.5);
    L('<b>플랑크톤</b> 물속의 작은 생물', 3, -0.5, 6); L('<b>큰 물고기</b>', -2, -1.2, -2);
  };

  return {
    scene, camera, api, update,
    bloom: 0.15, bloomThreshold: 0.95, exposure: 1.15, vignette: 0.1, warm: 0.1,
    limits: { minDist: 1.5, maxDist: 42, minPolar: 0.35, maxPolar: 1.52, pan: true },
    views: {
      overview: { pos: [-2, 9, 27], target: [0, 0.5, 0] },
      boat: { pos: [9, 2.6, 12.5], target: [8, 0.5, 2] },
      grebes: { pos: [-1, 1.5, 11], target: [-3, 0.2, 3] },
      under: { pos: [-1.6, 0.35, 7.5], target: [-3, -0.8, 1.5] },
    },
    startView: 'overview',
    attachLabels: addLabels,
    reset() { api.reset(); },
  };
}
