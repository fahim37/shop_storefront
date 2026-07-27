"use client";

import * as React from "react";
import { Heart, Package, ShoppingBag, Tag } from "lucide-react";
import { create } from "zustand";

import { useAssistantStore } from "@/lib/assistant/use-assistant-store";

/* ----------------------------------------------------------------------------
 * Nova — the shopping-assistant mascot, a friendly little shopping robot.
 *
 * A hand-drawn SVG bot (warm ivory shell, navy visor, glowing gold eyes,
 * floating arms, a gold cart emblem on the chest) with moods (idle / listening /
 * thinking / talking / happy / held / sleepy / error), a blink cycle, eyes
 * whose highlights follow pointer, taps and device tilt, arm gestures (a
 * hello wave on open, a "take a look!" point when a reply brings product
 * cards), a boop interaction (squash + heart/star bursts + speech bubble +
 * haptics), a grab-and-fling drag with a spring return, a doze-off sleep
 * state after page inactivity (Zzz on the FAB too) and an orbit of shopping
 * icons around the empty-thread hero.
 * Keyframes live in globals.css under the `mascot-*` prefix and collapse
 * under prefers-reduced-motion (the purely decorative orbit and sparkles
 * hide entirely). Colors come from the `--mascot-*` tokens (ivory shell,
 * navy visor, gold glow) so a rebrand recolors the robot automatically.
 *
 * Surfaces consuming this module:
 *   - MascotHero    — the big interactive character in the dock thread
 *   - MascotAvatar  — static mini headshot beside assistant bubbles
 *   - MascotSvg     — raw renderer (FAB, header badge)
 * plus useMascotMood/useMascotUi/useSleepDriver to sync mood across them.
 * ------------------------------------------------------------------------- */

export type MascotMood =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "happy"
  | "held"
  | "sleepy"
  | "error";

/* ── Cross-surface UI bits (composer focus, boop relay, sleep) ──────────── */

interface MascotUiState {
  /** Composer focus → "listening" mood on every Nova on screen. */
  composerFocused: boolean;
  /** Bumped by remote boopers (header badge) — the hero plays the boop. */
  boopTick: number;
  /** Ambient doze — set by useSleepDriver after page inactivity. */
  sleepy: boolean;
  setComposerFocused: (v: boolean) => void;
  boop: () => void;
  setSleepy: (v: boolean) => void;
}

export const useMascotUi = create<MascotUiState>((set) => ({
  composerFocused: false,
  boopTick: 0,
  sleepy: false,
  setComposerFocused: (v) => set({ composerFocused: v }),
  boop: () => set((s) => ({ boopTick: s.boopTick + 1 })),
  setSleepy: (v) => set({ sleepy: v }),
}));

const SLEEP_AFTER_MS = 30_000;

/**
 * Ambient sleep loop, mounted once from AssistantDock: after 30s without any
 * page input Nova dozes off (FAB and dock alike); pointer/key/scroll input,
 * assistant activity, boops or composer focus wake the robot. Listeners are
 * passive and the timer re-arms at most once a second, so this costs nothing.
 */
export function useSleepDriver(): void {
  React.useEffect(() => {
    let timer = 0;
    let lastArm = 0;
    const arm = () => {
      lastArm = Date.now();
      window.clearTimeout(timer);
      timer = window.setTimeout(doze, SLEEP_AFTER_MS);
    };
    const doze = () => {
      const busy =
        useAssistantStore.getState().isStreaming ||
        useMascotUi.getState().composerFocused;
      if (busy) arm();
      else useMascotUi.getState().setSleepy(true);
    };
    const wake = () => {
      if (useMascotUi.getState().sleepy) useMascotUi.getState().setSleepy(false);
      if (Date.now() - lastArm > 1000) arm();
    };
    arm();
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    const unsubStore = useAssistantStore.subscribe((s, prev) => {
      if (s.isStreaming !== prev.isStreaming || s.messages !== prev.messages) wake();
    });
    const unsubUi = useMascotUi.subscribe((s, prev) => {
      if (s.composerFocused !== prev.composerFocused || s.boopTick !== prev.boopTick) {
        wake();
      }
    });
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
      unsubStore();
      unsubUi();
    };
  }, []);
}

/**
 * Mood derived from the assistant stream: waiting/tool-running reads as
 * "thinking", token flow as "talking", a finished reply flashes "happy", a
 * failed one flashes "error" (with a shake), a focused composer is
 * "listening", page inactivity is "sleepy". "held" is local to the hero.
 */
export function useMascotMood(): MascotMood {
  const isStreaming = useAssistantStore((s) => s.isStreaming);
  const hasLiveText = useAssistantStore((s) => s.streamText.length > 0 && !s.streamStale);
  const composerFocused = useMascotUi((s) => s.composerFocused);
  const sleepy = useMascotUi((s) => s.sleepy);

  // "Happy" is a 1.4s afterglow when a stream finishes; "error" a 4.2s flash
  // when a turn fails — both driven off the store subscription (an external
  // system) rather than render state.
  const [happy, setHappy] = React.useState(false);
  const [errorFlash, setErrorFlash] = React.useState(false);
  React.useEffect(() => {
    let happyTimer = 0;
    let errorTimer = 0;
    const unsub = useAssistantStore.subscribe((s, prev) => {
      if (prev.isStreaming && !s.isStreaming) {
        setHappy(true);
        window.clearTimeout(happyTimer);
        happyTimer = window.setTimeout(() => setHappy(false), 1400);
      }
      if (s.error && s.error !== prev.error) {
        setErrorFlash(true);
        window.clearTimeout(errorTimer);
        errorTimer = window.setTimeout(() => setErrorFlash(false), 4200);
      }
    });
    return () => {
      unsub();
      window.clearTimeout(happyTimer);
      window.clearTimeout(errorTimer);
    };
  }, []);

  if (isStreaming) return hasLiveText ? "talking" : "thinking";
  if (errorFlash) return "error";
  if (happy) return "happy";
  if (composerFocused) return "listening";
  if (sleepy) return "sleepy";
  return "idle";
}

export const MASCOT_STATUS: Record<MascotMood, string> = {
  idle: "Online — ask anything",
  listening: "Listening…",
  thinking: "Thinking…",
  talking: "Typing…",
  happy: "Happy to help!",
  held: "Wheee!",
  sleepy: "Power saving… say hi",
  error: "Hit a snag — try again",
};

/* ── SVG renderer ───────────────────────────────────────────────────────── */

const GLOW = "var(--mascot-glow)";
const ACCENT = "var(--mascot-accent)";
const ACCENT_DEEP = "var(--mascot-accent-deep)";
const EAR_LIGHT = "var(--mascot-blue-glow)";
/** Lit antenna LED — near-white warm gold, lighter than the antenna itself. */
const LED_LIT = "color-mix(in srgb, var(--mascot-glow) 40%, white)";
const SAD = "var(--mascot-sad)";
const OUTLINE = "var(--mascot-outline)";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function starPath(cx: number, cy: number, r: number): string {
  return (
    `M${cx},${cy - r} L${cx + r * 0.26},${cy - r * 0.26} L${cx + r},${cy} ` +
    `L${cx + r * 0.26},${cy + r * 0.26} L${cx},${cy + r} L${cx - r * 0.26},${cy + r * 0.26} ` +
    `L${cx - r},${cy} L${cx - r * 0.26},${cy - r * 0.26} Z`
  );
}

/** Eyes centers (82/118, 59) + mouth (100, ~75), all inside the visor. */
function RobotFace({
  mood,
  blink,
  ex,
  ey,
  gid,
  still,
}: {
  mood: MascotMood;
  blink: boolean;
  ex: number;
  ey: number;
  gid: string;
  still: boolean;
}) {
  const held = mood === "held";
  // Thinking looks up-and-away instead of tracking the pointer. Follow input
  // is damped and clamped — the eyes barely move, the highlight glides more.
  const eo =
    mood === "thinking"
      ? { x: 1.4, y: -2.6 }
      : { x: clamp(ex * 0.5, -3, 3), y: clamp(ey * 0.4, -2.2, 2.2) };

  const eye = (x: number) => {
    if (mood === "error") {
      return (
        <path
          key={x}
          d={`M${x - 7},56 Q${x},63.5 ${x + 7},56`}
          stroke={SAD}
          strokeWidth={3.4}
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    if (mood === "sleepy" || blink) {
      return (
        <path
          key={x}
          d={`M${x - 7},59.5 Q${x},63.5 ${x + 7},59.5`}
          stroke={GLOW}
          strokeWidth={3.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
      );
    }
    if (mood === "happy") {
      return (
        <path
          key={x}
          d={`M${x - 7.5},62 Q${x},52.5 ${x + 7.5},62`}
          stroke={GLOW}
          strokeWidth={3.6}
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    const r = held ? 9.5 : 8;
    return (
      <g key={x}>
        <circle cx={x + eo.x} cy={59 + eo.y} r={r + 3.5} fill={ACCENT} opacity={0.16} />
        <circle cx={x + eo.x} cy={59 + eo.y} r={r} fill={`url(#${gid}-eye)`} />
        <circle
          cx={x + eo.x * 1.5 + 2.6}
          cy={56.5 + eo.y * 1.5}
          r={2.4}
          fill="#fff"
          opacity={0.95}
        />
      </g>
    );
  };

  const browY = held ? 41.5 : 45;
  const brows =
    mood === "error" ? (
      <g opacity={0.85}>
        <path d="M75,47 L89,42.5" stroke={GLOW} strokeWidth={3} strokeLinecap="round" />
        <path d="M111,42.5 L125,47" stroke={GLOW} strokeWidth={3} strokeLinecap="round" />
      </g>
    ) : mood === "sleepy" ? null : (
      <g opacity={0.75}>
        <path
          d={`M74,${browY} Q82,${browY - 4} 90,${browY}`}
          stroke={GLOW}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M110,${browY} Q118,${browY - 4} 126,${browY}`}
          stroke={GLOW}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );

  let mouth: React.ReactNode;
  if (mood === "talking") {
    mouth = (
      <rect
        x={94}
        y={70.5}
        width={12}
        height={9.5}
        rx={4.5}
        fill={GLOW}
        style={
          still
            ? undefined
            : {
                animation: "mascot-talkmouth .28s ease-in-out infinite",
                transformOrigin: "100px 75px",
              }
        }
      />
    );
  } else if (mood === "happy") {
    mouth = <path d="M90,72 Q100,87 110,72 Z" fill={GLOW} />;
  } else if (held) {
    mouth = <circle cx={100} cy={76} r={4.5} stroke={GLOW} strokeWidth={3.4} fill="none" />;
  } else if (mood === "error") {
    mouth = <circle cx={100} cy={76.5} r={4} stroke={SAD} strokeWidth={3} fill="none" />;
  } else if (mood === "thinking" || mood === "sleepy") {
    mouth = (
      <rect
        x={94.5}
        y={74.5}
        width={11}
        height={3}
        rx={1.5}
        fill={GLOW}
        opacity={mood === "sleepy" ? 0.7 : 1}
      />
    );
  } else {
    mouth = (
      <path
        d="M91,73 Q100,80.5 109,73"
        stroke={GLOW}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  return (
    <g>
      {brows}
      {eye(82)}
      {eye(118)}
      {mouth}
    </g>
  );
}

/** Arm pose per mood/gesture — degrees around the shoulder anchor. */
function armPose(
  mood: MascotMood,
  gesture: "wave" | "point" | null | undefined,
): { l: number; r: number; waving: boolean } {
  if (gesture === "wave") return { l: 10, r: -158, waving: true };
  if (gesture === "point") return { l: 10, r: -100, waving: false };
  if (mood === "happy") return { l: 148, r: -148, waving: false };
  if (mood === "held") return { l: 138, r: -138, waving: false };
  if (mood === "sleepy" || mood === "error") return { l: 2, r: -2, waving: false };
  return { l: 10, r: -10, waving: false };
}

function RobotArm({
  side,
  deg,
  waving,
  still,
  gid,
}: {
  side: "l" | "r";
  deg: number;
  waving: boolean;
  still: boolean;
  gid: string;
}) {
  const sx = side === "l" ? 54 : 146;
  return (
    <g
      style={{
        transform: `rotate(${deg}deg)`,
        transformOrigin: `${sx}px 110px`,
        transition: "transform .55s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <g
        style={
          waving && !still
            ? {
                animation: "mascot-wave .9s ease-in-out infinite",
                transformOrigin: `${sx}px 110px`,
              }
            : undefined
        }
      >
        <rect
          x={sx - 6.5}
          y={105}
          width={13}
          height={26}
          rx={6.5}
          fill={`url(#${gid}-shell)`}
          stroke={OUTLINE}
          strokeWidth={1.25}
        />
        <circle
          cx={sx}
          cy={134}
          r={9}
          fill={`url(#${gid}-shell)`}
          stroke={OUTLINE}
          strokeWidth={1.25}
        />
        <circle cx={sx} cy={134} r={3.2} fill={ACCENT} opacity={0.9} />
      </g>
    </g>
  );
}

export interface MascotSvgProps {
  /** Rendered size in px (the robot viewBox is square — width = height). */
  size: number;
  mood?: MascotMood;
  blink?: boolean;
  /** Eye-follow offset (glides the eye highlights), in viewBox units, max ~5. */
  ex?: number;
  ey?: number;
  /** Cool blue drop-shadow glow (hero, FAB). */
  glow?: boolean;
  /** White halo, for placement on the colored header. */
  halo?: boolean;
  /** Disables the always-on animations (used by the tiny static avatars). */
  still?: boolean;
  /** Crop to the head — keeps avatars/badges legible at tiny sizes. */
  headshot?: boolean;
  /** Arm gesture override (hero): a hello wave or a "look at this" point. */
  gesture?: "wave" | "point" | null;
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
  headshot = false,
  gesture = null,
  className,
}: MascotSvgProps) {
  // Gradient defs need document-unique ids — one robot per React instance.
  const gid = `mascot-${React.useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const filter = halo
    ? `drop-shadow(0 0 ${Math.round(size * 0.1)}px rgb(255 255 255 / 0.4))`
    : glow
      ? `drop-shadow(0 ${Math.round(size * 0.05)}px ${Math.round(size * 0.14)}px color-mix(in srgb, var(--mascot-accent) 32%, transparent))`
      : undefined;

  const arms = armPose(mood, gesture);
  const sleepy = mood === "sleepy";
  const headTilt =
    mood === "thinking" ? "rotate(-4deg)" : sleepy ? "rotate(3.5deg)" : "none";

  return (
    <svg
      viewBox={headshot ? "24 -24 152 152" : "0 0 200 200"}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", overflow: "visible", filter }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${gid}-shell`} cx="35%" cy="26%" r="95%">
          <stop offset="0%" style={{ stopColor: "var(--mascot-shell-1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-shell-2)" }} />
        </radialGradient>
        <radialGradient id={`${gid}-visor`} cx="32%" cy="16%" r="120%">
          <stop offset="0%" style={{ stopColor: "var(--mascot-visor-hi)" }} />
          <stop offset="75%" style={{ stopColor: "var(--mascot-visor)" }} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-visor)" }} />
        </radialGradient>
        <radialGradient id={`${gid}-eye`} cx="35%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" style={{ stopColor: "var(--mascot-glow)" }} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-accent)" }} />
        </radialGradient>
        <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--mascot-accent)" }} stopOpacity={0} />
          <stop offset="50%" style={{ stopColor: "var(--mascot-accent)" }} stopOpacity={0.9} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-accent)" }} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${gid}-antenna`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--mascot-glow)" }} />
          <stop offset="100%" style={{ stopColor: "var(--mascot-accent)" }} />
        </linearGradient>
      </defs>

      <g
        style={
          still
            ? undefined
            : {
                animation: "mascot-breathe 3.6s ease-in-out infinite",
                transformOrigin: "100px 100px",
              }
        }
      >
        {/* Torso (skipped by the headshot crop) */}
        {!headshot ? (
          <g>
            <rect x={90} y={95} width={20} height={10} rx={3} fill="var(--mascot-visor)" />
            <rect
              x={58}
              y={103}
              width={84}
              height={62}
              rx={28}
              fill={`url(#${gid}-shell)`}
              stroke={OUTLINE}
              strokeWidth={1.5}
            />
            {/* Cart emblem — the "shopping" in shopping robot; gold ring with
                engraved-gold linework */}
            <circle
              cx={100}
              cy={129}
              r={17.5}
              fill="var(--mascot-shell-1)"
              stroke={ACCENT}
              strokeWidth={2}
            />
            <path
              d="M91.5 122.5 h3.4 l2.9 10.6 h10.6 l2.6 -8 H96.2"
              fill="none"
              stroke={ACCENT_DEEP}
              strokeWidth={2.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={100.2} cy={137} r={1.9} fill={ACCENT_DEEP} />
            <circle cx={106.6} cy={137} r={1.9} fill={ACCENT_DEEP} />
            <rect
              x={78}
              y={156.5}
              width={44}
              height={3.4}
              rx={1.7}
              fill={`url(#${gid}-line)`}
              opacity={0.85}
            />
          </g>
        ) : null}

        {/* Head — tilts while thinking/sleeping, nods while talking */}
        <g
          style={{
            transform: headTilt,
            transformOrigin: "100px 96px",
            transition: "transform .45s ease",
            animation:
              !still && mood === "talking" ? "mascot-nod 1.1s ease-in-out infinite" : "none",
          }}
        >
          {/* Antenna — gold-gradient bar; the status LED pulses (fast while
              thinking, dim asleep, red on error) */}
          <rect x={78} y={6} width={44} height={14} rx={7} fill={`url(#${gid}-antenna)`} />
          <rect
            x={89}
            y={10.5}
            width={22}
            height={5}
            rx={2.5}
            fill={mood === "error" ? SAD : LED_LIT}
            opacity={sleepy ? 0.25 : undefined}
            style={
              still || sleepy
                ? undefined
                : {
                    animation: `mascot-glowpulse ${
                      mood === "thinking" ? ".55s" : "2.6s"
                    } ease-in-out infinite`,
                  }
            }
          />
          {/* Ear pods */}
          <rect
            x={30}
            y={46}
            width={16}
            height={28}
            rx={7}
            fill={`url(#${gid}-shell)`}
            stroke={OUTLINE}
            strokeWidth={1.25}
          />
          <rect x={35} y={53} width={6} height={14} rx={3} fill={EAR_LIGHT} opacity={sleepy ? 0.3 : 0.95} />
          <rect
            x={154}
            y={46}
            width={16}
            height={28}
            rx={7}
            fill={`url(#${gid}-shell)`}
            stroke={OUTLINE}
            strokeWidth={1.25}
          />
          <rect x={159} y={53} width={6} height={14} rx={3} fill={EAR_LIGHT} opacity={sleepy ? 0.3 : 0.95} />
          {/* Shell + visor */}
          <rect
            x={42}
            y={22}
            width={116}
            height={76}
            rx={34}
            fill={`url(#${gid}-shell)`}
            stroke={OUTLINE}
            strokeWidth={1.5}
          />
          <rect x={55} y={32} width={90} height={56} rx={20} fill={`url(#${gid}-visor)`} />
          {/* Gold visor rim */}
          <rect
            x={55}
            y={32}
            width={90}
            height={56}
            rx={20}
            fill="none"
            stroke={ACCENT}
            strokeWidth={1.6}
            opacity={0.55}
          />
          <RobotFace mood={mood} blink={blink} ex={ex} ey={ey} gid={gid} still={still} />
        </g>

        {/* Arms last so raised poses read in front of the shell */}
        {!headshot ? (
          <>
            <RobotArm side="l" deg={arms.l} waving={false} still={still} gid={gid} />
            <RobotArm side="r" deg={arms.r} waving={arms.waving} still={still} gid={gid} />
          </>
        ) : null}
      </g>
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
      <MascotSvg size={size} mood={mood} still headshot />
    </span>
  );
}

/* ── Floating Zzz (sleepy overlay — hero + FAB) ─────────────────────────── */

export function MascotZzz({ small = false }: { small?: boolean }) {
  const zs = small
    ? [
        { fs: 9, left: 0, top: 12, delay: "0s" },
        { fs: 13, left: 9, top: 0, delay: "1.3s" },
      ]
    : [
        { fs: 11, left: 0, top: 24, delay: "0s" },
        { fs: 15, left: 12, top: 10, delay: ".8s" },
        { fs: 20, left: 26, top: -5, delay: "1.6s" },
      ];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute font-black"
      style={{ color: "var(--mascot-accent)" }}
    >
      {zs.map((z, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: z.left,
            top: z.top,
            fontSize: z.fs,
            animation: `mascot-zfloat 2.6s ${z.delay} ease-out infinite`,
          }}
        >
          Z
        </span>
      ))}
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

const BOOP_WORDS = [
  "boop!",
  "beep!",
  "hehe, that tickles!",
  "boop received!",
  "again!",
  "systems: happy!",
  "at your service!",
  "you found my button!",
  "free delivery on boops",
  "circuits go brrr!",
  "systems: golden!",
  "add me to cart?",
  "*happy robot noises*",
  "ooh, do that again!",
  "beep boop!",
];

const FLING_WORDS = [
  "wheee!",
  "zoom!",
  "thrusters on!",
  "zero gravity!",
  "so dizzy!",
  "again again!",
  "catch me!",
];

/* Proactive lines stay professional — the playful BOOP/FLING words above are
 * easter-egg rewards that only show once someone discovers the interaction. */
const GREETINGS = [
  "Hi, I'm Nova!",
  "Welcome! How can I help?",
  "Ask me anything",
  "What are we shopping for?",
];

const LISTENING_WORDS = ["I'm listening…", "Go on…", "Tell me more…", "I'm all ears!"];

const THINKING_WORDS = ["Hmm…", "Let me check…", "Checking the store…", "One sec…"];

const ERROR_WORDS = ["Oops!", "Something went wrong…", "Let's try again?"];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

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

/** Shopping icons orbiting the hero (decorative — hidden on reduced motion). */
const ORBITERS = [ShoppingBag, Package, Heart, Tag];
const ORBIT_SECONDS = 24;

function OrbitRing() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[61%] motion-reduce:hidden"
      style={{ "--orb-rx": "108px", "--orb-ry": "30px" } as React.CSSProperties}
    >
      {/* The orbit path itself, echoed as two faint rings */}
      <span
        className="absolute rounded-full border border-blue-soft"
        style={{ left: -108, top: -30, width: 216, height: 60 }}
      />
      <span
        className="absolute rounded-full border border-blue-soft/60"
        style={{ left: -86, top: -24, width: 172, height: 48 }}
      />
      {ORBITERS.map((Icon, i) => {
        // The keyframes hold the phase-locked sine legs (see globals.css);
        // every leg shares one clock so the ellipse, the depth cues and the
        // front/back swap stay in sync.
        const sync = `${ORBIT_SECONDS}s linear ${(-i * ORBIT_SECONDS) / ORBITERS.length}s infinite`;
        return (
          // Nested wrappers because each leg animates `transform`: X + the
          // front/back z swap, then Y, a static centering shim, a per-icon
          // hover bob, and the depth scale/fade on the chip itself.
          <span
            key={i}
            className="absolute"
            style={{ animation: `mascot-orbit-x ${sync}, mascot-orbit-z ${sync}` }}
          >
            <span className="block" style={{ animation: `mascot-orbit-y ${sync}` }}>
              <span className="block -translate-x-1/2 -translate-y-1/2">
                <span
                  className="block"
                  style={{
                    animation: `mascot-orb-bob ${2.6 + i * 0.45}s ${-i * 0.9}s ease-in-out infinite`,
                  }}
                >
                  <span
                    className="grid size-8.5 place-items-center rounded-full border border-blue-soft bg-card text-blue-strong shadow-(--shadow-card)"
                    style={{ animation: `mascot-orbit-depth ${sync}` }}
                  >
                    <Icon className="size-4" strokeWidth={2.2} />
                  </span>
                </span>
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Gold sparkles twinkling around the hero (decorative — hidden on reduced
 * motion). Coordinates come from the design mockup at a 200px robot and scale
 * with the rendered size; they live inside the hero so they ride along when
 * the robot is dragged.
 */
const SPARKLES = [
  { l: -26, t: 30, s: 9, d: "0s" },
  { l: 212, t: 56, s: 7, d: ".9s" },
  { l: -10, t: 162, s: 6, d: "1.6s" },
  { l: 224, t: 152, s: 10, d: ".4s" },
  { l: 100, t: -2, s: 7, d: "2.1s" },
];

function SparkleField({ size }: { size: number }) {
  const k = size / 200;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      {SPARKLES.map((z, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: z.l * k,
            top: z.t * k,
            width: z.s * k,
            height: z.s * k,
            borderRadius: 2,
            background: "var(--mascot-glow)",
            animation: `mascot-twinkle ${2.4 + i * 0.5}s ${z.d} ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function MascotHero({ compact = false }: { compact?: boolean }) {
  const size = compact ? 120 : 176;
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
  /** Hello wave for a few seconds after the dock opens (like the prototype). */
  const [greet, setGreet] = React.useState(true);
  /** "Take a look!" point when a finished reply carries product cards. */
  const [pointFlash, setPointFlash] = React.useState(false);

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
  const pointTimer = React.useRef(0);

  const later = React.useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  React.useEffect(() => {
    const pending = timers.current;
    const raf = springRaf;
    const pt = pointTimer;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      window.cancelAnimationFrame(raf.current);
      window.clearTimeout(pt.current);
    };
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => setGreet(false), 3400);
    return () => window.clearTimeout(t);
  }, []);

  // Point at the freshly-arrived goods: when a stream ends and the final
  // message carries rich content (product cards, order rows), Nova points at
  // it for a beat.
  React.useEffect(() => {
    const unsub = useAssistantStore.subscribe((s, prev) => {
      if (!prev.isStreaming || s.isStreaming) return;
      const lastM = s.messages[s.messages.length - 1];
      if (lastM?.role === "assistant" && lastM.richContent) {
        setPointFlash(true);
        window.clearTimeout(pointTimer.current);
        pointTimer.current = window.setTimeout(() => setPointFlash(false), 2600);
      }
    });
    return unsub;
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
    const word = pick(BOOP_WORDS);
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
    const word = pick(FLING_WORDS);
    setTransient(word);
    later(() => setTransient((b) => (b === word ? null : b)), 1400);
    springRaf.current = window.requestAnimationFrame(step);
  }, [boop, later]);

  // Eye life. All inputs (mouse, taps, tilt, wander) only set a TARGET; a
  // small rAF loop glides the pupils toward it with exponential easing, so
  // discrete touch input reads as a soft glance instead of a teleport — this
  // is what makes the eyes feel alive instead of twitchy on mobile.
  React.useEffect(() => {
    const timeouts = new Set<number>();
    let lastInput = 0;

    const anim = { raf: 0, tx: 0, ty: 0, x: 0, y: 0 };
    const tick = () => {
      anim.raf = 0;
      const dx = anim.tx - anim.x;
      const dy = anim.ty - anim.y;
      if (Math.hypot(dx, dy) < 0.1) {
        anim.x = anim.tx;
        anim.y = anim.ty;
        setEye({ x: anim.x, y: anim.y });
        return;
      }
      anim.x += dx * 0.14;
      anim.y += dy * 0.14;
      setEye({ x: anim.x, y: anim.y });
      anim.raf = window.requestAnimationFrame(tick);
    };
    const setTarget = (nx: number, ny: number) => {
      anim.tx = nx;
      anim.ty = ny;
      if (!anim.raf) anim.raf = window.requestAnimationFrame(tick);
    };
    const lookToward = (clientX: number, clientY: number) => {
      const el = heroRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ddx = clientX - (r.left + r.width / 2);
      const ddy = clientY - (r.top + r.height / 2);
      const len = Math.max(Math.hypot(ddx, ddy), 1);
      const m = Math.min(len / 60, 1) * 5;
      setTarget((ddx / len) * m, (ddy / len) * m);
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
    // Tap: glance toward the touch, hold a beat, then look back at the
    // camera — on a phone there is no "mouse leaving", so the return glance
    // is what keeps the robot from staring at the last tapped corner forever.
    const onDown = (e: PointerEvent) => {
      lastInput = Date.now();
      if (gesture.current.dragging) return;
      lookToward(e.clientX, e.clientY);
      const at = lastInput;
      const t = window.setTimeout(() => {
        timeouts.delete(t);
        if (lastInput === at) setTarget(0, 0);
      }, 850);
      timeouts.add(t);
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
      setTarget(clamp(e.gamma / 12, -5, 5), clamp((e.beta - 40) / 14, -5, 5));
    };
    // Idle wander: a soft glance somewhere, then settle back to center.
    const wander = window.setInterval(() => {
      if (Date.now() - lastInput < 2600) return;
      const a = Math.random() * Math.PI * 2;
      const m = 2 + Math.random() * 3;
      setTarget(Math.cos(a) * m, Math.sin(a) * m * 0.6);
      const t = window.setTimeout(() => {
        timeouts.delete(t);
        if (Date.now() - lastInput >= 2600) setTarget(0, 0);
      }, 900);
      timeouts.add(t);
    }, 3200);

    // Passive across the board: none of these handlers preventDefault (the
    // robot drag relies on touch-action:none, not cancellation), so the
    // browser can keep scrolling/composited work off the main thread — this
    // is what keeps eye-follow judder-free on low-end touch devices.
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("deviceorientation", onTilt);
      window.clearInterval(wander);
      timeouts.forEach((t) => window.clearTimeout(t));
      window.cancelAnimationFrame(anim.raf);
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

  // Rig animation per mood: happy hops, error shakes (twice, like the
  // prototype), sleepy just breathes (the SVG's inner breathe), else floats.
  const rigAnim = dragging
    ? "none"
    : renderMood === "happy"
      ? "mascot-hop .8s ease-in-out infinite"
      : renderMood === "error"
        ? "mascot-shake .55s ease-in-out 2"
        : renderMood === "sleepy"
          ? "none"
          : "mascot-floaty 3.6s ease-in-out infinite";

  // Arm gesture: gestures pause while dragging; a rich reply points, and the
  // first seconds after open wave hello.
  const armGesture: "wave" | "point" | null = dragging
    ? null
    : pointFlash
      ? "point"
      : greet && (renderMood === "idle" || renderMood === "listening")
        ? "wave"
        : null;

  // Waking up gets a little transient hello.
  const prevMoodRef = React.useRef(renderMood);
  React.useEffect(() => {
    if (prevMoodRef.current === "sleepy" && renderMood !== "sleepy") {
      const w = "Welcome back!";
      setTransient(w);
      later(() => setTransient((b) => (b === w ? null : b)), 1600);
    }
    prevMoodRef.current = renderMood;
  }, [renderMood, later]);

  // Speech bubble, derived: gesture words beat the point line beat mood lines
  // beat the greeting (big hero only — it sits on the empty thread, so a
  // hello is its idle line). Mood lines re-roll per mood change; the greeting
  // per mount — memoized so a random pick can't jitter across re-renders.
  const moodBubble = React.useMemo(
    () =>
      renderMood === "listening"
        ? pick(LISTENING_WORDS)
        : renderMood === "thinking"
          ? pick(THINKING_WORDS)
          : renderMood === "error"
            ? pick(ERROR_WORDS)
            : null,
    [renderMood],
  );
  const [helloWord] = React.useState(() => pick(GREETINGS));
  const greeting = !compact && renderMood === "idle" ? helloWord : null;
  const bubble =
    dragging || renderMood === "sleepy"
      ? null
      : (transient ?? (pointFlash ? "Take a look!" : null) ?? moodBubble ?? greeting);

  return (
    // Full width (not shrink-to-fit) so the speech bubble can clamp its
    // max-width against the panel edge instead of overflowing it.
    <div
      className="relative grid w-full place-items-center"
      style={{ minHeight: size + 16, padding: "4px 0" }}
    >
      {/* Orbiting shopping icons — empty-thread hero only. Icons on the near
          arc ride above the character (z 3 over its z 2), the far arc slips
          behind (z 1) — including while the robot is being dragged around. */}
      {!compact ? <OrbitRing /> : null}

      <div
        ref={heroRef}
        role="button"
        tabIndex={0}
        aria-label="Nova — your shopping assistant"
        onPointerDown={grab}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            boop();
          }
        }}
        className="relative z-2 select-none outline-none"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          transform: `translate(${pos.dx}px, ${pos.dy}px) ${stretch}`,
          transition: dragging ? "none" : "transform .1s linear",
        }}
      >
        {!compact ? <SparkleField size={size} /> : null}
        <div style={{ animation: rigAnim }}>
          <div
            className="relative"
            style={{
              animation: squash ? "mascot-boing .6s cubic-bezier(.36,.07,.19,.97) both" : "none",
              transformOrigin: "50% 88%",
            }}
          >
            <MascotSvg
              size={size}
              mood={renderMood}
              blink={blink}
              ex={eye.x}
              ey={eye.y}
              gesture={armGesture}
              glow
            />

            {/* Thinking — drifting thought dots by the head */}
            {renderMood === "thinking" ? (
              <div aria-hidden className="absolute -top-1 left-[72%]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: i * 13,
                      top: -i * 12,
                      width: 11 - i * 3,
                      height: 11 - i * 3,
                      background: "var(--mascot-accent)",
                      animation: `mascot-dotb 1.2s ${i * 0.18}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            ) : null}

            {/* Sleeping — floating Zzz over the head */}
            {renderMood === "sleepy" ? (
              <div aria-hidden className="absolute right-[8%] top-[2%]">
                <MascotZzz />
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
                    className="w-1 rounded-sm"
                    style={{
                      background: "var(--mascot-accent)",
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
            background:
              "radial-gradient(ellipse, color-mix(in srgb, var(--mascot-accent) 35%, transparent), transparent 70%)",
            animation: "mascot-shadowpulse 3.6s ease-in-out infinite",
          }}
        />
      </div>

      {/* Speech bubble — width-capped against the panel's right edge and
          allowed to wrap, so a long line can never push the thread into
          horizontal scrolling. */}
      {bubble ? (
        <div
          className="pointer-events-none absolute left-[calc(50%+40px)] top-1 z-4 max-w-[calc(50%-52px)] animate-pop rounded-2xl rounded-bl-xs border-2 px-3 py-1.5 text-center text-13 font-extrabold leading-snug text-balance shadow-(--shadow-card) motion-reduce:animate-none"
          style={{
            borderColor: "var(--mascot-accent)",
            background: "var(--mascot-shell-1)",
            color: "var(--mascot-visor)",
          }}
        >
          {bubble}
        </div>
      ) : null}
    </div>
  );
}
