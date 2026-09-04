"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import type { MascotMood } from "./mascot";

/* ----------------------------------------------------------------------------
 * Nova3D — the real-3D rendition of Nova (three.js), used by the dock hero.
 *
 * A procedural robot (no model files): pearl-white helmet with a glossy
 * near-black visor rimmed in coral red, pill eyes that glow, a red smile,
 * red ear pods, a rounded lathe torso with a heartbeat chest panel, red
 * shoulder caps and jointed arms with real hands. Everything is built from
 * primitives at mount, lit by a three-point rig plus a room environment for
 * the clearcoat reflections, and driven by a tiny pose system: every frame
 * the mood/gesture picks a TARGET pose and the numeric channels ease toward
 * it, so mood switches read as the robot moving, never as a cut.
 *
 * Props mirror MascotSvg (mood / blink / eye offsets / gesture) so the hero
 * can swap renderers without changing its own state machine; `boopTick`
 * plays the squash-and-rebound, `onUnavailable` fires when WebGL is missing
 * so the caller falls back to the SVG. Colors are read from the `--mascot-*`
 * tokens at mount, so a rebrand recolors the 3D robot along with the 2D one.
 *
 * Perf: one canvas, capped at 2× DPR, no shadow maps; the loop pauses while
 * the canvas is off-screen or the tab is hidden, and reduced-motion drops
 * the ambient bob/breathe/hop while keeping the pose easing.
 * -------------------------------------------------------------------------- */

export type MascotGesture = "wave" | "point" | null;

export interface Nova3DProps {
  /** Rendered size in px (square). */
  size: number;
  mood: MascotMood;
  blink: boolean;
  /** Eye-follow offset, same units as MascotSvg (max ~5). */
  ex: number;
  ey: number;
  gesture: MascotGesture;
  /** Bump to play the boop squash. */
  boopTick: number;
  /** WebGL could not be created — caller should render the SVG instead. */
  onUnavailable: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/* ── Palette (from CSS tokens, with the Coral Edition defaults) ─────────── */

interface Palette {
  shell: THREE.Color;
  visor: THREE.Color;
  visorHi: THREE.Color;
  accent: THREE.Color;
  accentDeep: THREE.Color;
  eye: THREE.Color;
  sad: THREE.Color;
  joint: THREE.Color;
  rim: THREE.Color;
}

function token(name: string, fallback: string): THREE.Color {
  const c = new THREE.Color();
  const raw =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : "";
  try {
    c.setStyle(raw || fallback);
  } catch {
    c.setStyle(fallback);
  }
  return c;
}

function readPalette(): Palette {
  return {
    shell: token("--mascot-shell-1", "#f8f9fd"),
    visor: token("--mascot-visor", "#0f1322"),
    visorHi: token("--mascot-visor-hi", "#2b3352"),
    accent: token("--mascot-accent", "#ff4b5c"),
    accentDeep: token("--mascot-accent-deep", "#d63447"),
    eye: token("--mascot-glow", "#eef8ff"),
    sad: token("--mascot-sad", "#ff7b7b"),
    joint: token("--mascot-joint", "#2a2f3f"),
    rim: token("--mascot-outline", "#c3cbdb"),
  };
}

/* ── Rig ────────────────────────────────────────────────────────────────── */

interface Arm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
  fingers: THREE.Mesh[];
}

interface Rig {
  root: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Group;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  arcL: THREE.Mesh;
  arcR: THREE.Mesh;
  mouths: Record<MouthKind, THREE.Object3D>;
  mouthTalk: THREE.Mesh;
  armL: Arm;
  armR: Arm;
  eyeMat: THREE.MeshStandardMaterial;
  pulse: THREE.MeshStandardMaterial;
  earMat: THREE.MeshStandardMaterial;
  disposables: Array<{ dispose(): void }>;
}

type MouthKind = "smile" | "grin" | "talk" | "flat" | "o";
type EyeKind = "round" | "happy" | "closed" | "sad";

function buildRig(p: Palette): Rig {
  const disposables: Array<{ dispose(): void }> = [];
  const geo = <G extends THREE.BufferGeometry>(g: G): G => {
    disposables.push(g);
    return g;
  };
  const mat = <M extends THREE.Material>(m: M): M => {
    disposables.push(m);
    return m;
  };

  const shellMat = mat(
    new THREE.MeshPhysicalMaterial({
      color: p.shell,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.28,
    }),
  );
  const visorMat = mat(
    new THREE.MeshPhysicalMaterial({
      color: p.visor,
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
  );
  const accentMat = mat(
    new THREE.MeshStandardMaterial({ color: p.accent, roughness: 0.42, metalness: 0.05 }),
  );
  const accentDeepMat = mat(
    new THREE.MeshStandardMaterial({ color: p.accentDeep, roughness: 0.5, metalness: 0.05 }),
  );
  const earMat = mat(
    new THREE.MeshStandardMaterial({
      color: p.accent,
      emissive: p.accent,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    }),
  );
  const pulse = mat(
    new THREE.MeshStandardMaterial({
      color: p.accent,
      emissive: p.accent,
      emissiveIntensity: 0.7,
      roughness: 0.35,
    }),
  );
  const jointMat = mat(
    new THREE.MeshStandardMaterial({ color: p.joint, roughness: 0.55, metalness: 0.55 }),
  );
  const rimMat = mat(new THREE.MeshStandardMaterial({ color: p.rim, roughness: 0.6 }));
  const eyeMat = mat(
    new THREE.MeshStandardMaterial({
      color: p.eye,
      emissive: p.eye,
      emissiveIntensity: 0.85,
      roughness: 0.35,
    }),
  );
  const mouthMat = mat(
    new THREE.MeshStandardMaterial({
      color: p.accent,
      emissive: p.accent,
      emissiveIntensity: 0.55,
      roughness: 0.4,
    }),
  );

  // Root pivots at the torso's underside so squashes happen "from the feet".
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.78;
  root.add(body);

  /* Torso — a lathed bell, flattened front-to-back */
  const profile = [
    [0, -0.78],
    [0.3, -0.78],
    [0.5, -0.74],
    [0.6, -0.62],
    [0.64, -0.4],
    [0.64, -0.1],
    [0.62, 0.15],
    [0.55, 0.34],
    [0.42, 0.44],
    [0.25, 0.48],
    [0, 0.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(geo(new THREE.LatheGeometry(profile, 56)), shellMat);
  torso.scale.z = 0.8;
  body.add(torso);

  /* Chest panel with the heartbeat line */
  const panelRim = new THREE.Mesh(geo(new RoundedBoxGeometry(0.52, 0.46, 0.1, 4, 0.08)), rimMat);
  panelRim.position.set(0, 0.0, 0.47);
  body.add(panelRim);
  const panel = new THREE.Mesh(geo(new RoundedBoxGeometry(0.46, 0.4, 0.12, 4, 0.07)), shellMat);
  panel.position.set(0, 0.0, 0.5);
  body.add(panel);
  const beat = [
    [-0.16, 0],
    [-0.09, 0],
    [-0.065, 0.05],
    [-0.035, -0.04],
    [0, 0.13],
    [0.035, -0.13],
    [0.065, 0.05],
    [0.09, 0],
    [0.16, 0],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < beat.length; i++) path.add(new THREE.LineCurve3(beat[i - 1], beat[i]));
  const line = new THREE.Mesh(geo(new THREE.TubeGeometry(path, 96, 0.016, 6, false)), pulse);
  line.position.set(0, -0.005, 0.565);
  body.add(line);

  /* Neck */
  const neck = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.23, 0.26, 28)), jointMat);
  neck.position.y = 0.58;
  body.add(neck);

  /* Shoulder caps + arms */
  const sphereGeo = geo(new THREE.SphereGeometry(0.21, 28, 20));
  const elbowGeo = geo(new THREE.SphereGeometry(0.115, 20, 16));
  const upperGeo = geo(new THREE.CapsuleGeometry(0.12, 0.34, 6, 18));
  const foreGeo = geo(new THREE.CapsuleGeometry(0.105, 0.3, 6, 18));
  const wristGeo = geo(new THREE.CylinderGeometry(0.125, 0.125, 0.08, 20));
  const palmGeo = geo(new RoundedBoxGeometry(0.24, 0.22, 0.11, 3, 0.05));
  const fingerGeo = geo(new THREE.CapsuleGeometry(0.034, 0.1, 4, 12));
  const thumbGeo = geo(new THREE.CapsuleGeometry(0.036, 0.08, 4, 12));

  const buildArm = (side: -1 | 1): Arm => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.64, 0.28, 0);
    body.add(shoulder);

    const cap = new THREE.Mesh(sphereGeo, accentMat);
    cap.position.x = side * 0.04;
    shoulder.add(cap);

    const upper = new THREE.Mesh(upperGeo, shellMat);
    upper.position.y = -0.3;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.52;
    shoulder.add(elbow);
    elbow.add(new THREE.Mesh(elbowGeo, jointMat));

    const fore = new THREE.Mesh(foreGeo, shellMat);
    fore.position.y = -0.24;
    elbow.add(fore);

    const wrist = new THREE.Mesh(wristGeo, accentDeepMat);
    wrist.position.y = -0.46;
    elbow.add(wrist);

    const hand = new THREE.Group();
    hand.position.y = -0.52;
    elbow.add(hand);
    const palm = new THREE.Mesh(palmGeo, shellMat);
    palm.position.y = -0.1;
    hand.add(palm);
    const fingers: THREE.Mesh[] = [];
    [-0.085, -0.03, 0.03, 0.085].forEach((x, i) => {
      const f = new THREE.Mesh(fingerGeo, shellMat);
      f.position.set(x * side, -0.26 - (i === 1 || i === 2 ? 0.015 : 0), 0);
      hand.add(f);
      fingers.push(f);
    });
    const thumb = new THREE.Mesh(thumbGeo, shellMat);
    thumb.position.set(side * 0.14, -0.12, 0.02);
    thumb.rotation.z = side * 0.7;
    hand.add(thumb);

    return { shoulder, elbow, hand, fingers };
  };
  const armL = buildArm(-1);
  const armR = buildArm(1);

  /* Head */
  const head = new THREE.Group();
  head.position.y = 1.36;
  body.add(head);

  const helmet = new THREE.Mesh(geo(new THREE.SphereGeometry(0.76, 48, 36)), shellMat);
  helmet.scale.set(1, 0.95, 0.9);
  head.add(helmet);

  const visorRim = new THREE.Mesh(geo(new RoundedBoxGeometry(1.2, 0.88, 0.5, 5, 0.27)), accentMat);
  visorRim.position.set(0, -0.02, 0.5);
  head.add(visorRim);
  const visor = new THREE.Mesh(geo(new RoundedBoxGeometry(1.1, 0.78, 0.5, 5, 0.23)), visorMat);
  visor.position.set(0, -0.02, 0.545);
  head.add(visor);
  // A faint inner sheen so the visor doesn't read as a flat hole.
  const sheen = new THREE.Mesh(
    geo(new RoundedBoxGeometry(0.92, 0.5, 0.02, 3, 0.2)),
    mat(
      new THREE.MeshStandardMaterial({
        color: p.visorHi,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
      }),
    ),
  );
  sheen.position.set(0, 0.1, 0.79);
  head.add(sheen);

  /* Eyes */
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.05, 0.8);
  head.add(eyes);
  const eyeGeo = geo(new RoundedBoxGeometry(0.2, 0.26, 0.05, 3, 0.075));
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.x = -0.27;
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.x = 0.27;
  eyes.add(eyeL, eyeR);
  const arcGeo = geo(new THREE.TorusGeometry(0.11, 0.036, 8, 22, Math.PI));
  const arcL = new THREE.Mesh(arcGeo, eyeMat);
  arcL.position.set(-0.27, -0.03, 0);
  const arcR = new THREE.Mesh(arcGeo, eyeMat);
  arcR.position.set(0.27, -0.03, 0);
  eyes.add(arcL, arcR);

  /* Mouths — one mesh per kind, toggled by visibility */
  const mouthRoot = new THREE.Group();
  mouthRoot.position.set(0, -0.2, 0.8);
  head.add(mouthRoot);
  const smile = new THREE.Mesh(geo(new THREE.TorusGeometry(0.16, 0.03, 8, 26, Math.PI)), mouthMat);
  smile.rotation.z = Math.PI;
  smile.position.y = 0.04;
  const grin = new THREE.Group();
  const grinArc = new THREE.Mesh(geo(new THREE.TorusGeometry(0.2, 0.03, 8, 28, Math.PI)), mouthMat);
  grinArc.rotation.z = Math.PI;
  const grinFill = new THREE.Mesh(
    geo(new THREE.CircleGeometry(0.2, 28, Math.PI, Math.PI)),
    mouthMat,
  );
  grinFill.position.z = -0.01;
  grin.add(grinArc, grinFill);
  grin.position.y = 0.06;
  const talk = new THREE.Mesh(geo(new RoundedBoxGeometry(0.2, 0.16, 0.04, 2, 0.06)), mouthMat);
  const flat = new THREE.Mesh(geo(new RoundedBoxGeometry(0.18, 0.05, 0.04, 2, 0.02)), mouthMat);
  const o = new THREE.Mesh(geo(new THREE.TorusGeometry(0.07, 0.03, 8, 20)), mouthMat);
  const mouths: Record<MouthKind, THREE.Object3D> = { smile, grin, talk, flat, o };
  Object.values(mouths).forEach((m) => mouthRoot.add(m));

  /* Ear pods */
  const podGeo = geo(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 28));
  const podCapGeo = geo(new THREE.CylinderGeometry(0.145, 0.145, 0.05, 28));
  ([-1, 1] as const).forEach((side) => {
    const pod = new THREE.Mesh(podGeo, shellMat);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(side * 0.78, -0.02, 0.02);
    head.add(pod);
    const capMesh = new THREE.Mesh(podCapGeo, earMat);
    capMesh.rotation.z = Math.PI / 2;
    capMesh.position.set(side * 0.87, -0.02, 0.02);
    head.add(capMesh);
  });

  return {
    root,
    head,
    eyes,
    eyeL,
    eyeR,
    arcL,
    arcR,
    mouths,
    mouthTalk: talk,
    armL,
    armR,
    eyeMat,
    pulse,
    earMat,
    disposables,
  };
}

/* ── Pose system ────────────────────────────────────────────────────────── */

interface ArmPose {
  x: number;
  z: number;
  elbow: number;
}

interface Pose {
  headX: number;
  headY: number;
  headZ: number;
  eyeScale: number;
  eye: EyeKind;
  mouth: MouthKind;
  armL: ArmPose;
  armR: ArmPose;
  point: boolean;
}

const HANG: ArmPose = { x: 0, z: 0.12, elbow: 0.12 };
const LIMP: ArmPose = { x: 0, z: 0.04, elbow: 0.04 };

function poseFor(mood: MascotMood, gesture: MascotGesture): Pose {
  const base: Pose = {
    headX: 0,
    headY: 0,
    headZ: 0,
    eyeScale: 1,
    eye: "round",
    mouth: "smile",
    armL: HANG,
    armR: HANG,
    point: false,
  };
  switch (mood) {
    case "listening":
      Object.assign(base, { headZ: 0.14, headX: -0.04, eyeScale: 1.12 });
      base.armL = { x: -0.18, z: 0.16, elbow: 0.3 };
      base.armR = { x: -0.18, z: 0.16, elbow: 0.3 };
      break;
    case "thinking":
      Object.assign(base, { headZ: -0.12, headX: -0.09, mouth: "flat" });
      base.armR = { x: -1.05, z: -0.3, elbow: -2.05 };
      base.armL = { x: 0.1, z: 0.1, elbow: 0.1 };
      break;
    case "talking":
      Object.assign(base, { mouth: "talk" });
      base.armL = { x: -0.35, z: 0.22, elbow: -0.7 };
      base.armR = { x: -0.5, z: 0.3, elbow: -0.9 };
      break;
    case "happy":
      Object.assign(base, { headX: -0.06, eye: "happy", mouth: "grin" });
      base.armL = { x: -0.3, z: 2.6, elbow: 0.35 };
      base.armR = { x: -0.3, z: 2.6, elbow: 0.35 };
      break;
    case "held":
      Object.assign(base, { eyeScale: 1.18, mouth: "o" });
      base.armL = { x: 0, z: 2.1, elbow: 0.25 };
      base.armR = { x: 0, z: 2.1, elbow: 0.25 };
      break;
    case "sleepy":
      Object.assign(base, { headZ: 0.13, headX: 0.2, eye: "closed", mouth: "flat" });
      base.armL = LIMP;
      base.armR = LIMP;
      break;
    case "error":
      Object.assign(base, { headX: 0.1, eye: "sad", mouth: "o" });
      base.armL = LIMP;
      base.armR = LIMP;
      break;
  }
  if (gesture === "wave") base.armR = { x: -0.25, z: 2.45, elbow: 0.4 };
  if (gesture === "point") {
    base.armR = { x: -1.5, z: 0.18, elbow: -0.15 };
    base.point = true;
  }
  return base;
}

const damp = (cur: number, target: number, lambda: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));

interface Channels {
  headX: number;
  headY: number;
  headZ: number;
  eyeScale: number;
  lookX: number;
  lookY: number;
  armL: ArmPose;
  armR: ArmPose;
  point: number;
}

/* ── Controller (imperative — created once per canvas) ──────────────────── */

interface Inputs {
  mood: MascotMood;
  blink: boolean;
  ex: number;
  ey: number;
  gesture: MascotGesture;
}

class NovaController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private rig: Rig;
  private pmrem: THREE.Texture | null = null;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private visible = true;
  private reduced: boolean;
  private inputs: Inputs = { mood: "idle", blink: false, ex: 0, ey: 0, gesture: null };
  private ch: Channels = {
    headX: 0,
    headY: 0,
    headZ: 0,
    eyeScale: 1,
    lookX: 0,
    lookY: 0,
    armL: { ...HANG },
    armR: { ...HANG },
    point: 0,
  };
  private boopAt = -10;
  private shakeAt = -10;
  private prevMood: MascotMood = "idle";
  private io: IntersectionObserver | null = null;
  private onVis = () => {
    this.visible = document.visibilityState === "visible" && this.inView;
    if (this.visible) this.start();
  };
  private inView = true;

  constructor(private canvas: HTMLCanvasElement, size: number) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    this.camera.position.set(0, 0.62, 6.6);
    this.camera.lookAt(0, 0.62, 0);

    // Lights: soft sky/ground, a warm key, a cool fill and a coral rim from
    // behind that ties the shell highlights to the accent.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa6c4, 0.75));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.9);
    key.position.set(2.6, 4.2, 3.4);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.65);
    fill.position.set(-3.2, 1.2, 2.4);
    const rim = new THREE.DirectionalLight(0xff8a96, 0.9);
    rim.position.set(0.5, 2.4, -3.4);
    this.scene.add(key, fill, rim);

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.pmrem = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.scene.environment = this.pmrem;
    this.scene.environmentIntensity = 0.5;

    this.rig = buildRig(readPalette());
    this.rig.root.position.y = -0.78;
    this.scene.add(this.rig.root);

    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.setSize(size);

    document.addEventListener("visibilitychange", this.onVis);
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        this.onVis();
      });
      this.io.observe(canvas);
    }
    this.start();
  }

  setSize(size: number) {
    this.renderer.setSize(size, size, false);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.render();
  }

  set(inputs: Inputs) {
    this.inputs = inputs;
    if (!this.raf) this.start();
  }

  boop() {
    this.boopAt = this.clock;
    if (!this.raf) this.start();
  }

  private start() {
    if (this.raf || !this.visible) return;
    // Resync on the next frame's own timestamp: mixing performance.now()
    // with rAF time produced a huge negative dt after a long mount task,
    // and the exponential easing then diverged instead of settling.
    this.last = -1;
    this.raf = window.requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (this.last < 0) this.last = now;
    const dt = THREE.MathUtils.clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.clock += dt;
    this.update(dt);
    this.render();
    if (this.visible) this.raf = window.requestAnimationFrame(this.tick);
  };

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  private update(dt: number) {
    const { mood, blink, ex, ey, gesture } = this.inputs;
    const t = this.clock;
    const r = this.rig;
    const ch = this.ch;
    const still = this.reduced;

    if (mood === "error" && this.prevMood !== "error") this.shakeAt = t;
    this.prevMood = mood;

    const pose = poseFor(mood, gesture);

    // Head: mood tilt + pointer look (thinking glances up and away instead).
    const look =
      mood === "thinking"
        ? { x: 1.6, y: -2.6 }
        : { x: THREE.MathUtils.clamp(ex, -5, 5), y: THREE.MathUtils.clamp(ey, -5, 5) };
    ch.lookX = damp(ch.lookX, look.x, 9, dt);
    ch.lookY = damp(ch.lookY, look.y, 9, dt);
    ch.headX = damp(ch.headX, pose.headX, 7, dt);
    ch.headY = damp(ch.headY, 0, 7, dt);
    ch.headZ = damp(ch.headZ, pose.headZ, 7, dt);
    const nod = mood === "talking" && !still ? Math.sin(t * 7.5) * 0.045 : 0;
    r.head.rotation.set(ch.headX + ch.lookY * 0.04 + nod, ch.lookX * 0.06, ch.headZ);
    r.eyes.position.x = ch.lookX * 0.014;
    r.eyes.position.y = 0.05 - ch.lookY * 0.01;

    // Eyes
    ch.eyeScale = damp(ch.eyeScale, pose.eyeScale, 12, dt);
    const kind: EyeKind = pose.eye;
    const round = kind === "round" || kind === "sad";
    r.eyeL.visible = round;
    r.eyeR.visible = round;
    r.arcL.visible = !round;
    r.arcR.visible = !round;
    if (round) {
      const open = blink ? 0.08 : 1;
      const tilt = kind === "sad" ? 0.45 : 0;
      const sy = kind === "sad" ? 0.55 : 1;
      r.eyeL.scale.set(ch.eyeScale, ch.eyeScale * open * sy, 1);
      r.eyeR.scale.copy(r.eyeL.scale);
      r.eyeL.rotation.z = -tilt;
      r.eyeR.rotation.z = tilt;
    } else {
      // happy = "^ ^" (arc up), closed = "‿ ‿" (arc down)
      const flip = kind === "closed" ? Math.PI : 0;
      r.arcL.rotation.z = flip;
      r.arcR.rotation.z = flip;
      r.arcL.position.y = kind === "closed" ? 0.03 : -0.03;
      r.arcR.position.y = r.arcL.position.y;
    }

    // Mouth
    for (const [k, m] of Object.entries(r.mouths)) m.visible = k === pose.mouth;
    if (pose.mouth === "talk") {
      const a = still ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t * 9.5));
      r.mouthTalk.scale.set(1, a, 1);
    }

    // Arms — eased toward the target pose; waving oscillates the forearm.
    const easeArm = (cur: ArmPose, target: ArmPose) => {
      cur.x = damp(cur.x, target.x, 8, dt);
      cur.z = damp(cur.z, target.z, 8, dt);
      cur.elbow = damp(cur.elbow, target.elbow, 8, dt);
    };
    easeArm(ch.armL, pose.armL);
    easeArm(ch.armR, pose.armR);
    const sway = still ? 0 : Math.sin(t * 1.8) * 0.03;
    const applyArm = (arm: Arm, p: ArmPose, side: -1 | 1, osc: number) => {
      arm.shoulder.rotation.set(p.x, 0, side * (p.z + sway));
      arm.elbow.rotation.set(p.elbow, 0, side * osc);
      arm.hand.rotation.z = side * osc * 0.6;
    };
    const waveOsc = gesture === "wave" && !still ? Math.sin(t * 11) * 0.38 : 0;
    const talkOsc = mood === "talking" && !still ? Math.sin(t * 4.2) * 0.12 : 0;
    applyArm(r.armL, ch.armL, -1, mood === "talking" ? -talkOsc : 0);
    applyArm(r.armR, ch.armR, 1, waveOsc + talkOsc);

    // Fingers: curl all but the index when pointing.
    ch.point = damp(ch.point, pose.point ? 1 : 0, 10, dt);
    r.armR.fingers.forEach((f, i) => {
      const curl = i === 2 ? 0 : ch.point;
      f.scale.y = 1 - curl * 0.6;
      f.position.y = -0.26 + curl * 0.05;
    });
    r.armR.hand.rotation.x = -ch.point * 0.5;
    r.armL.fingers.forEach((f) => {
      f.scale.y = 1;
    });

    // Whole-body life: hover bob, breathing, happy hop, error shake, boop
    // squash (about the underside, like the CSS boing).
    const bob = still || mood === "sleepy" ? 0 : Math.sin(t * 1.8) * 0.05;
    const hop = mood === "happy" && !still ? Math.abs(Math.sin(t * 6)) * 0.12 : 0;
    const breathe = still ? 0 : Math.sin(t * 1.75) * (mood === "sleepy" ? 0.018 : 0.012);
    let sx = 1 + breathe * 0.5;
    let sy = 1 + breathe;
    const bu = (t - this.boopAt) / 0.62;
    if (bu >= 0 && bu < 1 && !still) {
      const s = Math.exp(-3.2 * bu) * Math.sin(bu * Math.PI * 2.6);
      sx *= 1 + s * 0.26;
      sy *= 1 - s * 0.3;
    }
    const su = (t - this.shakeAt) / 1.1;
    const shake = su >= 0 && su < 1 && !still ? Math.sin(su * Math.PI * 10) * 0.07 * (1 - su) : 0;
    r.root.scale.set(sx, sy, sx);
    r.root.position.set(shake, -0.78 + bob + hop, 0);
    r.root.rotation.z = still ? 0 : Math.sin(t * 1.8) * 0.012;

    // Glows: dim asleep, pulse while thinking.
    const dim = mood === "sleepy" ? 0.3 : 1;
    r.eyeMat.emissiveIntensity = 0.85 * dim;
    r.earMat.emissiveIntensity = 0.35 * dim;
    const beatSpeed = mood === "thinking" ? 9 : mood === "error" ? 0 : 2.6;
    r.pulse.emissiveIntensity =
      mood === "error" ? 0.2 : (0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * beatSpeed))) * dim;
  }

  dispose() {
    window.cancelAnimationFrame(this.raf);
    this.raf = 0;
    document.removeEventListener("visibilitychange", this.onVis);
    this.io?.disconnect();
    this.rig.disposables.forEach((d) => d.dispose());
    this.pmrem?.dispose();
    this.renderer.dispose();
    // Release the GL context — but only once the canvas is really gone. In
    // dev, StrictMode unmounts and remounts on the same element, and a
    // renderer created on a force-lost context throws.
    const { canvas, renderer } = this;
    window.setTimeout(() => {
      if (!canvas.isConnected) renderer.forceContextLoss();
    }, 0);
  }
}

/* ── React wrapper ──────────────────────────────────────────────────────── */

export function Nova3D({
  size,
  mood,
  blink,
  ex,
  ey,
  gesture,
  boopTick,
  onUnavailable,
  className,
  style,
}: Nova3DProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctrl = React.useRef<NovaController | null>(null);
  const unavailable = React.useRef(onUnavailable);

  React.useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);

  // Build once per canvas. A missing WebGL context (old devices, privacy
  // settings, exhausted contexts) hands control back to the SVG.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let c: NovaController;
    try {
      c = new NovaController(canvas, size);
    } catch {
      unavailable.current();
      return;
    }
    ctrl.current = c;
    return () => {
      c.dispose();
      ctrl.current = null;
    };
    // `size` is applied by the effect below; only the canvas identity matters
    // here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    ctrl.current?.setSize(size);
  }, [size]);

  React.useEffect(() => {
    ctrl.current?.set({ mood, blink, ex, ey, gesture });
  }, [mood, blink, ex, ey, gesture]);

  const firstBoop = React.useRef(true);
  React.useEffect(() => {
    // Skip the mount pass — a tick is a boop only once it changes.
    if (firstBoop.current) {
      firstBoop.current = false;
      return;
    }
    ctrl.current?.boop();
  }, [boopTick]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: size, height: size, ...style }}
      aria-hidden
    />
  );
}
