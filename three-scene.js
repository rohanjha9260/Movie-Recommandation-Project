import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let scene, camera, renderer;
let dustPoints, starsPoints;
let dustGeo, starsGeo;
let dustVelocities, dustBasePositions;
let starTwinkleData;

let mouseX = 0, mouseY = 0;
let targetCameraX = 0, targetCameraY = 0;
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

// Create soft circular glow texture for dust particles
function createDustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 200, 120, 0.8)');
  gradient.addColorStop(0.55, 'rgba(255, 120, 40, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

// Create crisp twinkling star texture
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.35, 'rgba(210, 235, 255, 0.75)');
  gradient.addColorStop(0.7, 'rgba(140, 180, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  return new THREE.CanvasTexture(canvas);
}

function init() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06060c, 0.025);

  camera = new THREE.PerspectiveCamera(50, windowWidth / windowHeight, 0.1, 150);
  camera.position.set(0, 0, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(windowWidth, windowHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 1. DUST PARTICLES (Floating freely in foreground/midground)
  const dustCount = 700;
  dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  dustVelocities = [];
  dustBasePositions = [];

  const dustPalette = [
    new THREE.Color(0xffaa44), // warm amber
    new THREE.Color(0xff6622), // glowing orange
    new THREE.Color(0xffd580), // golden dust
    new THREE.Color(0xffffff), // bright shimmer
    new THREE.Color(0x9d71e8)  // subtle violet starlight
  ];

  for (let i = 0; i < dustCount; i++) {
    const idx = i * 3;
    const x = (Math.random() - 0.5) * 32;
    const y = (Math.random() - 0.5) * 24;
    const z = (Math.random() - 0.5) * 20;

    dustPositions[idx] = x;
    dustPositions[idx + 1] = y;
    dustPositions[idx + 2] = z;

    dustBasePositions.push({ x, y, z });

    // Individual free motion velocities and oscillation
    dustVelocities.push({
      vx: (Math.random() - 0.5) * 0.008,
      vy: 0.003 + Math.random() * 0.007, // gentle upward drift
      vz: (Math.random() - 0.5) * 0.006,
      swaySpeed: 0.5 + Math.random() * 1.5,
      swayDist: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    });

    const col = dustPalette[Math.floor(Math.random() * dustPalette.length)];
    dustColors[idx] = col.r;
    dustColors[idx + 1] = col.g;
    dustColors[idx + 2] = col.b;
  }

  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

  const dustMat = new THREE.PointsMaterial({
    size: 0.16,
    map: createDustTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 2. SMALL STARS (Distant twinkling background field)
  const starCount = 1800;
  starsGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  starTwinkleData = [];

  const starPalette = [
    new THREE.Color(0xffffff), // pure white
    new THREE.Color(0xd6e8ff), // ice blue
    new THREE.Color(0xffeedd), // soft warm star
    new THREE.Color(0xaec9ff), // deep star blue
    new THREE.Color(0xf5d6ff)  // faint nebula pink
  ];

  for (let i = 0; i < starCount; i++) {
    const idx = i * 3;
    // Spread in a large background sphere/box
    starPositions[idx] = (Math.random() - 0.5) * 70;
    starPositions[idx + 1] = (Math.random() - 0.5) * 50;
    starPositions[idx + 2] = -5 - Math.random() * 35; // deeper in background

    const baseCol = starPalette[Math.floor(Math.random() * starPalette.length)];
    starColors[idx] = baseCol.r;
    starColors[idx + 1] = baseCol.g;
    starColors[idx + 2] = baseCol.b;

    starTwinkleData.push({
      baseR: baseCol.r,
      baseG: baseCol.g,
      baseB: baseCol.b,
      speed: 1.0 + Math.random() * 3.0,
      phase: Math.random() * Math.PI * 2,
      brightness: 0.4 + Math.random() * 0.6
    });
  }

  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starsMat = new THREE.PointsMaterial({
    size: 0.1,
    map: createStarTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  starsPoints = new THREE.Points(starsGeo, starsMat);
  scene.add(starsPoints);

  // Event Listeners
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove);

  animate();
}

function onResize() {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  camera.aspect = windowWidth / windowHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(windowWidth, windowHeight);
}

function onPointerMove(e) {
  mouseX = (e.clientX / windowWidth) * 2 - 1;
  mouseY = -(e.clientY / windowHeight) * 2 + 1;
  targetCameraX = mouseX * 1.2;
  targetCameraY = mouseY * 0.8;
}

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // 1. Update Floating Dust Particles
  if (dustGeo) {
    const positions = dustGeo.attributes.position.array;
    const count = dustVelocities.length;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const vel = dustVelocities[i];

      // Update positions with drift and gentle swaying
      positions[idx] += vel.vx + Math.sin(time * vel.swaySpeed + vel.phase) * (vel.swayDist * 0.006);
      positions[idx + 1] += vel.vy;
      positions[idx + 2] += vel.vz + Math.cos(time * vel.swaySpeed + vel.phase) * (vel.swayDist * 0.004);

      // Seamless wrap-around boundaries
      if (positions[idx + 1] > 14) positions[idx + 1] = -14;
      if (positions[idx] > 18) positions[idx] = -18;
      if (positions[idx] < -18) positions[idx] = 18;
      if (positions[idx + 2] > 12) positions[idx + 2] = -12;
      if (positions[idx + 2] < -12) positions[idx + 2] = 12;
    }

    dustGeo.attributes.position.needsUpdate = true;
    dustPoints.rotation.y = time * 0.015;
  }

  // 2. Update Twinkling Background Stars
  if (starsGeo) {
    const colors = starsGeo.attributes.color.array;
    const count = starTwinkleData.length;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const tw = starTwinkleData[i];
      // Pulsing twinkle factor between ~0.3 and 1.2
      const factor = tw.brightness * (0.6 + 0.4 * Math.sin(time * tw.speed + tw.phase));

      colors[idx] = Math.min(1.0, tw.baseR * factor);
      colors[idx + 1] = Math.min(1.0, tw.baseG * factor);
      colors[idx + 2] = Math.min(1.0, tw.baseB * factor);
    }

    starsGeo.attributes.color.needsUpdate = true;
    // Slow cosmic drift
    starsPoints.rotation.y = time * 0.003;
    starsPoints.rotation.x = time * 0.0015;
  }

  // Smooth camera parallax following mouse
  camera.position.x += (targetCameraX - camera.position.x) * 0.03;
  camera.position.y += (targetCameraY - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
