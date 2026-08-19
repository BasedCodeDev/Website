"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiRadio } from "react-icons/fi";
import { SiTwitch } from "react-icons/si";

const CHANNEL = "basedcode";
const CHANNEL_URL = "https://www.twitch.tv/basedcode";
const VIDEOS_URL = "https://www.twitch.tv/basedcode/videos?filter=archives&sort=time";
const LATEST_VOD_URL = "https://decapi.me/twitch/videos/basedcode";
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
  PLAYBACK_BLOCKED: string;
};

declare global {
  interface Window {
    Twitch?: { Player: TwitchPlayerConstructor };
  }
}

export function parseLatestVod(response: string): Vod | null {
  const match = response.trim().match(/^(.*?)\s+-\s+(https:\/\/www\.twitch\.tv\/videos\/(\d+))(?:\?.*)?$/s);
  if (!match) return null;

  const title = match[1].trim();
  return title ? { id: match[3], title, url: match[2] } : null;
}

async function requestLatestVod(): Promise<Vod | null> {
  const response = await fetch(LATEST_VOD_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Latest VOD request failed with ${response.status}`);
  return parseLatestVod(await response.text());
}

export function TwitchHeroPlayer() {
  const [canEmbed, setCanEmbed] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [latestVod, setLatestVod] = useState<Vod | null>(null);
  const [resolverFailed, setResolverFailed] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("loading");

  const playerHost = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwitchPlayerInstance | null>(null);
  const latestVodRef = useRef<Vod | null>(null);
  const requestRef = useRef<Promise<Vod | null> | null>(null);
  const liveSeenRef = useRef(false);

  const resolveLatestVod = useCallback(async (force = false) => {
    if (!force && latestVodRef.current) return latestVodRef.current;
    if (!force && requestRef.current) return requestRef.current;

    const request = requestLatestVod()
      .then((vod) => {
        latestVodRef.current = vod;
        setLatestVod(vod);
        setResolverFailed(!vod);
        return vod;
      })
      .catch(() => {
        setResolverFailed(true);
        return null;
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
    setScriptReady(Boolean(window.Twitch?.Player));
    void resolveLatestVod();
    return () => window.removeEventListener("resize", updateEmbedMode);
  }, [resolveLatestVod]);

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
      const vod = await resolveLatestVod(refresh);
      if (playerRef.current !== player) return;
      if (vod) {
        player.setVideo(`v${vod.id}`);
        player.setMuted(true);
        setStatus("vod");
      } else {
        setStatus("offline");
      }
    };

    const onReady = () => player.setMuted(true);
    const onOnline = () => {
      liveSeenRef.current = true;
      setStatus("live");
    };
    const onOffline = () => void showLatestVod(liveSeenRef.current);
    const onPlaybackBlocked = () => player.setMuted(true);

    player.addEventListener(Player.READY, onReady);
    player.addEventListener(Player.ONLINE, onOnline);
    player.addEventListener(Player.OFFLINE, onOffline);
    player.addEventListener(Player.PLAYBACK_BLOCKED, onPlaybackBlocked);

    return () => {
      player.removeEventListener?.(Player.READY, onReady);
      player.removeEventListener?.(Player.ONLINE, onOnline);
      player.removeEventListener?.(Player.OFFLINE, onOffline);
      player.removeEventListener?.(Player.PLAYBACK_BLOCKED, onPlaybackBlocked);
      player.pause?.();
      if (playerRef.current === player) playerRef.current = null;
      host.replaceChildren();
      liveSeenRef.current = false;
    };
  }, [canEmbed, resolveLatestVod, scriptReady]);

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

  const statusLabel = status === "live" ? "LIVE NOW" : status === "vod" ? "LATEST VOD" : status === "offline" ? "OFFLINE" : status === "error" ? "OPEN TWITCH" : "CONNECTING";
  const destination = status === "live" ? CHANNEL_URL : latestVod?.url ?? VIDEOS_URL;
  const destinationLabel = status === "live" ? "Watch live" : latestVod ? "Watch latest VOD" : "View broadcasts";
  const displayTitle = status === "live" ? "BasedCode is live." : latestVod?.title ?? (resolverFailed ? "Recent BasedCode broadcasts" : "Finding the latest broadcast…");
  const showPoster = !canEmbed || scriptFailed;

  return (
    <article className="stream-card" aria-label="BasedCode Twitch stream">
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
              {latestVod && <a href={CHANNEL_URL} target="_blank" rel="noreferrer">Twitch channel</a>}
            </div>
          </div>
        )}
        {!showPoster && status === "loading" && <div className="stream-loading" aria-live="polite"><span aria-hidden="true" />Connecting to Twitch…</div>}
      </div>

      <div className="stream-footer">
        <strong>{displayTitle}</strong>
        <a href={destination} target="_blank" rel="noreferrer">{destinationLabel}<FiArrowUpRight aria-hidden="true" /></a>
      </div>
    </article>
  );
}
