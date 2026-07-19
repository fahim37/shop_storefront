"use client";

import * as React from "react";
import { create } from "zustand";

import { useAssistantStore } from "@/lib/assistant/use-assistant-store";

/* ----------------------------------------------------------------------------
 * Nova — the shopping-assistant mascot, a gold star sprite.
 *
 * A hand-drawn SVG four-point star with moods (idle / listening / thinking /
 * talking / happy / held), a blink cycle, pupils that follow pointer, taps
 * and device tilt, a boop interaction (squash + heart/star bursts + speech
 * bubble + haptics) and a grab-and-fling drag with a spring return.
 * Keyframes live in globals.css under the `mascot-*` prefix and collapse
 * under prefers-reduced-motion. Colors come from the `--mascot-*` tokens
 * (amber body, navy face) so a rebrand recolors her automatically.
 *
 * Three surfaces consume this module:
 *   - MascotHero    — the big interactive character in the dock thread
 *   - MascotAvatar  — static mini face beside assistant bubbles
 *   - MascotSvg     — raw renderer (FAB, header badge)
 * plus useMascotMood/useMascotUi to sync mood across all of them.
 * ------------------------------------------------------------------------- */

export type MascotMood = "idle" | "listening" | "thinking" | "talking" | "happy" | "held";

/* ── Cross-surface UI bits (composer focus, boop relay) ─────────────────── */

interface MascotUiState {
  /** Composer focus → "listening" mood on every Nova on screen. */
  composerFocused: boolean;
  /** Bumped by remote boopers (header badge) — the hero plays the boop. */
  boopTick: number;
  setComposerFocused: (v: boolean) => void;
  boop: () => void;
}

export const useMascotUi = create<MascotUiState>((set) => ({
  composerFocused: false,
  boopTick: 0,
  setComposerFocused: (v) => set({ composerFocused: v }),
  boop: () => set((s) => ({ boopTick: s.boopTick + 1 })),
}));

/**
 * Mood derived from the assistant stream: waiting/tool-running reads as
 * "thinking", token flow as "talking", a finished reply flashes "happy",
 * a focused composer is "listening". "held" is local to the hero (dragging).
 */
export function useMascotMood(): MascotMood {
  const isStreaming = useAssistantStore((s) => s.isStreaming);
  const hasLiveText = useAssistantStore((s) => s.streamText.length > 0 && !s.streamStale);
  const composerFocused = useMascotUi((s) => s.composerFocused);

  // "Happy" is a 1.4s afterglow when a stream finishes — driven off the
  // store subscription (an external system) rather than render state.
  const [happy, setHappy] = React.useState(false);
  React.useEffect(() => {
    let timer = 0;
    const unsub = useAssistantStore.subscribe((s, prev) => {
      if (!prev.isStreaming || s.isStreaming) return;
      setHappy(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHappy(false), 1400);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  if (isStreaming) return hasLiveText ? "talking" : "thinking";
  if (happy) return "happy";
  if (composerFocused) return "listening";
  return "idle";
}

export const MASCOT_STATUS: Record<MascotMood, string> = {
  idle: "Online — ask anything",
  listening: "Listening…",
  thinking: "Thinking…",
  talking: "Typing…",
  happy: "Giggling",
  held: "Wheee!",
};

/* ── SVG renderer ───────────────────────────────────────────────────────── */

function starPath(cx: number, cy: number, r: number): string {
  return (
    `M${cx},${cy - r} L${cx + r * 0.26},${cy - r * 0.26} L${cx + r},${cy} ` +
    `L${cx + r * 0.26},${cy + r * 0.26} L${cx},${cy + r} L${cx - r * 0.26},${cy + r * 0.26} ` +
    `L${cx - r},${cy} L${cx - r * 0.26},${cy - r * 0.26} Z`
  );
}

const FACE = "var(--mascot-face)";

function Face({
  mood,
  blink,
  ex,
  ey,
  cx = 100,
  cy = 94,
  s = 0.8,
}: {
  mood: MascotMood;
  blink: boolean;
  ex: number;
  ey: number;
  cx?: number;
  cy?: number;
  /** Overall face scale — Nova's star body has a narrow waist, so ~0.8. */
  s?: number;
}) {
  const held = mood === "held";
  // Thinking looks up-and-away instead of tracking the pointer.
  const eo = mood === "thinking" ? { x: 2, y: -4 } : { x: ex, y: ey };

  const eye = (x: number) =>
    mood === "happy" && !blink ? (
      <path
        key={x}
        d={`M${x - 8 * s},${cy + 3 * s} Q${x},${cy - 8 * s} ${x + 8 * s},${cy + 3 * s}`}
        stroke={FACE}
        strokeWidth={3.6 * s}
        fill="none"
        strokeLinecap="round"
      />
    ) : (
      <g key={x}>
        <ellipse
          cx={x}
          cy={cy}
          rx={(held ? 9.5 : 8) * s}
          ry={blink ? 1.5 : (held ? 11 : 9) * s}
          fill="#fff"
        />
        {!blink ? (
          <>
            <circle cx={x + eo.x} cy={cy + eo.y * 0.6} r={(held ? 5 : 4.2) * s} fill={FACE} />
            <circle cx={x + eo.x + 1.6} cy={cy + eo.y * 0.6 - 1.8} r={1.5 * s} fill="#fff" />
          </>
        ) : null}
      </g>
    );

  let mouth: React.ReactNode;
  if (mood === "talking") {
    mouth = (
      <ellipse
        cx={cx}
        cy={cy + 22 * s}
        rx={7 * s}
        ry={6 * s}
        fill={FACE}
        style={{
          animation: "mascot-talkmouth .28s ease-in-out infinite",
          transformOrigin: `${cx}px ${cy + 22 * s}px`,
        }}
      />
    );
  } else if (mood === "thinking" || held) {
    mouth = <circle cx={cx} cy={cy + 22 * s} r={(held ? 4.5 : 3.5) * s} fill={FACE} />;
  } else if (mood === "happy") {
    mouth = (
      <path
        d={`M${cx - 11 * s},${cy + 17 * s} Q${cx},${cy + 32 * s} ${cx + 11 * s},${cy + 17 * s} Z`}
        fill={FACE}
      />
    );
  } else {
    mouth = (
      <path
        d={`M${cx - 9 * s},${cy + 19 * s} Q${cx},${cy + 27 * s} ${cx + 9 * s},${cy + 19 * s}`}
        stroke={FACE}
        strokeWidth={3 * s}
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  return (
    <g>
      {eye(cx - 15 * s)}
      {eye(cx + 15 * s)}
      {mouth}
      <ellipse
        cx={cx - 26 * s}
        cy={cy + 12 * s}
        rx={5.5 * s}
        ry={3.5 * s}
        fill="#FF8FB1"
        opacity={0.6}
      />
      <ellipse
        cx={cx + 26 * s}
        cy={cy + 12 * s}
        rx={5.5 * s}
        ry={3.5 * s}
        fill="#FF8FB1"
        opacity={0.6}
      />
    </g>
  );
}

export interface MascotSvgProps {
  /** Rendered size in px (the star is symmetric — width = height). */
  size: number;
  mood?: MascotMood;
  blink?: boolean;
  /** Pupil offset (eye-follow), in viewBox units, max ~5. */
  ex?: number;
  ey?: number;
  /** Warm amber drop-shadow glow (hero, FAB). */
  glow?: boolean;
  /** White halo, for placement on the colored header. */
  halo?: boolean;
  /** Disables the always-on animations (used by the tiny static avatars). */
  still?: boolean;
  className?: string;
}

export function MascotSvg({
  size,
  mood = "idle",
  blink = false,
  ex = 0,
  ey = 0,
  glow = false,
  halo = false,
  still = false,
  className,
}: MascotSvgProps) {
  // Gradient defs need document-unique ids — one sprite per React instance.
  const gid = `mascot-${React.useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  // No ambient 0-offset halo — it washed the character out to a white blur.
  // glow is just a faint warm shadow beneath her; halo is a much quieter
  // white edge for the colored header.
  const filter = halo
    ? `drop-shadow(0 0 ${Math.round(size * 0.1)}px rgb(255 255 255 / 0.4))`
    : glow
      ? `drop-shadow(0 4px ${Math.round(size * 0.08)}px color-mix(in oklch, var(--amber-deep) 22%, transparent))`
      : undefined;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", overflow: "visible", filter }}
      aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="90%">
          <stop offset="0%" style={{ stopColor: "var(--mascot-body-1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-body-2)" }} />
        </radialGradient>
      </defs>
      {mood === "thinking" ? (
        <g
          style={{
            animation: "mascot-spinstar 1.6s linear infinite",
            transformOrigin: "154px 30px",
          }}
        >
          <path d={starPath(154, 30, 10)} fill="var(--blue)" />
          <path d={starPath(154, 30, 4.5)} fill="var(--blue-soft)" />
        </g>
      ) : null}
      <g
        style={
          still
            ? undefined
            : {
                animation: "mascot-breathe 3.4s ease-in-out infinite",
                transformOrigin: "100px 100px",
              }
        }
      >
        <path
          d="M100,10 C112,68 132,88 190,100 C132,112 112,132 100,190 C88,132 68,112 10,100 C68,88 88,68 100,10 Z"
          fill={`url(#${gid})`}
        />
        {/* Blue twinkle satellites riding her points — the brand-blue tie-in. */}
        <circle
          cx={160}
          cy={42}
          r={6}
          fill="var(--blue)"
          style={
            still
              ? { opacity: 0.6 }
              : {
                  animation: "mascot-twinkle 2.1s ease-in-out infinite",
                  transformOrigin: "160px 42px",
                }
          }
        />
        <circle
          cx={38}
          cy={156}
          r={4.5}
          fill="var(--blue)"
          style={
            still
              ? { opacity: 0.6 }
              : {
                  animation: "mascot-twinkle 2.7s .4s ease-in-out infinite",
                  transformOrigin: "38px 156px",
                }
          }
        />
        <Face mood={mood} blink={blink} ex={ex} ey={ey} />
      </g>
      {/* Ambient stardust over her top-right shoulder — hidden on the tiny
          still avatars, and while thinking (the spinning star owns that spot). */}
      {!still && mood !== "thinking" ? (
        <g aria-hidden>
          <path
            d={starPath(158, 24, 7)}
            fill="var(--amber)"
            style={{
              animation: "mascot-twinkle 2.1s ease-in-out infinite",
              transformOrigin: "158px 24px",
            }}
          />
          <path
            d={starPath(186, 62, 5)}
            fill="var(--amber)"
            style={{
              animation: "mascot-twinkle 2.7s .4s ease-in-out infinite",
              transformOrigin: "186px 62px",
            }}
          />
          <circle
            cx={134}
            cy={12}
            r={3.2}
            fill="var(--blue)"
            style={{
              animation: "mascot-twinkle 1.8s .8s ease-in-out infinite",
              transformOrigin: "134px 12px",
            }}
          />
        </g>
      ) : null}
    </svg>
  );
}

/* ── Shared blink cycle ─────────────────────────────────────────────────── */

export function useBlink(): boolean {
  const [blink, setBlink] = React.useState(false);
  React.useEffect(() => {
    let t = 0;
    const iv = window.setInterval(() => {
      setBlink(true);
      t = window.setTimeout(() => setBlink(false), 140);
    }, 3400);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(t);
    };
  }, []);
  return blink;
}

/* ── Mini avatar (message rows / typing indicator) ──────────────────────── */

export function MascotAvatar({
  size = 26,
  mood = "idle",
  className,
}: {
  size?: number;
  mood?: MascotMood;
  className?: string;
}) {
  return (
    <span className={className ?? "mt-0.5 shrink-0"}>
      <MascotSvg size={size} mood={mood} still />
    </span>
  );
}

/* ── Hero — the interactive character ───────────────────────────────────── */

interface Burst {
  key: string;
  ang: number;
  delay: number;
  star: boolean;
}

const BOOP_WORDS = ["boop!", "hehe!", "eee!", "again!", "that tickles!"];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function HeartBit() {
  return (
    <svg width={16} height={16} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M10 17 C4 12 1 9 1 5.5 C1 3 3 1 5.5 1 C7.5 1 9.2 2.2 10 4 C10.8 2.2 12.5 1 14.5 1 C17 1 19 3 19 5.5 C19 9 16 12 10 17 Z"
        fill="#FF6B9D"
      />
    </svg>
  );
}

function StarBit() {
  return (
    <svg width={16} height={16} viewBox="0 0 20 20" aria-hidden>
      <path d={starPath(10, 10, 9)} fill="var(--amber)" />
    </svg>
  );
}

export function MascotHero({ compact = false }: { compact?: boolean }) {
  const size = compact ? 120 : 192;
  const mood = useMascotMood();
  const blink = useBlink();

  const heroRef = React.useRef<HTMLDivElement>(null);
  const [eye, setEye] = React.useState({ x: 0, y: 0 });
  const [pos, setPos] = React.useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = React.useState(false);
  const [squash, setSquash] = React.useState(false);
  const [boopMood, setBoopMood] = React.useState<MascotMood | null>(null);
  /** Short-lived bubble line (boop word / "wheee!") — beats the mood line. */
  const [transient, setTransient] = React.useState<string | null>(null);
  const [bursts, setBursts] = React.useState<Burst[]>([]);

  // Canonical gesture state — owned and mutated ONLY by the pointer handlers
  // and the spring loop; the setState calls above mirror it for rendering.
  const gesture = React.useRef({
    pos: { dx: 0, dy: 0 },
    dragging: false,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const springRaf = React.useRef(0);
  const burstSeq = React.useRef(0);
  const timers = React.useRef<number[]>([]);

  const later = React.useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  React.useEffect(() => {
    const pending = timers.current;
    const raf = springRaf;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      window.cancelAnimationFrame(raf.current);
    };
  }, []);

  const tiltPermAsked = React.useRef(false);

  const boop = React.useCallback(() => {
    // Mobile: a soft haptic tap, and (iOS) use this user gesture to unlock
    // gyroscope events so tilt-follow works there too. Both silently no-op
    // where unsupported.
    navigator.vibrate?.(12);
    if (!tiltPermAsked.current) {
      tiltPermAsked.current = true;
      const D = window.DeviceOrientationEvent as
        | { requestPermission?: () => Promise<string> }
        | undefined;
      void D?.requestPermission?.().catch(() => {});
    }
    const id = ++burstSeq.current;
    const n = 5;
    setBursts((bs) => [
      ...bs,
      ...Array.from({ length: n }, (_, i) => ({
        key: `${id}-${i}`,
        ang: -80 + i * (160 / (n - 1)),
        delay: i * 0.05,
        star: i % 3 === 0,
      })),
    ]);
    setSquash(true);
    setBoopMood("happy");
    const word = BOOP_WORDS[Math.floor(Math.random() * BOOP_WORDS.length)];
    setTransient(word);
    later(() => setSquash(false), 620);
    later(() => setBoopMood(null), 1100);
    later(() => setBursts((bs) => bs.filter((b) => !b.key.startsWith(`${id}-`))), 1150);
    later(() => setTransient((b) => (b === word ? null : b)), 1600);
  }, [later]);

  // Remote boops (header badge) arrive through the UI store subscription.
  React.useEffect(() => {
    const unsub = useMascotUi.subscribe((s, prev) => {
      if (s.boopTick !== prev.boopTick) boop();
    });
    return unsub;
  }, [boop]);

  const release = React.useCallback(() => {
    const g = gesture.current;
    g.dragging = false;
    setDragging(false);
    if (!g.moved) {
      g.pos = { dx: 0, dy: 0 };
      setPos(g.pos);
      boop();
      return;
    }
    // Spring back with a damped rebound.
    let { dx, dy } = g.pos;
    let vx = 0;
    let vy = 0;
    const step = () => {
      vx += -0.16 * dx - 0.12 * vx;
      vy += -0.16 * dy - 0.12 * vy;
      dx += vx;
      dy += vy;
      if (Math.hypot(dx, dy) < 0.5 && Math.hypot(vx, vy) < 0.5) {
        g.pos = { dx: 0, dy: 0 };
        setPos(g.pos);
        return;
      }
      g.pos = { dx, dy };
      setPos(g.pos);
      springRaf.current = window.requestAnimationFrame(step);
    };
    navigator.vibrate?.([8, 40, 8]);
    setTransient("wheee!");
    later(() => setTransient((b) => (b === "wheee!" ? null : b)), 1400);
    springRaf.current = window.requestAnimationFrame(step);
  }, [boop, later]);

  // Eye life. On desktop the pupils follow the mouse; on touch there is no
  // hover, so they also (a) glance at every tap, (b) follow device tilt via
  // the gyroscope, and (c) wander on their own after ~2.6s without input, so
  // she never sits dead-eyed on a phone.
  React.useEffect(() => {
    const timeouts = new Set<number>();
    let lastInput = 0;

    const applyEye = (nx: number, ny: number) => {
      setEye((p) => (Math.abs(nx - p.x) > 0.4 || Math.abs(ny - p.y) > 0.4 ? { x: nx, y: ny } : p));
    };
    const lookToward = (clientX: number, clientY: number) => {
      const el = heroRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ddx = clientX - (r.left + r.width / 2);
      const ddy = clientY - (r.top + r.height / 2);
      const len = Math.max(Math.hypot(ddx, ddy), 1);
      const m = Math.min(len / 60, 1) * 5;
      applyEye((ddx / len) * m, (ddy / len) * m);
    };

    const onMove = (e: PointerEvent) => {
      lastInput = Date.now();
      const g = gesture.current;
      if (g.dragging) {
        const dx = clamp(e.clientX - g.startX, -60, 60);
        const dy = clamp(e.clientY - g.startY, -60, 60);
        if (Math.hypot(dx, dy) > 8) g.moved = true;
        g.pos = { dx, dy };
        setPos(g.pos);
        return;
      }
      lookToward(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      lastInput = Date.now();
      if (!gesture.current.dragging) lookToward(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (gesture.current.dragging) release();
    };
    // Tilt-follow. Fires freely on Android; on iOS only after the permission
    // granted from the first boop (see boop()). beta ≈ 40° is the natural
    // phone-in-hand angle, so that reads as "level".
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      lastInput = Date.now();
      applyEye(clamp(e.gamma / 12, -5, 5), clamp((e.beta - 40) / 14, -5, 5));
    };
    // Idle wander: a soft glance somewhere, then settle back to center.
    const wander = window.setInterval(() => {
      if (Date.now() - lastInput < 2600) return;
      const a = Math.random() * Math.PI * 2;
      const m = 2 + Math.random() * 3;
      setEye({ x: Math.cos(a) * m, y: Math.sin(a) * m * 0.6 });
      const t = window.setTimeout(() => {
        timeouts.delete(t);
        if (Date.now() - lastInput >= 2600) setEye({ x: 0, y: 0 });
      }, 900);
      timeouts.add(t);
    }, 3200);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("deviceorientation", onTilt);
      window.clearInterval(wander);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [release]);

  const grab = (e: React.PointerEvent) => {
    e.preventDefault();
    const g = gesture.current;
    g.startX = e.clientX - g.pos.dx;
    g.startY = e.clientY - g.pos.dy;
    g.moved = false;
    g.dragging = true;
    window.cancelAnimationFrame(springRaf.current);
    setDragging(true);
  };

  const renderMood: MascotMood = dragging ? "held" : (boopMood ?? mood);
  const dist = Math.hypot(pos.dx, pos.dy);
  const stretch = dragging
    ? `scale(${1 + dist / 800}, ${1 - dist / 900}) rotate(${pos.dx * 0.08}deg)`
    : `rotate(${pos.dx * 0.08}deg)`;

  // Speech bubble, derived: gesture words beat mood lines beat the greeting
  // (big hero only — it sits on the empty thread, so "hi!" is its idle line).
  const moodBubble =
    renderMood === "listening" ? "i'm all ears!" : renderMood === "thinking" ? "hmm…" : null;
  const greeting = !compact && renderMood === "idle" ? "hi! i'm Nova!" : null;
  const bubble = dragging ? null : (transient ?? moodBubble ?? greeting);

  return (
    <div
      className="relative grid place-items-center"
      style={{ minHeight: size + 16, padding: "4px 0" }}
    >
      <div
        ref={heroRef}
        role="button"
        tabIndex={0}
        aria-label="Nova — tap for a boop"
        onPointerDown={grab}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            boop();
          }
        }}
        className="relative select-none outline-none"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          transform: `translate(${pos.dx}px, ${pos.dy}px) ${stretch}`,
          transition: dragging ? "none" : "transform .1s linear",
        }}
      >
        <div style={{ animation: dragging ? "none" : "mascot-floaty 3.6s ease-in-out infinite" }}>
          <div
            className="relative"
            style={{
              animation: squash ? "mascot-boing .6s cubic-bezier(.36,.07,.19,.97) both" : "none",
              transformOrigin: "50% 88%",
            }}
          >
            <MascotSvg size={size} mood={renderMood} blink={blink} ex={eye.x} ey={eye.y} glow />

            {/* Thinking — drifting thought dots by the head */}
            {renderMood === "thinking" ? (
              <div aria-hidden className="absolute -top-1 left-[72%]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="absolute rounded-full bg-blue-soft"
                    style={{
                      left: i * 13,
                      top: -i * 12,
                      width: 11 - i * 3,
                      height: 11 - i * 3,
                      animation: `mascot-dotb 1.2s ${i * 0.18}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            ) : null}

            {/* Listening — tiny equalizer under the body */}
            {renderMood === "listening" ? (
              <div
                aria-hidden
                className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-1"
                style={{ height: 16 }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-sm bg-primary"
                    style={{
                      height: 15,
                      animation: `mascot-wavebar ${0.5 + (i % 3) * 0.15}s ${i * 0.08}s ease-in-out infinite`,
                      transformOrigin: "bottom",
                    }}
                  />
                ))}
              </div>
            ) : null}

            {/* Boop bursts — hearts & stars flying off the head */}
            {bursts.map((b) => (
              <span
                key={b.key}
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[34%] z-3"
                style={{ transform: `rotate(${b.ang}deg)` }}
              >
                <span
                  className="block"
                  style={{ animation: `mascot-flyup .95s ${b.delay}s ease-out both` }}
                >
                  {b.star ? <StarBit /> : <HeartBit />}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Ground shadow */}
        <div
          aria-hidden
          className="mx-auto mt-0.5 rounded-full"
          style={{
            width: size * 0.5,
            height: 10,
            background: "radial-gradient(ellipse, rgb(22 29 63 / 0.35), transparent 70%)",
            animation: "mascot-shadowpulse 3.6s ease-in-out infinite",
          }}
        />
      </div>

      {/* Speech bubble */}
      {bubble ? (
        <div className="pointer-events-none absolute right-1/2 top-1 z-2 translate-x-[calc(100%+48px)] animate-pop whitespace-nowrap rounded-2xl rounded-bl-xs border-2 border-amber-soft bg-card px-3 py-1.5 text-13 font-extrabold text-amber-deep shadow-[var(--shadow-card)] motion-reduce:animate-none">
          {bubble}
        </div>
      ) : null}
    </div>
  );
}
