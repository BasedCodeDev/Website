"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FiArrowUpRight, FiRadio } from "react-icons/fi";
import { SiTwitch } from "react-icons/si";
import {
  fetchTwitchVideoMetadata,
  formatTwitchDuration,
  normaliseTwitchThumbnailUrl,
} from "./twitchMetadata.mjs";

const CHANNEL = "basedcode";
const CHANNEL_URL = "https://www.twitch.tv/basedcode";
const VIDEOS_URL = "https://www.twitch.tv/basedcode/videos?filter=archives&sort=time";
const RECENT_VODS_URL = "https://decapi.me/twitch/videos/basedcode?limit=5&separator=%0A";
// At 640px, the hero and card gutters leave enough room for a compliant 16:9 player.
const EMBED_MIN_VIEWPORT = 640;

type Vod = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  category?: string;
  publishedAt?: string;
  durationSeconds?: number;
  viewCount?: number;
};
type PlayerStatus = "loading" | "live" | "vod" | "offline" | "error";

type TwitchPlayerInstance = {
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
  setChannel: (channel: string) => void;
  setMuted: (muted: boolean) => void;
  setVideo: (video: string, time?: number) => void;
  play: () => void;
  pause?: () => void;
};

type TwitchPlayerConstructor = {
  new (elementId: string, options: Record<string, unknown>): TwitchPlayerInstance;
  READY: string;
  ONLINE: string;
  OFFLINE: string;
  PLAY: string;
  PLAYING: string;
  PLAYBACK_BLOCKED: string;
};

declare global {
  interface Window {
    Twitch?: { Player: TwitchPlayerConstructor };
  }
}

export function parseRecentVods(response: string): Vod[] {
  const vods = response
    .trim()
    .split(/\r?\n|\s+\|\s+/)
    .map((entry) => {
      const match = entry.trim().match(/^(.*?)\s+-\s+(https:\/\/www\.twitch\.tv\/videos\/(\d+))(?:\?.*)?$/s);
      if (!match) return null;

      const title = match[1].trim();
      return title ? { id: match[3], title, url: match[2] } : null;
    })
    .filter((vod): vod is Vod => Boolean(vod));

  return vods.filter((vod, index) => vods.findIndex((candidate) => candidate.id === vod.id) === index).slice(0, 5);
}

export function parseLatestVod(response: string): Vod | null {
  return parseRecentVods(response)[0] ?? null;
}

async function requestCurrentVods(signal?: AbortSignal): Promise<Vod[]> {
  const response = await fetch(RECENT_VODS_URL, {
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal,
  });
  if (!response.ok) throw new Error(`Recent VOD request failed with ${response.status}`);
  return parseRecentVods(await response.text());
}

async function requestCachedVods(signal?: AbortSignal): Promise<Vod[]> {
  const response = await fetch("/twitch-vods.json", { cache: "no-store", signal });
  if (!response.ok) throw new Error(`VOD thumbnail cache failed with ${response.status}`);

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const vod = entry as Record<string, unknown>;
    if (
      typeof vod.id !== "string"
      || !/^\d+$/.test(vod.id)
      || typeof vod.title !== "string"
      || typeof vod.url !== "string"
      || vod.url !== `https://www.twitch.tv/videos/${vod.id}`
    ) return [];

    const thumbnailUrl = normaliseTwitchThumbnailUrl(vod.thumbnailUrl);
    return [{ id: vod.id, title: vod.title, url: vod.url, thumbnailUrl }];
  }).slice(0, 5);
}

async function requestRecentVods(signal?: AbortSignal): Promise<Vod[]> {
  const [currentResult, cacheResult] = await Promise.allSettled([
    requestCurrentVods(signal),
    requestCachedVods(signal),
  ]);
  const cachedVods = cacheResult.status === "fulfilled" ? cacheResult.value : [];
  if (currentResult.status === "rejected") {
    if (cachedVods.length) return cachedVods;
    throw currentResult.reason;
  }

  const cachedById = new Map(cachedVods.map((vod) => [vod.id, vod]));
  let liveMetadata = new Map<string, Partial<Vod>>();
  try {
    liveMetadata = await fetchTwitchVideoMetadata(currentResult.value, { signal });
  } catch {
    // The current VOD links still work when Twitch's browser metadata is unavailable.
  }

  return currentResult.value.map((vod) => {
    const metadata = liveMetadata.get(vod.id) ?? {};
    return {
      ...vod,
      ...metadata,
      title: metadata.title ?? vod.title,
      thumbnailUrl: metadata.thumbnailUrl ?? cachedById.get(vod.id)?.thumbnailUrl,
    };
  });
}

function VodChoiceContents({ vod, index }: { vod: Vod; index: number }) {
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string | null>(null);
  const duration = formatTwitchDuration(vod.durationSeconds);

  return (
    <>
      <span className="vod-thumbnail" aria-hidden="true">
        {vod.thumbnailUrl && failedThumbnailUrl !== vod.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vod.thumbnailUrl}
            alt=""
            width="320"
            height="180"
            loading="lazy"
            decoding="async"
            onError={() => setFailedThumbnailUrl(vod.thumbnailUrl ?? null)}
          />
        ) : (
          <SiTwitch />
        )}
      </span>
      <span className="vod-choice-copy">
        <small>{String(index + 1).padStart(2, "0")}{duration ? ` / ${duration}` : ""}</small>
        <strong>{vod.title}</strong>
      </span>
    </>
  );
}

export function TwitchHeroPlayer() {
  const [canEmbed, setCanEmbed] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && Boolean(window.Twitch?.Player));
  const [scriptFailed, setScriptFailed] = useState(false);
  const [recentVods, setRecentVods] = useState<Vod[]>([]);
  const [activeVodId, setActiveVodId] = useState<string | null>(null);
  const [resolverFailed, setResolverFailed] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const playerHost = useRef<HTMLDivElement>(null);
  const streamWindow = useRef<HTMLDivElement>(null);
  const streamCard = useRef<HTMLElement>(null);
  const playerRef = useRef<TwitchPlayerInstance | null>(null);
  const recentVodsRef = useRef<Vod[]>([]);
  const requestRef = useRef<Promise<Vod[]> | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const liveSeenRef = useRef(false);
  const playbackRequestRef = useRef(0);
  const autoplayRetryRef = useRef(false);
  const autoplayFeedbackTimeoutRef = useRef<number | null>(null);
  const playbackStartedRef = useRef(false);
  const tiltFrameRef = useRef(0);

  const resetCardTilt = useCallback(() => {
    window.cancelAnimationFrame(tiltFrameRef.current);
    const card = streamCard.current;
    if (!card) return;
    card.classList.remove("is-pointer-active");
    card.style.removeProperty("--stream-tilt-x");
    card.style.removeProperty("--stream-tilt-y");
    card.style.removeProperty("--stream-pointer-x");
    card.style.removeProperty("--stream-pointer-y");
  }, []);

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.pointerType === "touch"
      || !window.matchMedia("(hover: hover) and (pointer: fine)").matches
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || window.localStorage.getItem("basedcode-motion") === "off"
    ) return;

    const card = streamCard.current;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    const horizontal = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
    const vertical = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
    const pointerX = (horizontal + 0.5) * 100;
    const pointerY = (vertical + 0.5) * 100;

    window.cancelAnimationFrame(tiltFrameRef.current);
    tiltFrameRef.current = window.requestAnimationFrame(() => {
      card.classList.add("is-pointer-active");
      card.style.setProperty("--stream-tilt-x", `${(-vertical * 3.2).toFixed(2)}deg`);
      card.style.setProperty("--stream-tilt-y", `${(horizontal * 4).toFixed(2)}deg`);
      card.style.setProperty("--stream-pointer-x", `${pointerX.toFixed(1)}%`);
      card.style.setProperty("--stream-pointer-y", `${pointerY.toFixed(1)}%`);
    });
  };

  const resolveRecentVods = useCallback(async (force = false) => {
    if (!force && recentVodsRef.current.length) return recentVodsRef.current;
    if (!force && requestRef.current) return requestRef.current;

    if (force) requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    const request = requestRecentVods(controller.signal)
      .then((vods) => {
        recentVodsRef.current = vods;
        setRecentVods(vods);
        setResolverFailed(!vods.length);
        if (window.innerWidth < EMBED_MIN_VIEWPORT && vods.length) {
          setActiveVodId(vods[0].id);
          setStatus("vod");
        }
        return vods;
      })
      .catch(() => {
        const cachedVods = recentVodsRef.current;
        setResolverFailed(!cachedVods.length);
        return cachedVods;
      })
      .finally(() => {
        if (requestControllerRef.current === controller) {
          requestRef.current = null;
          requestControllerRef.current = null;
        }
      });

    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    const updateEmbedMode = () => setCanEmbed(window.innerWidth >= EMBED_MIN_VIEWPORT);
    updateEmbedMode();
    window.addEventListener("resize", updateEmbedMode);
    void resolveRecentVods();
    return () => {
      window.removeEventListener("resize", updateEmbedMode);
      requestControllerRef.current?.abort();
    };
  }, [resolveRecentVods]);

  useEffect(() => {
    const element = streamWindow.current;
    if (!canEmbed || playerVisible || !element) return;

    const updatePlayerVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const bounds = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
      const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
      const visibleRatio = bounds.width && bounds.height
        ? (visibleWidth * visibleHeight) / (bounds.width * bounds.height)
        : 0;
      if (visibleRatio >= 0.5) setPlayerVisible(true);
    };

    updatePlayerVisibility();
    window.addEventListener("scroll", updatePlayerVisibility, { passive: true });
    window.addEventListener("resize", updatePlayerVisibility);
    window.addEventListener("focus", updatePlayerVisibility);
    document.addEventListener("visibilitychange", updatePlayerVisibility);
    return () => {
      window.removeEventListener("scroll", updatePlayerVisibility);
      window.removeEventListener("resize", updatePlayerVisibility);
      window.removeEventListener("focus", updatePlayerVisibility);
      document.removeEventListener("visibilitychange", updatePlayerVisibility);
    };
  }, [canEmbed, playerVisible]);

  useEffect(() => {
    if (!canEmbed || !playerVisible || !scriptReady || !window.Twitch?.Player || !playerHost.current || playerRef.current) return;

    const Player = window.Twitch.Player;
    const host = playerHost.current;
    host.replaceChildren();

    const player = new Player("basedcode-twitch-player", {
      channel: CHANNEL,
      width: "100%",
      height: "100%",
      parent: [window.location.hostname],
      autoplay: true,
      muted: true,
    });
    playerRef.current = player;

    const showLatestVod = async (refresh: boolean) => {
      const playbackRequest = ++playbackRequestRef.current;
      setAutoplayBlocked(false);
      setStatus("loading");
      const vods = await resolveRecentVods(refresh);
      const vod = vods[0];
      if (playerRef.current !== player || playbackRequest !== playbackRequestRef.current) return;
      if (vod) {
        player.setVideo(`v${vod.id}`);
        player.setMuted(true);
        setActiveVodId(vod.id);
        setStatus("vod");
      } else {
        setActiveVodId(null);
        setStatus("offline");
      }
    };

    const startMutedPlayback = () => {
      player.setMuted(true);
      player.play();
    };
    const clearAutoplayFeedbackTimeout = () => {
      if (autoplayFeedbackTimeoutRef.current === null) return;
      window.clearTimeout(autoplayFeedbackTimeoutRef.current);
      autoplayFeedbackTimeoutRef.current = null;
    };
    const onReady = () => {
      autoplayRetryRef.current = false;
      player.setMuted(true);
    };
    const onOnline = () => {
      playbackRequestRef.current += 1;
      autoplayRetryRef.current = false;
      liveSeenRef.current = true;
      setAutoplayBlocked(false);
      playbackStartedRef.current = false;
      setPlaybackStarted(false);
      setActiveVodId(null);
      setStatus("live");
      startMutedPlayback();
      clearAutoplayFeedbackTimeout();
      autoplayFeedbackTimeoutRef.current = window.setTimeout(() => {
        if (playerRef.current === player && !playbackStartedRef.current) setAutoplayBlocked(true);
      }, 1800);
    };
    const onOffline = () => {
      clearAutoplayFeedbackTimeout();
      void showLatestVod(liveSeenRef.current);
    };
    const onPlay = () => {
      clearAutoplayFeedbackTimeout();
      playbackStartedRef.current = true;
      setAutoplayBlocked(false);
      setPlaybackStarted(true);
    };
    const onPlaying = () => {
      clearAutoplayFeedbackTimeout();
      autoplayRetryRef.current = false;
      playbackStartedRef.current = true;
      setAutoplayBlocked(false);
      setPlaybackStarted(true);
    };
    const onPlaybackBlocked = () => {
      setAutoplayBlocked(true);
      if (autoplayRetryRef.current) return;
      autoplayRetryRef.current = true;
      startMutedPlayback();
    };

    player.addEventListener(Player.READY, onReady);
    player.addEventListener(Player.ONLINE, onOnline);
    player.addEventListener(Player.OFFLINE, onOffline);
    player.addEventListener(Player.PLAY, onPlay);
    player.addEventListener(Player.PLAYING, onPlaying);
    player.addEventListener(Player.PLAYBACK_BLOCKED, onPlaybackBlocked);

    return () => {
      player.removeEventListener?.(Player.READY, onReady);
      player.removeEventListener?.(Player.ONLINE, onOnline);
      player.removeEventListener?.(Player.OFFLINE, onOffline);
      player.removeEventListener?.(Player.PLAY, onPlay);
      player.removeEventListener?.(Player.PLAYING, onPlaying);
      player.removeEventListener?.(Player.PLAYBACK_BLOCKED, onPlaybackBlocked);
      clearAutoplayFeedbackTimeout();
      player.pause?.();
      if (playerRef.current === player) playerRef.current = null;
      host.replaceChildren();
      liveSeenRef.current = false;
    };
  }, [canEmbed, playerVisible, resolveRecentVods, scriptReady]);

  useEffect(() => {
    const element = streamWindow.current;
    if (!canEmbed || !playerVisible || !scriptReady || !element) return;

    const attemptVisiblePlayback = () => {
      const player = playerRef.current;
      if (!player || document.visibilityState !== "visible") return;

      const bounds = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
      const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
      const visibleRatio = bounds.width && bounds.height
        ? (visibleWidth * visibleHeight) / (bounds.width * bounds.height)
        : 0;
      if (visibleRatio < 0.5) return;

      player.setMuted(true);
      player.play();
    };

    window.addEventListener("scroll", attemptVisiblePlayback, { passive: true });
    window.addEventListener("resize", attemptVisiblePlayback);
    document.addEventListener("visibilitychange", attemptVisiblePlayback);
    window.addEventListener("focus", attemptVisiblePlayback);
    return () => {
      window.removeEventListener("scroll", attemptVisiblePlayback);
      window.removeEventListener("resize", attemptVisiblePlayback);
      document.removeEventListener("visibilitychange", attemptVisiblePlayback);
      window.removeEventListener("focus", attemptVisiblePlayback);
    };
  }, [canEmbed, playerVisible, scriptReady]);

  useEffect(() => {
    if (!canEmbed || scriptReady || scriptFailed) return;
    const timeout = window.setTimeout(() => {
      if (!window.Twitch?.Player) {
        setScriptFailed(true);
        setStatus("error");
      }
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [canEmbed, scriptFailed, scriptReady]);

  useEffect(() => () => window.cancelAnimationFrame(tiltFrameRef.current), []);

  const activeVod = recentVods.find((vod) => vod.id === activeVodId) ?? recentVods[0] ?? null;
  const activeVodIndex = activeVod ? recentVods.findIndex((vod) => vod.id === activeVod.id) : -1;
  const statusLabel = status === "live" ? (autoplayBlocked ? "LIVE — PRESS PLAY" : "LIVE NOW") : status === "vod" ? `VOD ${String(activeVodIndex + 1).padStart(2, "0")}` : status === "offline" ? "OFFLINE" : status === "error" ? "OPEN TWITCH" : "CONNECTING";
  const destination = status === "live" ? CHANNEL_URL : activeVod?.url ?? VIDEOS_URL;
  const destinationLabel = status === "live" ? "Watch live" : activeVod ? "Open this VOD" : "View broadcasts";
  const displayTitle = status === "live" ? "BasedCode is live." : activeVod?.title ?? (resolverFailed ? "Recent BasedCode broadcasts" : "Finding recent broadcasts…");
  const showPoster = !canEmbed || scriptFailed;

  const describeVod = (vod: Vod) => [
    vod.title,
    vod.description,
    vod.category ? `Category: ${vod.category}` : undefined,
    vod.durationSeconds !== undefined ? `Duration: ${formatTwitchDuration(vod.durationSeconds)}` : undefined,
    vod.viewCount !== undefined ? `${vod.viewCount.toLocaleString()} views` : undefined,
    vod.publishedAt ? `Published: ${new Date(vod.publishedAt).toLocaleDateString("en-AU", { dateStyle: "medium" })}` : undefined,
  ].filter(Boolean).join("\n");

  const selectVod = (vod: Vod) => {
    const player = playerRef.current;
    if (!player) return;
    playbackRequestRef.current += 1;
    if (autoplayFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(autoplayFeedbackTimeoutRef.current);
      autoplayFeedbackTimeoutRef.current = null;
    }
    player.setVideo(`v${vod.id}`);
    player.setMuted(true);
    setAutoplayBlocked(false);
    setActiveVodId(vod.id);
    setStatus("vod");
  };

  return (
    <article
      className={`stream-card ${playbackStarted ? "is-playing" : ""} ${status === "live" ? "is-live" : ""}`}
      aria-label="BasedCode Twitch stream"
      ref={streamCard}
      onPointerEnter={handleCardPointerMove}
      onPointerMove={handleCardPointerMove}
      onPointerLeave={resetCardTilt}
      onPointerCancel={resetCardTilt}
    >
      <Script
        src="https://player.twitch.tv/js/embed/v1.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptFailed(false);
          setScriptReady(Boolean(window.Twitch?.Player));
        }}
        onError={() => {
          setScriptFailed(true);
          setStatus("error");
        }}
      />

      <div className="stream-topline">
        <span><FiRadio aria-hidden="true" /> TWITCH / BASEDCODE</span>
        <span className={`stream-status status-${status}`} role="status" aria-live="polite"><i aria-hidden="true" />{statusLabel}</span>
      </div>

      <div className={`stream-window ${showPoster ? "is-poster" : ""}`} ref={streamWindow}>
        {!showPoster && <div className="twitch-player-host" id="basedcode-twitch-player" ref={playerHost} />}
        {showPoster && (
          <div className="stream-poster">
            <SiTwitch aria-hidden="true" />
            <strong>{displayTitle}</strong>
            <p>{canEmbed ? "The Twitch player could not load." : "Open Twitch to watch on this screen size."}</p>
            <div className="poster-actions">
              <a href={destination} target="_blank" rel="noreferrer">{destinationLabel}<FiArrowUpRight aria-hidden="true" /></a>
              {activeVod && <a href={CHANNEL_URL} target="_blank" rel="noreferrer">Twitch channel</a>}
            </div>
          </div>
        )}
      </div>

      <div className="vod-browser">
        <div className="vod-browser-header">
          <span>Recent broadcasts</span>
          <div className="vod-browser-links">
            <a href={destination} target="_blank" rel="noreferrer">{destinationLabel}<FiArrowUpRight aria-hidden="true" /></a>
            <a href={VIDEOS_URL} target="_blank" rel="noreferrer">View all<FiArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
        {recentVods.length ? (
          <div className="vod-buttons">
            {recentVods.map((vod, index) => showPoster ? (
              <a
                className={`vod-choice ${activeVodId === vod.id ? "is-active" : ""}`}
                href={vod.url}
                key={vod.id}
                target="_blank"
                rel="noreferrer"
                title={describeVod(vod)}
              >
                <VodChoiceContents vod={vod} index={index} />
              </a>
            ) : (
              <button
                className={`vod-choice ${activeVodId === vod.id ? "is-active" : ""}`}
                type="button"
                key={vod.id}
                onClick={() => selectVod(vod)}
                aria-pressed={activeVodId === vod.id}
                title={`Load ${describeVod(vod)}`}
              >
                <VodChoiceContents vod={vod} index={index} />
              </button>
            ))}
          </div>
        ) : (
          <p className="vod-browser-empty" aria-live="polite">
            {resolverFailed ? "Recent broadcasts are available on Twitch." : "Finding recent broadcasts…"}
          </p>
        )}
      </div>
    </article>
  );
}
