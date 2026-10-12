// A small karesansui (raked-sand garden) for the homepage hero, drawn in a cel-shaded anime style.
// The sand is a single flat plane; its raked grooves, moss, and stone shadows are
// computed per pixel, so the scene stays light enough for phones.
import { THREE, createToneMap, createOutliner, createTorii, leafOutline } from './scene-kit.js?v=20261013';

const hero = document.querySelector('[data-garden]');
const canvas = hero?.querySelector('.garden-canvas');
if (hero && canvas) {
  try { start(); } catch { /* The CSS garden stays visible when WebGL is unavailable. */ }
}

function start() {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 700px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  // If a GPU rejects the shader, keep the CSS garden instead of an empty canvas.
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  const lightDir = new THREE.Vector3(-0.72, 0.5, -0.42).normalize();

  // x, z, radius: a classic uneven triad.
  const stones = [
    [1.35, -0.7, 1.0],
    [-1.75, 0.95, 0.62],
    [3.05, 1.55, 0.4],
  ];

  const MAX_RIPPLES = 12;
  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0));
  let rippleIndex = 0;
  let time = 0;
  function addRipple(x, z, strength) {
    ripples[rippleIndex].set(x, z, time, strength);
    rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
  }

  const uniforms = {
    uTime: { value: 0 },
    uReveal: { value: reduceMotion ? 1 : 0 },
    uStones: { value: stones.map(([x, z, r]) => new THREE.Vector3(x, z, r)) },
    uRipples: { value: ripples },
    uSand: { value: new THREE.Vector3() },
    uShade: { value: new THREE.Vector3() },
    uMoss: { value: new THREE.Vector3() },
    uLight: { value: lightDir },
  };

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() {
          vP = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uReveal;
        uniform vec3 uStones[3];
        uniform vec4 uRipples[${MAX_RIPPLES}];
        uniform vec3 uSand, uShade, uMoss, uLight;
        varying vec2 vP;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }

        const float FREQ = 13.0;

        // Distance from the edge of a stone, with a softly irregular outline.
        float stoneDistance(vec2 p, vec3 s) {
          vec2 d = (p - s.xy) * vec2(1.0, 1.12);
          return length(d) - s.z;
        }

        float mossEdge(vec2 p, vec3 s) { return s.z * 0.14 + noise(p * 3.5) * 0.17; }

        float height(vec2 p) {
          float h = sin((p.y + noise(p * 0.55) * 0.12) * FREQ);
          for (int i = 0; i < 3; i++) {
            vec3 s = uStones[i];
            float d = stoneDistance(p, s);
            float reach = s.z * 1.2 + 0.6;
            float around = 1.0 - smoothstep(reach - 0.32, reach, d + noise(p * 2.0) * 0.12);
            h = mix(h, sin(d * FREQ + 1.4), around);
            h *= smoothstep(mossEdge(p, s), mossEdge(p, s) + 0.18, d);
          }
          // The rake sweeps in from the left on page load.
          float front = mix(-9.0, 9.0, uReveal);
          h *= smoothstep(front + 0.7, front - 0.7, p.x + noise(p * 1.3) * 0.9);

          for (int j = 0; j < ${MAX_RIPPLES}; j++) {
            vec4 r = uRipples[j];
            float age = uTime - r.z;
            if (age < 0.0 || age > 4.5) continue;
            float wave = length(p - r.xy) - age * 0.9;
            h += sin(wave * 17.0) * exp(-wave * wave * 5.0) * exp(-age * 0.95) * r.w * 1.3;
          }
          return h;
        }

        void main() {
          vec2 p = vP;
          // Fade the grooves where they would shimmer at a distance.
          float detail = 1.0 - smoothstep(0.05, 0.2, length(fwidth(p)));
          float depth = 0.014 * detail;
          float e = 0.012;
          float hx = (height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0))) / (2.0 * e);
          float hz = (height(p + vec2(0.0, e)) - height(p - vec2(0.0, e))) / (2.0 * e);
          vec3 n = normalize(vec3(-hx * depth, 1.0, -hz * depth));

          // Cel shading: the light falls into a few soft bands, and shadows lean cool.
          float light = clamp(dot(n, uLight), 0.0, 1.0) - uLight.y;
          float band = floor(light * 7.0 + 0.5) / 7.0;
          light = mix(light, band, 0.4);
          vec3 col = mix(uSand, uShade, clamp(-light * 1.7, 0.0, 0.8));
          col += max(light, 0.0) * 0.7 * vec3(1.0, 0.97, 0.95);

          float shadow = 0.0;
          float moss = 0.0;
          for (int i = 0; i < 3; i++) {
            vec3 s = uStones[i];
            float d = stoneDistance(p, s);
            vec2 offs = p - s.xy + normalize(uLight.xz) * s.z * 0.75;
            float sd = length(offs * vec2(1.0, 1.12)) - s.z * 0.9;
            shadow += (1.0 - smoothstep(s.z * 0.2, s.z * 0.32, sd)) * 0.6;
            shadow += (1.0 - smoothstep(0.0, 0.1, d)) * 0.35;
            moss = max(moss, 1.0 - smoothstep(mossEdge(p, s) - 0.06, mossEdge(p, s), d));
          }
          col = mix(col, uShade, clamp(shadow, 0.0, 0.75));
          vec3 mossCol = uMoss * (0.85 + step(0.55, noise(p * 9.0)) * 0.22);
          col = mix(col, mossCol, step(0.5, moss));
          col += (hash(floor(p * 260.0)) - 0.5) * 0.012;

          float island = length(p * vec2(0.74, 1.0)) + (noise(p * 0.7) - 0.5) * 1.1;
          float alpha = 1.0 - smoothstep(3.7, 5.6, island);
          gl_FragColor = vec4(col, alpha);
        }`,
    }),
  );
  scene.add(sand);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.copy(lightDir).multiplyScalar(10);
  scene.add(hemi, sun);

  const toneMap = createToneMap();
  const outlineMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  const outline = createOutliner(outlineMaterial);

  const stoneMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toneMap });
  const stoneMeshes = stones.map(([x, z, r], i) => {
    const mesh = new THREE.Mesh(stoneGeometry(i * 2.37 + 0.6), stoneMaterial);
    mesh.scale.set(r, r * (i === 0 ? 0.92 : 0.7), r * 0.9);
    mesh.position.set(x, r * (i === 0 ? 0.32 : 0.16), z);
    mesh.rotation.y = i * 1.7;
    outline(mesh, 0.07 / r);
    scene.add(mesh);
    return mesh;
  });

  const toriiRed = new THREE.MeshToonMaterial({ gradientMap: toneMap });
  const toriiInk = new THREE.MeshToonMaterial({ gradientMap: toneMap });
  const torii = createTorii(toriiRed, toriiInk, outline);
  torii.position.set(-0.95, 0, -1.95);
  torii.rotation.y = 0.22;
  scene.add(torii);

  const petals = createPetals(small ? 34 : 64);
  scene.add(petals.mesh);

  let stoneColor = new THREE.Color();
  let mossColor = new THREE.Color();
  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    const rgb = (name) => {
      const hex = css.getPropertyValue(name).trim().replace('#', '');
      const value = parseInt(hex, 16);
      return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
    };
    uniforms.uSand.value.set(...rgb('--garden-sand'));
    uniforms.uShade.value.set(...rgb('--garden-shade'));
    uniforms.uMoss.value.set(...rgb('--garden-moss'));
    stoneColor = new THREE.Color(css.getPropertyValue('--garden-stone').trim());
    mossColor = new THREE.Color(css.getPropertyValue('--garden-moss').trim());
    petals.paint(['--garden-leaf', '--garden-leaf-2', '--garden-leaf-3'].map((name) => css.getPropertyValue(name).trim()));
    toriiRed.color.set(css.getPropertyValue('--garden-torii').trim());
    toriiInk.color.set(css.getPropertyValue('--garden-outline').trim());
    outlineMaterial.color.set(css.getPropertyValue('--garden-outline').trim());
    const dark = document.documentElement.dataset.theme === 'dark';
    hemi.color.set(dark ? 0x8fa6e8 : 0xf6f8ff);
    hemi.groundColor.set(dark ? 0x121a3a : 0x8e9cc0);
    hemi.intensity = dark ? 1.1 : 1.5;
    sun.color.set(dark ? 0xd4dcff : 0xfff1e6);
    sun.intensity = dark ? 1.6 : 2.3;
    stoneMeshes.forEach((mesh) => paintStone(mesh.geometry));
  }

  function paintStone(geometry) {
    const normals = geometry.attributes.normal;
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const ny = normals.getY(i);
      const grain = Math.sin(positions.getX(i) * 9.1) * Math.sin(positions.getZ(i) * 7.3) * 0.5 + 0.5;
      const moss = ny + grain * 0.25 > 0.86 ? 1 : 0;
      c.copy(stoneColor).multiplyScalar(0.92 + grain * 0.12).lerp(mossColor, moss * 0.85);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  readPalette();
  new MutationObserver(() => { readPalette(); if (!running) render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Framing: the garden sits to the right of the text on wide screens and below it on tall ones.
  let width = 1;
  let height = 1;
  let base = new THREE.Vector3();
  const target = new THREE.Vector3();
  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    const distance = aspect < 1 ? 1 + (1 - aspect) * 0.6 : 1;
    target.set(aspect < 1 ? 0.7 : 0, 0, 0.3);
    base = new THREE.Vector3(0, 10.4, 13.8).multiplyScalar(distance).add(target);
    // Offset the view without zooming: widen the field of view to match the larger virtual frame.
    const shiftX = aspect >= 1.15 ? width * 0.2 : 0;
    const shiftY = aspect >= 1.15 ? height * 0.05 : height * 0.29;
    const fullHeight = height + shiftY * 2;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(17)) * fullHeight / height));
    camera.setViewOffset(width + shiftX * 2, fullHeight, 0, 0, width, height);
    camera.updateProjectionMatrix();
    if (!running) render();
  }

  // Raking: pointer movement and taps leave ripples in the sand.
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let lastRake = { x: 99, z: 99, t: -1 };
  function sandPoint(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return Math.hypot(hit.x * 0.74, hit.z) < 5.2 ? hit : null;
  }
  if (!reduceMotion) {
    hero.addEventListener('pointermove', (event) => {
      look.tx = (event.clientX / innerWidth) * 2 - 1;
      look.ty = (event.clientY / innerHeight) * 2 - 1;
      if (event.pointerType !== 'mouse') return;
      const p = sandPoint(event);
      if (!p || time - lastRake.t < 0.08 || Math.hypot(p.x - lastRake.x, p.z - lastRake.z) < 0.5) return;
      addRipple(p.x, p.z, 0.75);
      lastRake = { x: p.x, z: p.z, t: time };
    });
    hero.addEventListener('pointerdown', (event) => {
      const p = sandPoint(event);
      if (p) addRipple(p.x, p.z, 1.3);
    });
  }

  let running = false;
  let frame = 0;
  let last = performance.now();
  let introStart = -1;
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

  function render() {
    const intro = reduceMotion ? 1 : easeOut(introStart < 0 ? 0 : (time - introStart) / 3.2);
    look.x += (look.tx - look.x) * 0.04;
    look.y += (look.ty - look.y) * 0.04;
    const scrolled = Math.min(scrollY / Math.max(height, 1), 1);
    camera.position.set(
      base.x + look.x * 1.1,
      base.y + (1 - intro) * 6 + look.y * 0.4 + scrolled * 2.4,
      base.z + (1 - intro) * 4.5,
    );
    camera.lookAt(target);
    uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    if (introStart < 0) introStart = time;
    if (!reduceMotion) {
      uniforms.uReveal.value = easeOut((time - introStart - 0.5) / 2.6);
      petals.update(dt, time, addRipple);
    }
    render();
    frame = running ? requestAnimationFrame(tick) : 0;
  }

  function setRunning(next) {
    if (reduceMotion) { render(); return; }
    if (next === running) return;
    running = next;
    if (running) { last = performance.now(); frame = requestAnimationFrame(tick); }
    else cancelAnimationFrame(frame);
  }

  let inView = true;
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    setRunning(inView && !document.hidden);
  }).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));
  new ResizeObserver(resize).observe(hero);
  addEventListener('scroll', () => { if (reduceMotion) render(); }, { passive: true });

  resize();
  if (reduceMotion) petals.settle();
  render();
  setRunning(true);
  if (shaderFailed) { setRunning(false); renderer.dispose(); return; }
  requestAnimationFrame(() => hero.classList.add('garden-ready'));
}

function stoneGeometry(seed) {
  const geometry = new THREE.SphereGeometry(1, 72, 44);
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const n = v.clone().normalize();
    const bump = 1
      + 0.16 * Math.sin(n.x * 3.1 + seed) * Math.cos(n.z * 2.6 + seed * 1.7)
      + 0.07 * Math.sin(n.y * 6.5 + seed * 3.1)
      + 0.025 * Math.sin(n.x * 17 + n.z * 13 + seed);
    v.multiplyScalar(bump);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createPetals(count) {
  // A seven-lobed momiji (Japanese maple) leaf with a short stem.
  const shape = new THREE.Shape();
  leafOutline().forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  const geometry = new THREE.ShapeGeometry(shape, 6);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getX(i) * pos.getX(i) * 0.25);
  geometry.scale(0.1, 0.1, 0.1);
  geometry.computeVertexNormals();

  const material = new THREE.MeshToonMaterial({ side: THREE.DoubleSide, emissive: 0x2a0a00 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const tint = new THREE.Color();
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const state = Array.from({ length: count }, () => spawn({}, true));

  function spawn(p, scatter) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 3.9;
    p.x = Math.cos(angle) * radius * 1.3;
    p.z = Math.sin(angle) * radius;
    p.y = scatter ? Math.random() * 6 : 4.5 + Math.random() * 2.5;
    p.fall = 0.28 + Math.random() * 0.22;
    p.phase = Math.random() * Math.PI * 2;
    p.freq = 0.8 + Math.random() * 0.9;
    p.rx = Math.random() * 6; p.ry = Math.random() * 6; p.rz = Math.random() * 6;
    p.spin = 0.6 + Math.random() * 1.4;
    p.rest = 0;
    p.ripples = Math.random() < 0.3;
    return p;
  }

  function place(p, i) {
    dummy.position.set(p.x, p.y, p.z);
    if (p.rest > 0) dummy.rotation.set(-Math.PI / 2, 0, p.rz);
    else dummy.rotation.set(p.rx, p.ry, p.rz);
    const fade = p.hidden ? 0 : p.rest > 0 ? Math.min(p.rest / 1.5, 1) : 1;
    dummy.scale.setScalar(fade);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  return {
    mesh,
    paint(colors) {
      for (let i = 0; i < count; i++) mesh.setColorAt(i, tint.set(colors[i % colors.length]));
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt, t, addRipple) {
      state.forEach((p, i) => {
        if (p.rest > 0) {
          p.rest -= dt;
          if (p.rest <= 0) spawn(p, false);
        } else {
          p.y -= p.fall * dt;
          p.x += (0.12 + Math.sin(t * p.freq + p.phase) * 0.35) * dt;
          p.z += Math.cos(t * p.freq * 0.7 + p.phase) * 0.18 * dt;
          p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt; p.rz += p.spin * 0.4 * dt;
          if (p.y <= 0.012) {
            p.y = 0.012;
            p.rest = 5 + Math.random() * 6;
            if (p.ripples) addRipple(p.x, p.z, 0.45);
          }
        }
        place(p, i);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    settle() {
      state.forEach((p, i) => {
        if (i % 3) { p.hidden = true; } else { p.y = 0.012; p.rest = 1e9; }
        place(p, i);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
