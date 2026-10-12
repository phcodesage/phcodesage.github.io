// The voyage: a scroll-driven scene between the garden and the work.
// A small wooden boat sails through a floating torii toward Mount Fuji while the camera
// circles it, Apple-product-page style. Scroll position (the section's --p) drives the
// boat and camera; time only drives the water, the bobbing, and the sail.
import { THREE, createToneMap, createOutliner, createTorii, cssRGB } from './scene-kit.js?v=20261013';

const section = document.querySelector('[data-voyage]');
const canvas = section?.querySelector('.voyage-canvas');

// Camera keyframes, relative to the boat: distance, angle around it (0 = ahead of the bow), height angle.
const SHOTS = [
  { p: 0.0, r: 24, az: 0, el: 7 },
  { p: 0.2, r: 11, az: -22, el: 9 },
  { p: 0.42, r: 7, az: -100, el: 7 },
  { p: 0.62, r: 7.6, az: -200, el: 20 },
  { p: 0.82, r: 12, az: -285, el: 58 },
  { p: 1.0, r: 21, az: -350, el: 18 },
];
const TORII_AT = 0.3;

function boatPath(p, out) {
  const z = -22 + p * 30;
  const x = Math.sin((p - TORII_AT) * Math.PI * 1.6) * 2.6;
  return out.set(x, 0, z);
}

function start() {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 700px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(small ? 50 : 38, 1, 0.1, 260);
  const toneMap = createToneMap();
  const outlineMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  const outline = createOutliner(outlineMaterial);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 1.4);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.set(-5, 9, -6);
  scene.add(hemi, sunLight);

  // Water: flat cel-painted bands, drifting highlight streaks, a V-shaped wake, and tap ripples.
  const MAX_RIPPLES = 8;
  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0));
  let rippleIndex = 0;
  let time = 0;
  const uniforms = {
    uTime: { value: 0 },
    uNear: { value: new THREE.Vector3() },
    uFar: { value: new THREE.Vector3() },
    uFoam: { value: new THREE.Vector3() },
    uGlint: { value: new THREE.Vector3() },
    uBoat: { value: new THREE.Vector2() },
    uDir: { value: new THREE.Vector2(0, 1) },
    uSun: { value: new THREE.Vector2(0, -150) },
    uRipples: { value: ripples },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uNear, uFar, uFoam, uGlint;
        uniform vec2 uBoat, uDir, uSun;
        uniform vec4 uRipples[${MAX_RIPPLES}];
        varying vec3 vWorld;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }

        void main() {
          vec2 p = vWorld.xz;
          float dist = length(vWorld - cameraPosition);
          vec3 col = mix(uNear, uFar, smoothstep(4.0, 70.0, dist));

          // A slow swell, painted in two flat tones.
          float swell = sin(p.x * 0.35 + uTime * 0.5) * sin(p.y * 0.45 - uTime * 0.4) + noise(p * 0.15) * 0.6;
          col *= 1.0 - step(0.75, swell) * 0.07;

          // Anime highlight streaks, stretched across the current.
          float fade = 1.0 - smoothstep(18.0, 75.0, dist);
          // Contour lines of drifting noise, kept a constant pixel width so they read as inked strokes.
          float n = noise(vec2(p.x * 0.32 + uTime * 0.12, p.y * 1.7 - uTime * 0.22));
          float m = noise(vec2(p.x * 0.7 - uTime * 0.08, p.y * 3.4 + uTime * 0.18));
          float lineN = 1.0 - smoothstep(0.0, fwidth(n) * 1.4, abs(n - 0.78));
          float lineM = 1.0 - smoothstep(0.0, fwidth(m) * 1.1, abs(m - 0.84));
          float dashes = step(0.45, noise(p * 0.5 + vec2(uTime * 0.05, 0.0)));
          float streak = (lineN + lineM * 0.7) * dashes;
          col = mix(col, uFoam, clamp(streak, 0.0, 1.0) * 0.8 * fade);

          // The wake: two foam lines spreading behind the boat, and churned water close to the stern.
          vec2 rel = p - uBoat;
          vec2 side = vec2(-uDir.y, uDir.x);
          float behind = -dot(rel, uDir);
          float across = dot(rel, side);
          if (behind > -1.9) {
            float spread = 0.62 + max(behind, 0.0) * 0.3;
            float edge = abs(abs(across) - spread);
            float wake = (1.0 - smoothstep(0.0, 0.1 + max(behind, 0.0) * 0.025, edge)) * (1.0 - smoothstep(1.0, 15.0, behind));
            float churn = (1.0 - smoothstep(0.0, 0.42 + max(behind, 0.0) * 0.06, abs(across))) * (1.0 - smoothstep(0.0, 6.0, behind))
              * step(0.0, behind) * step(0.5, noise(rel * 5.0 + vec2(0.0, uTime * 3.0)));
            col = mix(col, uFoam, clamp(wake * 0.9 + churn * 0.7, 0.0, 1.0));
          }

          // Taps on the water ring outward.
          for (int j = 0; j < ${MAX_RIPPLES}; j++) {
            vec4 r = uRipples[j];
            float age = uTime - r.z;
            if (age < 0.0 || age > 4.0) continue;
            float ring = abs(length(p - r.xy) - age * 1.7);
            float a = (1.0 - smoothstep(0.0, 0.07 + age * 0.03, ring)) * exp(-age * 0.85) * r.w;
            ring = abs(length(p - r.xy) - age * 1.1);
            a += (1.0 - smoothstep(0.0, 0.05 + age * 0.02, ring)) * exp(-age * 1.2) * r.w * 0.6;
            col = mix(col, uFoam, clamp(a, 0.0, 1.0));
          }

          // A glittering path toward the sun or moon.
          vec2 toSun = normalize(uSun - cameraPosition.xz);
          vec2 fromCam = p - cameraPosition.xz;
          float along = dot(fromCam, toSun);
          float off = abs(fromCam.x * toSun.y - fromCam.y * toSun.x);
          float glint = step(0.0, along) * exp(-off * off / (2.0 + along * 0.08)) * step(0.72, noise(vec2(p.x * 2.6, p.y * 0.9 + uTime * 0.8)));
          col = mix(col, uGlint, glint * smoothstep(6.0, 30.0, along) * 0.9);

          float alpha = 1.0 - smoothstep(60.0, 110.0, dist);
          gl_FragColor = vec4(col, alpha);
        }`,
    }),
  );
  scene.add(water);
  function addRipple(x, z, strength) {
    ripples[rippleIndex].set(x, z, time, strength);
    rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
  }

  // The floating torii the boat sails through.
  const toriiRed = new THREE.MeshToonMaterial({ gradientMap: toneMap });
  const toriiInk = new THREE.MeshToonMaterial({ gradientMap: toneMap });
  const torii = createTorii(toriiRed, toriiInk, outline);
  const toriiSpot = boatPath(TORII_AT, new THREE.Vector3());
  torii.scale.setScalar(2.6);
  torii.position.set(toriiSpot.x, -0.45, toriiSpot.z);
  scene.add(torii);

  // Mount Fuji and two softer ridges, far across the water.
  const mountains = new THREE.Group();
  const fuji = new THREE.Mesh(fujiGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
  fuji.scale.set(30, 17, 30);
  fuji.position.set(10, -1, -150);
  const ridgeMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });
  const ridgeA = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 7, 1), ridgeMaterial);
  ridgeA.scale.set(34, 9, 16);
  ridgeA.position.set(-42, 2.5, -132);
  const ridgeB = ridgeA.clone();
  ridgeB.scale.set(26, 7, 14);
  ridgeB.position.set(48, 2, -122);
  mountains.add(fuji, ridgeA, ridgeB);
  scene.add(mountains);

  // Sun by day, moon by night: a bright disc with a soft halo.
  const glowTexture = radialTexture();
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, opacity: 0.35, depthWrite: false }));
  sunCore.scale.setScalar(16);
  sunHalo.scale.setScalar(52);
  scene.add(sunHalo, sunCore);

  const boat = createBoat(toneMap, outline);
  scene.add(boat.group);

  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    uniforms.uNear.value.set(...cssRGB(css, '--water-near'));
    uniforms.uFar.value.set(...cssRGB(css, '--water-far'));
    uniforms.uFoam.value.set(...cssRGB(css, '--water-foam'));
    uniforms.uGlint.value.set(...cssRGB(css, '--water-glint'));
    toriiRed.color.set(css.getPropertyValue('--garden-torii').trim());
    toriiInk.color.set(css.getPropertyValue('--garden-outline').trim());
    outlineMaterial.color.set(css.getPropertyValue('--garden-outline').trim());
    ridgeMaterial.color.set(css.getPropertyValue('--ridge').trim());
    paintFuji(fuji.geometry, css.getPropertyValue('--fuji').trim(), css.getPropertyValue('--fuji-snow').trim());
    sunBase.set(css.getPropertyValue('--sun-core').trim());
    const dark = document.documentElement.dataset.theme === 'dark';
    hemi.color.set(dark ? 0x7f95d8 : 0xf4f7ff);
    hemi.groundColor.set(dark ? 0x0c1230 : 0x7d8db5);
    hemi.intensity = dark ? 1.0 : 1.5;
    sunLight.color.set(dark ? 0xc9d4ff : 0xfff0dc);
    sunLight.intensity = dark ? 1.2 : 2.3;
    boat.lantern.intensity = dark ? 4.5 : 0.8;
    boat.setGlow(dark ? 1 : 0.35);
    dayToDusk = !dark;
  }
  let dayToDusk = true;
  const sunBase = new THREE.Color();
  readPalette();

  // Scroll progress is eased so the camera glides rather than snaps.
  let target = reduceMotion ? 0.42 : readProgress();
  let progress = target;
  function readProgress() {
    const value = parseFloat(section.style.getPropertyValue('--p'));
    return Number.isFinite(value) ? value : 0;
  }

  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const boatPos = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const heading = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const sunColor = new THREE.Color();
  const sunDusk = new THREE.Color('#ff8a3d');

  function frame(dt) {
    progress += (target - progress) * Math.min(1, dt * 5);
    const p = progress;

    boatPath(p, boatPos);
    boatPath(Math.min(p + 0.01, 1.01), ahead);
    heading.subVectors(ahead, boatPos).setY(0).normalize();
    const bob = reduceMotion ? 0 : time;
    boat.group.position.set(boatPos.x, Math.sin(bob * 1.4) * 0.05, boatPos.z);
    boat.group.rotation.set(Math.sin(bob * 1.1) * 0.025, Math.atan2(-heading.x, -heading.z), Math.sin(bob * 0.9) * 0.045);
    boat.update(bob);
    uniforms.uBoat.value.set(boatPos.x, boatPos.z);
    uniforms.uDir.value.set(heading.x, heading.z);

    // The camera circles the boat through the keyframed shots.
    const shot = sampleShots(p);
    const az = THREE.MathUtils.degToRad(shot.az + look.x * 8);
    const el = THREE.MathUtils.degToRad(Math.max(shot.el + look.y * -4, 2));
    const baseAngle = Math.atan2(heading.x, heading.z);
    const flat = Math.cos(el) * shot.r;
    camera.position.set(
      boatPos.x + Math.sin(baseAngle + az) * flat,
      Math.sin(el) * shot.r + 0.8,
      boatPos.z + Math.cos(baseAngle + az) * flat,
    );
    focus.set(boatPos.x, 1.1, boatPos.z);
    camera.lookAt(focus);

    // By day the sun sinks and warms toward dusk as the voyage ends.
    const sunset = dayToDusk ? THREE.MathUtils.smoothstep(p, 0.45, 1) : 0;
    const sunY = dayToDusk ? 34 - sunset * 26 : 30;
    sunCore.position.set(-26, sunY, -170);
    sunHalo.position.copy(sunCore.position);
    sunColor.copy(sunBase).lerp(sunDusk, sunset * 0.8);
    sunCore.material.color.copy(sunColor);
    sunHalo.material.color.copy(sunColor);
    uniforms.uSun.value.set(-26, -170);

    uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // Interaction: the camera leans toward the pointer, and taps send rings across the water.
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();
  if (!reduceMotion) {
    const stage = section.querySelector('.voyage-stage');
    stage.addEventListener('pointermove', (event) => {
      look.tx = (event.clientX / innerWidth) * 2 - 1;
      look.ty = (event.clientY / innerHeight) * 2 - 1;
    });
    stage.addEventListener('pointerdown', (event) => {
      if (event.target.closest('a, button')) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) addRipple(hit.x, hit.z, 1);
    });
  }

  let running = false;
  let rafId = 0;
  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    target = readProgress();
    look.x += (look.tx - look.x) * Math.min(1, dt * 3);
    look.y += (look.ty - look.y) * Math.min(1, dt * 3);
    frame(dt);
    rafId = running ? requestAnimationFrame(tick) : 0;
  }
  function setRunning(next) {
    if (reduceMotion) { frame(1); return; }
    if (next === running) return;
    running = next;
    if (running) { last = performance.now(); rafId = requestAnimationFrame(tick); }
    else cancelAnimationFrame(rafId);
  }

  let inView = false;
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    setRunning(inView && !document.hidden);
  }, { rootMargin: '200px 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));
  new ResizeObserver(() => { resize(); if (!running) frame(1); }).observe(canvas);
  new MutationObserver(() => { readPalette(); if (!running) frame(1); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  frame(1);
  if (shaderFailed) { renderer.dispose(); return; }
  section.classList.add('voyage-ready');
}

// Catmull-Rom through the camera keyframes, so the camera never stops dead between shots.
function sampleShots(p) {
  let i = 0;
  while (i < SHOTS.length - 2 && p > SHOTS[i + 1].p) i++;
  const a = SHOTS[Math.max(i - 1, 0)];
  const b = SHOTS[i];
  const c = SHOTS[i + 1];
  const d = SHOTS[Math.min(i + 2, SHOTS.length - 1)];
  const t = THREE.MathUtils.clamp((p - b.p) / (c.p - b.p), 0, 1);
  const spline = (k) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
  };
  return { r: spline('r'), az: spline('az'), el: spline('el') };
}

// A small wooden wasen: planked hull, mast and battened sail with the studio cat, a stern lantern, and an oar.
function createBoat(toneMap, outline) {
  const group = new THREE.Group();
  const wood = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toneMap, side: THREE.DoubleSide });
  const darkWood = new THREE.MeshToonMaterial({ color: 0x4a2c18, gradientMap: toneMap });
  const hull = outline(new THREE.Mesh(hullGeometry(), wood), 0.05);
  group.add(hull);
  group.add(new THREE.Mesh(deckGeometry(), wood));

  const mast = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 3.3, 10), darkWood), 0.03);
  mast.position.set(0, 1.75, -0.35);
  group.add(mast);
  const yard = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8).rotateZ(Math.PI / 2), darkWood), 0.03);
  yard.position.set(0, 3.2, -0.28);
  group.add(yard);

  const sailGeometry = new THREE.PlaneGeometry(1.95, 2.25, 14, 14);
  const sailRest = sailGeometry.attributes.position.array.slice();
  const sailMaterial = new THREE.MeshToonMaterial({ map: sailTexture(), gradientMap: toneMap, side: THREE.DoubleSide });
  const sail = new THREE.Mesh(sailGeometry, sailMaterial);
  sail.position.set(0, 2.03, -0.26);
  sail.rotation.y = Math.PI;
  group.add(sail);

  const flagGeometry = new THREE.PlaneGeometry(0.55, 0.16, 8, 1).translate(0.275, 0, 0);
  const flagRest = flagGeometry.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeometry, new THREE.MeshToonMaterial({ color: 0xc8322a, gradientMap: toneMap, side: THREE.DoubleSide }));
  flag.position.set(0, 3.38, -0.35);
  flag.rotation.y = -Math.PI / 2;
  group.add(flag);

  // Stern lantern on a short post.
  const post = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.1, 8), darkWood), 0.025);
  post.position.set(0, 0.85, 1.38);
  group.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.32), darkWood);
  arm.position.set(0, 1.38, 1.52);
  group.add(arm);
  const lanternMaterial = new THREE.MeshToonMaterial({ color: 0xe2483a, emissive: 0xff5a2a, emissiveIntensity: 0.4, gradientMap: toneMap });
  const lanternShape = [[0, -0.17], [0.09, -0.16], [0.14, -0.08], [0.15, 0], [0.14, 0.08], [0.09, 0.16], [0, 0.17]].map(([x, y]) => new THREE.Vector2(x, y));
  const lanternBody = outline(new THREE.Mesh(new THREE.LatheGeometry(lanternShape, 16), lanternMaterial), 0.02);
  lanternBody.position.set(0, 1.17, 1.66);
  group.add(lanternBody);
  const lantern = new THREE.PointLight(0xffa24a, 1, 7, 1.6);
  lantern.position.copy(lanternBody.position);
  group.add(lantern);

  // The ro: a long sculling oar trailing into the water.
  const oarPivot = new THREE.Group();
  oarPivot.position.set(0.22, 0.42, 1.6);
  const oar = outline(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.4).translate(0, 0, 1.2), darkWood), 0.025);
  oar.rotation.x = 0.32;
  oarPivot.add(oar);
  group.add(oarPivot);

  return {
    group,
    lantern,
    setGlow(level) { lanternMaterial.emissiveIntensity = level; },
    update(t) {
      const position = sailGeometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = sailRest[i * 3];
        const y = sailRest[i * 3 + 1];
        const u = x / 1.95 + 0.5;
        const v = y / 2.25 + 0.5;
        const belly = Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.15 + v * 0.85));
        position.setZ(i, belly * (0.28 + Math.sin(t * 1.7 + v * 2) * 0.03));
      }
      position.needsUpdate = true;
      sailGeometry.computeVertexNormals();

      const flagPosition = flagGeometry.attributes.position;
      for (let i = 0; i < flagPosition.count; i++) {
        const x = flagRest[i * 3];
        flagPosition.setZ(i, Math.sin(t * 6 - x * 9) * 0.05 * (x / 0.55));
      }
      flagPosition.needsUpdate = true;

      oarPivot.rotation.y = Math.sin(t * 1.3) * 0.35;
    },
  };
}

function hullGeometry() {
  const length = 3.4;
  const beam = 0.64;
  const rings = 32;
  const around = 14;
  const positions = [];
  const colors = [];
  const indices = [];
  const planks = [new THREE.Color('#9b6334'), new THREE.Color('#7a4824'), new THREE.Color('#3e2414')];
  const section = (t) => ({
    half: beam * (t > 0 ? 1 - Math.pow(t, 2.4) : 1 - Math.pow(-t, 5) * 0.42),
    top: 0.4 + Math.pow(Math.max(t, 0), 3) * 0.58 + Math.pow(Math.max(-t, 0), 3) * 0.16,
    bottom: -0.26 * (1 - Math.pow(Math.abs(t), 6) * 0.55) + Math.pow(Math.max(t, 0), 4) * 0.3,
  });
  for (let i = 0; i <= rings; i++) {
    const t = (i / rings) * 2 - 1;
    const { half, top, bottom } = section(t);
    const z = (-t * length) / 2;
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * Math.PI;
      const s = Math.pow(Math.sin(a), 0.6);
      positions.push(-Math.cos(a) * half, top - (top - bottom) * s, z);
      const plank = j === 0 || j === around ? 2 : Math.floor((1 - s) * 4.999) % 2;
      colors.push(planks[plank].r, planks[plank].g, planks[plank].b);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j;
      const b = a + around + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // Close the square stern with a transom.
  const stern = section(-1);
  const centre = positions.length / 3;
  positions.push(0, (stern.top + stern.bottom) / 2, length / 2);
  colors.push(planks[1].r, planks[1].g, planks[1].b);
  for (let j = 0; j < around; j++) indices.push(centre, j + 1, j);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function deckGeometry() {
  const positions = [];
  const colors = [];
  const indices = [];
  const deck = new THREE.Color('#c08a52');
  const seam = new THREE.Color('#a8733f');
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 1.7 - 0.95;
    const half = 0.64 * 0.86 * (t > 0 ? 1 - Math.pow(t, 2.4) : 1 - Math.pow(-t, 5) * 0.42);
    const z = (-t * 3.4) / 2;
    const c = i % 3 === 0 ? seam : deck;
    positions.push(-half, 0.12, z, half, 0.12, z);
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Cream sailcloth with battens and a crimson seal carrying the studio cat.
function sailTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 600;
  const g = c.getContext('2d');
  g.fillStyle = '#f2e8d2';
  g.fillRect(0, 0, 512, 600);
  g.fillStyle = '#e6d8bb';
  for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 3, 600);
  g.fillStyle = '#4a2c18';
  for (let y = 0; y <= 600; y += 100) g.fillRect(0, Math.min(y, 592), 512, 8);
  g.beginPath();
  g.arc(256, 300, 150, 0, Math.PI * 2);
  g.fillStyle = '#c8322a';
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = '#141a33';
  g.stroke();
  g.save();
  g.translate(256 - 120, 300 - 124);
  g.scale(6, 6);
  g.strokeStyle = '#fff4e2';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke(new Path2D('M8 19V7L16 13Q20 11 24 13L32 7V19C36 31 27 35 20 35S4 31 8 19Z'));
  g.stroke(new Path2D('M14 23V24M26 23V24M18 27L20 29L22 27M20 29V31M9 26L3 24M9 29L3 30M31 26L37 24M31 29L37 30'));
  g.restore();
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function fujiGeometry() {
  const profile = [[0, 0], [1, 0], [0.78, 0.12], [0.5, 0.42], [0.26, 0.78], [0.13, 0.98], [0.06, 1], [0, 0.99]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, 48);
}

function paintFuji(geometry, rock, snow) {
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const base = new THREE.Color(rock);
  const cap = new THREE.Color(snow);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const angle = Math.atan2(position.getZ(i), position.getX(i));
    const line = 0.62 + Math.sin(angle * 9) * 0.07 + Math.sin(angle * 23) * 0.03;
    c.copy(y > line ? cap : base);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.42, '#ffffff');
  gradient.addColorStop(0.46, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

if (section && canvas) {
  try { start(); } catch { /* The painted sky and captions remain when WebGL is unavailable. */ }
}
