"use client";

import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { SiYoutube } from "react-icons/si";
import shortsData from "../public/youtube-shorts.json";
import {
  fetchLiveYouTubeShorts,
  formatExactYouTubeViewCount,
  formatYouTubeViewCount,
} from "./youtubeShorts.mjs";

const CHANNEL_SHORTS_URL = "https://www.youtube.com/@BasedCode/shorts";

type YouTubeShort = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCount?: number;
  retrievedAt?: number;
};

const fallbackShorts: YouTubeShort[] = (shortsData as YouTubeShort[]).map((short) => ({
  id: short.id,
  title: short.title,
  url: short.url,
  thumbnailUrl: short.thumbnailUrl,
}));

export function YouTubeShortsStrip() {
  const rail = useRef<HTMLDivElement>(null);
  const [shorts, setShorts] = useState(fallbackShorts);
  const [hasLiveData, setHasLiveData] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void fetchLiveYouTubeShorts({ signal: controller.signal }).then((liveShorts) => {
      if (!active || !liveShorts?.length) return;
      setShorts(liveShorts);
      setHasLiveData(true);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const scroll = (direction: -1 | 1) => {
    const element = rail.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: direction * Math.min(element.clientWidth * 0.8, 720), behavior: reduceMotion ? "auto" : "smooth" });
  };

  if (!shorts.length) return null;

  return (
    <section
      className="shorts-section"
      aria-labelledby="shorts-title"
      data-shorts-state={hasLiveData ? "live" : "fallback"}
      data-reveal-section
      data-reveal-stagger="65"
      data-reveal-max-delay="455"
    >
      <div className="shorts-toolbar">
        <div className="shorts-heading">
          <SiYoutube aria-hidden="true" />
          <span className="shorts-heading-copy">
            <h2 id="shorts-title">Recent hits</h2>
            <small aria-live="polite">
              {hasLiveData
                ? "The strongest recent Shorts, ranked by current views."
                : "Recent BasedCode Shorts."}
            </small>
          </span>
        </div>
        <div className="shorts-actions">
          <button className="shorts-scroll-button" type="button" onClick={() => scroll(-1)} aria-label="Scroll Shorts left"><FiArrowLeft aria-hidden="true" /></button>
          <button className="shorts-scroll-button" type="button" onClick={() => scroll(1)} aria-label="Scroll Shorts right"><FiArrowRight aria-hidden="true" /></button>
          <a className="shorts-all" href={CHANNEL_SHORTS_URL} target="_blank" rel="noreferrer">All Shorts<FiArrowUpRight aria-hidden="true" /></a>
        </div>
      </div>

      <div className="shorts-rail" ref={rail} aria-label="Popular recent BasedCode YouTube Shorts">
        {shorts.map((short, index) => (
          <a
            className="short-card"
            href={short.url}
            target="_blank"
            rel="noreferrer"
            key={short.id}
            data-reveal-item
            data-reveal-axis="x"
          >
            <span className="short-card-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={short.thumbnailUrl} alt="" width="405" height="720" loading="lazy" decoding="async" />
              <span className="short-card-meta" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><SiYoutube /></span>
            </span>
            <span className="short-card-copy">
              <strong>{short.title}</strong>
              {hasLiveData && typeof short.viewCount === "number" && (
                <small
                  className="short-card-live-views"
                  aria-label={`${formatExactYouTubeViewCount(short.viewCount)} views`}
                  title={`${formatExactYouTubeViewCount(short.viewCount)} views`}
                >
                  {formatYouTubeViewCount(short.viewCount)} views
                </small>
              )}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
