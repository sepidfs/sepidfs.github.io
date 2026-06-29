import * as THREE from "three";

export function initSpaceBackground(container: HTMLElement) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const BLUE = 0x6aa6ff;
  const LIGHT_BLUE = 0x8ab4ff;
  const PURPLE = 0xa855f7;

  // ---------- Stars ----------
  const starCount = 3200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 95;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 95;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 95;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.03,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  const purpleLine = new THREE.LineBasicMaterial({ color: PURPLE, transparent: true, opacity: 0.15, depthWrite: false });

  // ===== Comet/arrow mist — wide & dense by the photo, tapering to a thin tip toward the text =====
  function makeGlowTexture() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.25, "rgba(150,180,255,0.5)");
    grad.addColorStop(0.6, "rgba(120,120,255,0.15)");
    grad.addColorStop(1, "rgba(120,120,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }
  const glowTex = makeGlowTexture();

  const mistCount = 70;
  const mistPos = new Float32Array(mistCount * 3);
  const mistData: { baseX: number; baseY: number; baseZ: number; phase: number; scl: number; fade: number }[] = [];
  for (let i = 0; i < mistCount; i++) {
    // comet/arrow shape: wide & dense near the photo, tapering to a thin tip on the right
    const t = Math.random();                 // even spread along the length
    const fade = 1 - t;                      // 1 near photo, 0 at the tip
    const width = 0.4 + fade * 2.6;          // wide at the head, narrow at the tip
    const baseX = -5.5 + t * 10.5;
    const baseY = -0.6 + (Math.random() - 0.5) * width;   // spread scales with width
    const baseZ = -3.2 + (Math.random() - 0.5) * width;
    mistPos[i * 3] = baseX;
    mistPos[i * 3 + 1] = baseY;
    mistPos[i * 3 + 2] = baseZ;
    // bigger blobs at the head, smaller toward the tip
    const scl = 1.4 + fade * 2.8;
    mistData.push({ baseX, baseY, baseZ, phase: Math.random() * Math.PI * 2, scl, fade });
  }
  const mistGroup = new THREE.Group();
  const mistSprites: THREE.Sprite[] = [];
  mistData.forEach((d) => {
    const isPurple = Math.random() > 0.55;
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: (0.10 + Math.random() * 0.06) * d.fade, // strong at head -> fades to nothing at tip
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: isPurple ? PURPLE : LIGHT_BLUE,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(d.baseX, d.baseY, d.baseZ);
    sprite.scale.setScalar(d.scl);
    mistGroup.add(sprite);
    mistSprites.push(sprite);
  });
  scene.add(mistGroup);

  // ================= TOP-RIGHT MATH GROUP =================
  const mathGroup = new THREE.Group();

  // ----- Orbit / tensor -----
  const orbitGroup = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const curve = new THREE.EllipseCurve(0, 0, 0.8, 0.32, 0, Math.PI * 2);
    const points = curve.getPoints(140).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), purpleLine);
    orbit.rotation.x = Math.PI / 2;
    orbit.rotation.y = (Math.PI / 3) * k;
    orbit.rotation.z = 0.35 * k;
    orbitGroup.add(orbit);
  }
  orbitGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 16),
    new THREE.MeshBasicMaterial({ color: LIGHT_BLUE, transparent: true, opacity: 0.6, depthWrite: false })
  ));
  orbitGroup.position.set(2.4, 1.3, 0.05);
  orbitGroup.scale.set(0.7, 0.7, 0.7);
  mathGroup.add(orbitGroup);

  // ----- Rotating graph sphere (central) -----
  const graphCore = new THREE.Group();
  const gNodeCount = 55;
  const gRadius = 1.5;
  const gNodes: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < gNodeCount; i++) {
    const y = 1 - (i / (gNodeCount - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    gNodes.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(gRadius));
  }
  const gNodePos = new Float32Array(gNodes.length * 3);
  gNodes.forEach((n, i) => {
    gNodePos[i * 3] = n.x; gNodePos[i * 3 + 1] = n.y; gNodePos[i * 3 + 2] = n.z;
  });
  const gNodeGeo = new THREE.BufferGeometry();
  gNodeGeo.setAttribute("position", new THREE.BufferAttribute(gNodePos, 3));
  const gNodeMat = new THREE.PointsMaterial({ color: LIGHT_BLUE, size: 0.09, transparent: true, opacity: 0.9, sizeAttenuation: true, depthWrite: false });
  graphCore.add(new THREE.Points(gNodeGeo, gNodeMat));

  const gSeen = new Set<string>();
  const gEdges: number[] = [];
  for (let i = 0; i < gNodes.length; i++) {
    const dists = gNodes.map((_, j) => ({ j, d: gNodes[i].distanceToSquared(gNodes[j]) }))
      .filter((o) => o.j !== i).sort((a, b) => a.d - b.d);
    for (let m = 0; m < 3; m++) {
      const j = dists[m].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (gSeen.has(key)) continue;
      gSeen.add(key);
      gEdges.push(gNodes[i].x, gNodes[i].y, gNodes[i].z, gNodes[j].x, gNodes[j].y, gNodes[j].z);
    }
  }
  const gEdgeGeo = new THREE.BufferGeometry();
  gEdgeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(gEdges), 3));
  graphCore.add(new THREE.LineSegments(gEdgeGeo, new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.16, depthWrite: false })));

  graphCore.position.set(0, 0, 0);
  mathGroup.add(graphCore);

  // ----- Floating CS / Math symbols -----
  const SYMBOLS = ["∑", "∫", "π", "λ", "∞", "∇", "{ }", "</>", "f(x)", "01"];
  function makeSymbolSprite(text: string, hex: string) {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 60px 'Courier New', monospace";
    ctx.fillStyle = hex;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = hex;
    ctx.shadowBlur = 14;
    ctx.fillText(text, size / 2, size / 2);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.5, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(0.45);
    return sprite;
  }
  const symbolColors = ["#8ab4ff", "#a855f7", "#6aa6ff"];
  SYMBOLS.forEach((s, i) => {
    const sprite = makeSymbolSprite(s, symbolColors[i % symbolColors.length]);
    const rr = 2.2 + Math.random() * 0.7;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    sprite.position.set(rr * Math.sin(p) * Math.cos(t), rr * Math.sin(p) * Math.sin(t), rr * Math.cos(p));
    graphCore.add(sprite);
  });

  mathGroup.position.set(3.2, 4.8, -5.0);
  mathGroup.scale.set(0.95, 0.95, 0.95);
  scene.add(mathGroup);

  // ---------- mouse parallax ----------
  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
  });

  // ---------- animation ----------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    stars.rotation.y += 0.00045;
    stars.rotation.x += 0.00018;

    // gentle breathing drift of the mist (keeps the arrow/comet fade)
    mistSprites.forEach((sp, i) => {
      const d = mistData[i];
      sp.position.y = d.baseY + Math.sin(time * 0.4 + d.phase) * 0.25;
      sp.position.x = d.baseX + Math.cos(time * 0.3 + d.phase) * 0.2;
      (sp.material as THREE.SpriteMaterial).opacity =
        (0.09 + Math.sin(time * 0.5 + d.phase) * 0.03 + 0.03) * d.fade;
    });

    orbitGroup.rotation.x += 0.004;
    orbitGroup.rotation.y += 0.006;

    graphCore.rotation.y += 0.0016;
    graphCore.rotation.x = Math.sin(time * 0.2) * 0.1;
    gNodeMat.opacity = 0.7 + Math.sin(time * 1.5) * 0.2;

    mathGroup.rotation.x = -0.04 + mouseY * 0.03;
    mathGroup.rotation.z = mouseX * 0.02;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}