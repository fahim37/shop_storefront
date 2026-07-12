"use client";

import * as React from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoPlayerProps {
  /** Playback rendition URL (720p MP4). Null renders the poster shell only. */
  src: string | null;
  /** Poster frame shown before first play. */
  poster?: string | null;
  /** Product/asset name for accessible labels. */
  title?: string;
  /**
   * Known duration (seconds) from the media pipeline — fills the time readout
   * and idle chip before the video metadata has loaded (or with preload="none").
   */
  durationSeconds?: number | null;
  preload?: "none" | "metadata" | "auto";
  className?: string;
}

/** Seconds jumped by ArrowLeft/ArrowRight on the keyboard. */
const KEY_SEEK_STEP = 5;
/** Idle time before the controls fade out during playback. */
const HIDE_DELAY_MS = 2600;

function formatTime(totalSeconds: number | null | undefined): string {
  if (!Number.isFinite(totalSeconds ?? NaN) || (totalSeconds ?? 0) < 0)
    return "0:00";
  const s = Math.floor(totalSeconds!);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Branded product-video player ("Bold Bazar" blue/amber) used on the PDP in
 * place of native `<video controls>`.
 *
 * Poster-first: idle state is a clean poster with a pulsing amber play badge
 * and a duration chip. Once started, a custom control bar (scrubbable amber
 * timeline, play/pause, mute, elapsed/total, fullscreen) sits on a bottom
 * scrim and auto-hides while playing — pointer movement or a tap brings it
 * back. Tap behavior is pointer-aware: mouse click on the video toggles
 * playback, touch tap toggles the controls overlay (big center button handles
 * play), matching mobile player conventions.
 *
 * Mobile specifics: the timeline is `touch-action: none` so scrubbing never
 * fights the gallery carousel's scroll-snap, tap targets are ≥40px, an
 * IntersectionObserver pauses playback when the slide is swiped mostly out of
 * view, and iOS Safari (no element fullscreen) falls back to the native
 * `webkitEnterFullscreen()` video fullscreen.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  durationSeconds,
  preload = "metadata",
  className,
}: VideoPlayerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [buffering, setBuffering] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(0);
  const [buffered, setBuffered] = React.useState(0);
  const [scrubbing, setScrubbing] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [controlsShown, setControlsShown] = React.useState(true);

  // Coarse-pointer (touch) devices keep a big center play/pause whenever the
  // controls are up; fine-pointer devices only get it while paused.
  const coarse = React.useSyncExternalStore(
    React.useCallback((notify) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    }, []),
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );

  const total = duration ?? durationSeconds ?? null;
  const fraction = total && total > 0 ? Math.min(now / total, 1) : 0;

  /* ── Controls visibility ─────────────────────────────────────────────── */
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = React.useRef(false);
  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const clearHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  /** Show the controls; while playing, re-arm the fade-out timer. */
  const poke = React.useCallback(() => {
    setControlsShown(true);
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      if (playingRef.current) setControlsShown(false);
    }, HIDE_DELAY_MS);
  }, []);

  React.useEffect(() => clearHideTimer, []);

  // Controls can never fade while paused/ended/scrubbing or on error.
  const shown =
    controlsShown || !playing || ended || scrubbing || failed || !started;

  /* ── Media element wiring ────────────────────────────────────────────── */
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const syncTime = () => setNow(v.currentTime);
    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      setEnded(false);
      poke();
    };
    const onPause = () => {
      setPlaying(false);
      setControlsShown(true);
    };
    const onEnded = () => {
      setEnded(true);
      setControlsShown(true);
    };
    const onMeta = () => {
      if (Number.isFinite(v.duration)) setDuration(v.duration);
    };
    const onVolume = () => setMuted(v.muted);
    const onWaiting = () => setBuffering(true);
    const onReady = () => setBuffering(false);
    const onError = () => {
      // Ignore aborts from unmounting/src swaps with no real source.
      if (v.error) setFailed(true);
      setBuffering(false);
    };
    const onProgress = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const t = v.currentTime;
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.buffered.start(i) <= t && t <= v.buffered.end(i)) {
          setBuffered(v.buffered.end(i) / d);
          return;
        }
      }
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("timeupdate", syncTime);
    v.addEventListener("seeked", syncTime);
    v.addEventListener("volumechange", onVolume);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onWaiting);
    v.addEventListener("playing", onReady);
    v.addEventListener("canplay", onReady);
    v.addEventListener("error", onError);
    v.addEventListener("progress", onProgress);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("timeupdate", syncTime);
      v.removeEventListener("seeked", syncTime);
      v.removeEventListener("volumechange", onVolume);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onWaiting);
      v.removeEventListener("playing", onReady);
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("error", onError);
      v.removeEventListener("progress", onProgress);
    };
  }, [poke]);

  // Smooth timeline: `timeupdate` only fires ~4×/s, so drive the fill with
  // rAF while playing (scrubbing writes currentTime directly, skip it then).
  React.useEffect(() => {
    if (!playing || scrubbing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) setNow(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scrubbing]);

  // Pause when swiped mostly out of view (mobile gallery carousel).
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !v.paused) v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // Fullscreen state (element fullscreen; iOS video fullscreen is native UI).
  React.useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const togglePlay = React.useCallback(() => {
    const v = videoRef.current;
    if (!v || failed) return;
    if (v.ended) v.currentTime = 0;
    if (v.paused) void v.play().catch(() => setFailed(true));
    else v.pause();
  }, [failed]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };

  const seekBy = React.useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration);
    setNow(v.currentTime);
    setEnded(v.ended);
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    const el = containerRef.current;
    const v = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (el?.requestFullscreen) {
      void el.requestFullscreen();
    } else {
      // iPhone Safari: no element fullscreen — use the native video one.
      v?.webkitEnterFullscreen?.();
    }
  }, []);

  const retry = () => {
    const v = videoRef.current;
    if (!v) return;
    setFailed(false);
    v.load();
    void v.play().catch(() => setFailed(true));
  };

  /* ── Timeline scrubbing (pointer-captured, touch-safe) ───────────────── */
  const seekToClientX = React.useCallback((clientX: number) => {
    const track = trackRef.current;
    const v = videoRef.current;
    if (!track || !v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    const box = track.getBoundingClientRect();
    const f = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
    v.currentTime = f * v.duration;
    setNow(v.currentTime);
    if (f < 1) setEnded(false);
  }, []);

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    trackRef.current?.setPointerCapture(e.pointerId);
    setScrubbing(true);
    seekToClientX(e.clientX);
  };
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbing) seekToClientX(e.clientX);
  };
  const onTrackPointerUp = () => {
    setScrubbing(false);
    poke();
  };

  /* ── Surface tap: mouse toggles play, touch toggles the overlay ──────── */
  const lastPointerType = React.useRef("mouse");

  const onSurfaceClick = () => {
    if (failed) return;
    if (lastPointerType.current === "touch") {
      if (!started) togglePlay();
      else if (shown && playing) setControlsShown(false);
      else poke();
    } else {
      togglePlay();
      poke();
    }
  };

  /* ── Keyboard ────────────────────────────────────────────────────────── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const onControl = target.closest("button, [role='slider']") !== null;
    switch (e.key) {
      case " ":
      case "k":
      case "K":
        if (e.key === " " && onControl) return; // native activation
        e.preventDefault();
        togglePlay();
        break;
      case "m":
      case "M":
        toggleMute();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "ArrowLeft":
        if (target.getAttribute("role") === "slider") return;
        seekBy(-KEY_SEEK_STEP);
        break;
      case "ArrowRight":
        if (target.getAttribute("role") === "slider") return;
        seekBy(KEY_SEEK_STEP);
        break;
      default:
        return;
    }
    poke();
  };

  const controlBtn =
    "grid size-10 shrink-0 place-items-center rounded-md text-white outline-none transition-colors hover:bg-white/10 hover:text-amber focus-visible:ring-2 focus-visible:ring-amber sm:size-9";

  const centerVisible =
    !failed && (!started || ended || !playing || (coarse && shown));

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={title ? `Video player — ${title}` : "Video player"}
      onKeyDown={onKeyDown}
      onPointerDownCapture={(e) => (lastPointerType.current = e.pointerType)}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") poke();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && playingRef.current) {
          clearHideTimer();
          setControlsShown(false);
        }
      }}
      className={cn(
        "group/player relative select-none overflow-hidden bg-black",
        !shown && playing && "cursor-none",
        className,
        fullscreen && "rounded-none border-0",
      )}
    >
      <video
        ref={videoRef}
        src={src ?? undefined}
        poster={poster ?? undefined}
        playsInline
        preload={preload}
        onClick={onSurfaceClick}
        className="h-full w-full object-contain"
      />

      {/* Idle poster dressing: soft vignette so the play badge always reads */}
      {!started && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"
        />
      )}

      {/* Duration chip (idle only — the control bar takes over after start) */}
      {!started && formatTime(total) !== "0:00" && (
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
          <Play className="size-3 fill-amber text-amber" strokeWidth={0} />
          {formatTime(total)}
        </span>
      )}

      {/* Center play / pause / replay */}
      {centerVisible && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
              poke();
            }}
            aria-label={
              ended ? "Replay video" : playing ? "Pause video" : "Play video"
            }
            className={cn(
              "pointer-events-auto relative isolate grid place-items-center rounded-full outline-none transition-all duration-200 ease-spring focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
              started
                ? "size-14 bg-black/55 text-white backdrop-blur-sm hover:bg-black/70 active:scale-95"
                : "size-16 bg-accent text-accent-foreground shadow-[0_10px_36px_rgb(0_0_0/0.4)] hover:scale-105 hover:bg-accent-hover active:scale-95 sm:size-[72px]",
              buffering && started && "opacity-0",
            )}
          >
            {/* Idle-state halo: slow amber pulse to invite the tap */}
            {!started && (
              <span
                aria-hidden
                className="absolute inset-0 -z-10 animate-badge-pulse rounded-full bg-amber/35"
              />
            )}
            {ended ? (
              <RotateCcw className="size-6" strokeWidth={2.4} />
            ) : playing ? (
              <Pause className="size-6 fill-current" strokeWidth={0} />
            ) : (
              <Play
                className={cn(
                  "translate-x-0.5 fill-current",
                  started ? "size-6" : "size-7 sm:size-8",
                )}
                strokeWidth={0}
              />
            )}
          </button>
        </div>
      )}

      {/* Buffering spinner */}
      {buffering && started && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="size-11 animate-spin rounded-full border-[3px] border-white/25 border-t-amber" />
        </div>
      )}

      {/* Error state */}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-black/70">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <p className="text-sm font-medium text-white/90">
              Couldn&apos;t load this video
            </p>
            <button
              type="button"
              onClick={retry}
              className="rounded-full bg-accent px-4 py-1.5 text-13 font-bold text-accent-foreground outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-white"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Control bar */}
      {started && !failed && (
        <div
          onPointerDown={() => poke()}
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-1.5 pt-10 transition-opacity duration-300 sm:px-4 sm:pb-2",
            shown ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {/* Timeline */}
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(total ?? 0)}
            aria-valuenow={Math.round(now)}
            aria-valuetext={`${formatTime(now)} of ${formatTime(total)}`}
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") seekBy(-KEY_SEEK_STEP);
              else if (e.key === "ArrowRight") seekBy(KEY_SEEK_STEP);
              else if (e.key === "Home") seekBy(-Infinity);
              else if (e.key === "End") seekBy(Infinity);
              else return;
              e.preventDefault();
              poke();
            }}
            className="group/track relative flex h-7 cursor-pointer touch-none items-center outline-none"
          >
            <div
              className={cn(
                "relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-all duration-150",
                scrubbing && "h-1.5",
                "group-hover/track:h-1.5 group-focus-visible/track:ring-2 group-focus-visible/track:ring-amber/70 group-focus-visible/track:ring-offset-2 group-focus-visible/track:ring-offset-transparent",
              )}
            >
              {/* Buffered */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-full bg-white/25"
                style={{ width: `${buffered * 100}%` }}
              />
              {/* Played — brand amber with a soft glow */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-full bg-amber shadow-[0_0_10px_rgb(245_184_46/0.55)]"
                style={{ width: `${fraction * 100}%` }}
              />
            </div>
            {/* Thumb */}
            <span
              aria-hidden
              style={{ left: `${fraction * 100}%` }}
              className={cn(
                "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber shadow-[0_1px_6px_rgb(0_0_0/0.5)] ring-2 ring-white transition-transform duration-150",
                scrubbing
                  ? "scale-125"
                  : coarse
                    ? "scale-100"
                    : "scale-0 group-hover/track:scale-100 group-focus-visible/track:scale-100",
              )}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={
                ended ? "Replay video" : playing ? "Pause video" : "Play video"
              }
              className={controlBtn}
            >
              {ended ? (
                <RotateCcw className="size-[18px]" strokeWidth={2.4} />
              ) : playing ? (
                <Pause className="size-[18px] fill-current" strokeWidth={0} />
              ) : (
                <Play
                  className="size-[18px] translate-x-px fill-current"
                  strokeWidth={0}
                />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={controlBtn}
            >
              {muted ? (
                <VolumeX className="size-[18px]" strokeWidth={2.2} />
              ) : (
                <Volume2 className="size-[18px]" strokeWidth={2.2} />
              )}
            </button>

            <span className="ml-1 text-xs font-medium tabular-nums text-white/95">
              {formatTime(now)}
              <span className="mx-1 text-white/45">/</span>
              <span className="text-white/70">{formatTime(total)}</span>
            </span>

            <span className="flex-1" />

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              className={controlBtn}
            >
              {fullscreen ? (
                <Minimize className="size-[18px]" strokeWidth={2.2} />
              ) : (
                <Maximize className="size-[18px]" strokeWidth={2.2} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
