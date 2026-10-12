// Shared pieces for the cel-shaded Three.js scenes: tone ramp, ink outlines, the torii, and maple leaves.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

export { THREE };

// Three flat tones, like a cel-painted background.
export function createToneMap() {
  const toneMap = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
  toneMap.minFilter = toneMap.magFilter = THREE.NearestFilter;
  toneMap.needsUpdate = true;
  return toneMap;
}

// An inverted shell behind each solid draws the ink line around it.
export function createOutliner(material) {
  return function outline(mesh, thickness) {
    mesh.geometry.computeBoundingBox();
    const size = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
    const shell = new THREE.Mesh(mesh.geometry, material);
    shell.scale.set(1 + thickness / Math.max(size.x, 1e-3), 1 + thickness / Math.max(size.y, 1e-3), 1 + thickness / Math.max(size.z, 1e-3));
    mesh.add(shell);
    return mesh;
  };
}

// Reads a #rrggbb custom property as sRGB components, for shaders that skip colour management.
export function cssRGB(css, name) {
  const value = parseInt(css.getPropertyValue(name).trim().replace('#', ''), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// A small vermilion torii gate: two pillars, two crossbeams, and an upturned black top rail.
export function createTorii(red, ink, outline) {
  const gate = new THREE.Group();
  const part = (geometry, material, x, y, z = 0) => {
    const mesh = outline(new THREE.Mesh(geometry, material), 0.035);
    mesh.position.set(x, y, z);
    gate.add(mesh);
    return mesh;
  };
  [-0.78, 0.78].forEach((x) => {
    part(new THREE.CylinderGeometry(0.075, 0.095, 1.95, 20), red, x, 0.98);
    part(new THREE.CylinderGeometry(0.115, 0.115, 0.16, 20), ink, x, 0.08);
  });
  part(new THREE.BoxGeometry(2.05, 0.09, 0.11), red, 0, 1.5);
  part(new THREE.BoxGeometry(0.09, 0.32, 0.08), red, 0, 1.72);
  part(new THREE.BoxGeometry(2.35, 0.09, 0.16), red, 0, 1.9);
  const rail = new THREE.BoxGeometry(2.7, 0.11, 0.2, 32, 1, 1);
  const position = rail.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const t = position.getX(i) / 1.35;
    position.setY(i, position.getY(i) + Math.pow(Math.abs(t), 3) * 0.13);
  }
  rail.computeVertexNormals();
  part(rail, ink, 0, 2.0);
  return gate;
}

// Points around a maple leaf, centred on its middle, about two units across.
export function leafOutline() {
  const points = [[0, -1], [0.05, -0.55]];
  const lobes = 7;
  for (let i = 0; i <= lobes * 2; i++) {
    const angle = -Math.PI * 0.82 + (i / (lobes * 2)) * Math.PI * 1.64;
    const lobe = 1 - (Math.abs(angle) / Math.PI) * 0.55;
    const radius = i % 2 ? lobe : 0.32 + lobe * 0.08;
    points.push([-Math.sin(angle) * radius, Math.cos(angle) * radius - 0.1]);
  }
  points.push([-0.05, -0.55]);
  return points.reverse();
}
