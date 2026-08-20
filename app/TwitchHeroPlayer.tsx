"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiRadio } from "react-icons/fi";
import { SiTwitch } from "react-icons/si";

const CHANNEL = "basedcode";
const CHANNEL_URL = "https://www.twitch.tv/basedcode";
const VIDEOS_URL = "https://www.twitch.tv/basedcode/videos?filter=archives&sort=time";
const RECENT_VODS_URL = "https://decapi.me/twitch/videos/basedcode?limit=5&separator=%0A";
// At 640px, the hero and card gutters leave enough room for a compliant 16:9 player.
const EMBED_MIN_VIEWPORT = 640;

type Vod = { id: string; title: string; url: string };
type PlayerStatus = "loading" | "live" | "vod" | "offline" | "error";

type TwitchPlayerInstance = {
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
  setChannel: (channel: string) => void;
  setMuted: (muted: boolean) => void;
  setVideo: (video: string, time?: number) => void;
  pause?: () => void;
};

type TwitchPlayerConstructor = {
  new (elementId: string, options: Record<string, unknown>): TwitchPlayerInstance;
  READY: string;
  ONLINE: string;
  OFFLINE: string;
  PLAY: string;
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

async function requestRecentVods(): Promise<Vod[]> {
  const response = await fetch(RECENT_VODS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Recent VOD request failed with ${response.status}`);
  return parseRecentVods(await response.text());
}

export function TwitchHeroPlayer() {
  const [canEmbed, setCanEmbed] = useState(false);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && Boolean(window.Twitch?.Player));
  const [scriptFailed, setScriptFailed] = useState(false);
  const [recentVods, setRecentVods] = useState<Vod[]>([]);
  const [activeVodId, setActiveVodId] = useState<string | null>(null);
  const [resolverFailed, setResolverFailed] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [playbackStarted, setPlaybackStarted] = useState(false);

  const playerHost = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwitchPlayerInstance | null>(null);
  const recentVodsRef = useRef<Vod[]>([]);
  const requestRef = useRef<Promise<Vod[]> | null>(null);
  const liveSeenRef = useRef(false);

  const resolveRecentVods = useCallback(async (force = false) => {
    if (!force && recentVodsRef.current.length) return recentVodsRef.current;
    if (!force && requestRef.current) return requestRef.current;

    const request = requestRecentVods()
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
        requestRef.current = null;
      });

    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    const updateEmbedMode = () => setCanEmbed(window.innerWidth >= EMBED_MIN_VIEWPORT);
    updateEmbedMode();
    window.addEventListener("resize", updateEmbedMode);
    void resolveRecentVods();
    return () => window.removeEventListener("resize", updateEmbedMode);
  }, [resolveRecentVods]);

  useEffect(() => {
    if (!canEmbed || !scriptReady || !window.Twitch?.Player || !playerHost.current || playerRef.current) return;

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
      setStatus("loading");
      const vods = await resolveRecentVods(refresh);
      const vod = vods[0];
      if (playerRef.current !== player) return;
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

    const onReady = () => player.setMuted(true);
    const onOnline = () => {
      liveSeenRef.current = true;
      setActiveVodId(null);
      setStatus("live");
    };
    const onOffline = () => void showLatestVod(liveSeenRef.current);
    const onPlay = () => setPlaybackStarted(true);
    const onPlaybackBlocked = () => player.setMuted(true);

    player.addEventListener(Player.READY, onReady);
    player.addEventListener(Player.ONLINE, onOnline);
    player.addEventListener(Player.OFFLINE, onOffline);
    player.addEventListener(Player.PLAY, onPlay);
    player.addEventListener(Player.PLAYBACK_BLOCKED, onPlaybackBlocked);

    return () => {
      player.removeEventListener?.(Player.READY, onReady);
      player.removeEventListener?.(Player.ONLINE, onOnline);
      player.removeEventListener?.(Player.OFFLINE, onOffline);
      player.removeEventListener?.(Player.PLAY, onPlay);
      player.removeEventListener?.(Player.PLAYBACK_BLOCKED, onPlaybackBlocked);
      player.pause?.();
      if (playerRef.current === player) playerRef.current = null;
      host.replaceChildren();
      liveSeenRef.current = false;
    };
  }, [canEmbed, resolveRecentVods, scriptReady]);

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

  const activeVod = recentVods.find((vod) => vod.id === activeVodId) ?? recentVods[0] ?? null;
  const activeVodIndex = activeVod ? recentVods.findIndex((vod) => vod.id === activeVod.id) : -1;
  const statusLabel = status === "live" ? "LIVE NOW" : status === "vod" ? `VOD ${String(activeVodIndex + 1).padStart(2, "0")}` : status === "offline" ? "OFFLINE" : status === "error" ? "OPEN TWITCH" : "CONNECTING";
  const destination = status === "live" ? CHANNEL_URL : activeVod?.url ?? VIDEOS_URL;
  const destinationLabel = status === "live" ? "Watch live" : activeVod ? "Open this VOD" : "View broadcasts";
  const displayTitle = status === "live" ? "BasedCode is live." : activeVod?.title ?? (resolverFailed ? "Recent BasedCode broadcasts" : "Finding recent broadcasts…");
  const showPoster = !canEmbed || scriptFailed;

  const selectVod = (vod: Vod) => {
    const player = playerRef.current;
    if (!player) return;
    player.setVideo(`v${vod.id}`);
    player.setMuted(true);
    setActiveVodId(vod.id);
    setStatus("vod");
  };

  return (
    <article className={`stream-card ${playbackStarted ? "is-playing" : ""}`} aria-label="BasedCode Twitch stream">
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
        <span className={`stream-status status-${status}`}><i aria-hidden="true" />{statusLabel}</span>
      </div>

      <div className={`stream-window ${showPoster ? "is-poster" : ""}`}>
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
        {!showPoster && status === "loading" && <div className="stream-loading" aria-live="polite"><span aria-hidden="true" />Connecting to Twitch…</div>}
      </div>

      <div className="stream-footer">
        <strong>{displayTitle}</strong>
        <a href={destination} target="_blank" rel="noreferrer">{destinationLabel}<FiArrowUpRight aria-hidden="true" /></a>
      </div>

      <div className="vod-browser">
        <div className="vod-browser-header">
          <span>Recent broadcasts</span>
          <a href={VIDEOS_URL} target="_blank" rel="noreferrer">View all<FiArrowUpRight aria-hidden="true" /></a>
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
                title={vod.title}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{vod.title}</strong>
              </a>
            ) : (
              <button
                className={`vod-choice ${activeVodId === vod.id ? "is-active" : ""}`}
                type="button"
                key={vod.id}
                onClick={() => selectVod(vod)}
                aria-pressed={activeVodId === vod.id}
                title={`Load ${vod.title}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{vod.title}</strong>
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
