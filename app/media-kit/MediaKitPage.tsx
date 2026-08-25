"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FiActivity,
  FiArrowLeft,
  FiArrowUpRight,
  FiDownload,
  FiImage,
  FiMoon,
  FiMusic,
  FiSun,
} from "react-icons/fi";
import * as localRipple from "../textRipple";

declare global {
  interface Window {
    TextRipple?: {
      scrambleReveal: (element: Element, options?: { duration?: number; delay?: number; preserveText?: boolean }) => Promise<void>;
      cancelAnimations?: () => void;
    };
  }
}

const profilePictures = [
  {
    name: "Square profile",
    detail: "1080 × 1080 · PNG",
    preview: "/media-kit/previews/seb-fehr-profile-square.webp",
    download: "/media-kit/downloads/seb-fehr-profile-square.png",
    alt: "Square portrait of Seb Fehr against a purple background.",
    shape: "square",
  },
  {
    name: "Original portrait",
    detail: "1448 × 1086 · PNG",
    preview: "/media-kit/previews/seb-fehr-profile-purple.webp",
    download: "/media-kit/downloads/seb-fehr-profile-purple.png",
    alt: "Portrait of Seb Fehr wearing a black hoodie against a purple background.",
    shape: "landscape",
  },
] as const;

const photos = [
  { name: "Live build team", category: "Build / Community", preview: "seb-live-build-team.webp", download: "seb-live-build-team.jpg", alt: "Seb seated at a computer with fellow developers during a live build event." },
  { name: "Studio portrait", category: "Portrait", preview: "seb-white-studio-portrait.webp", download: "seb-white-studio-portrait.png", alt: "Studio portrait of Seb against a white background." },
  { name: "Red Bull team stage", category: "Event / Team", preview: "red-bull-team-stage.webp", download: "red-bull-team-stage.jpg", alt: "Seb and teammates together on a gaming event stage." },
  { name: "Community art", category: "Community", preview: "community-art-gallery.webp", download: "community-art-gallery.jpg", alt: "Seb and friends holding colourful portrait paintings." },
  { name: "Team selfie", category: "Event / Team", preview: "red-bull-team-selfie.webp", download: "red-bull-team-selfie.jpg", alt: "A group selfie with Seb and teammates at a gaming event." },
  { name: "Event finale", category: "Event / Team", preview: "red-bull-team-finale.webp", download: "red-bull-team-finale.jpg", alt: "Seb and a team posing in front of a gaming event screen." },
  { name: "Team social", category: "Event / Team", preview: "red-bull-team-social.webp", download: "red-bull-team-social.jpg", alt: "Seb and teammates gathered together at a social event." },
  { name: "Games event speakers", category: "Event", preview: "games-event-speakers.webp", download: "games-event-speakers.jpg", alt: "Seb with two fellow speakers at a games industry event." },
  { name: "Sports event portrait", category: "Event", preview: "sports-event-portrait.webp", download: "sports-event-portrait.jpg", alt: "Seb standing beside a large event football installation." },
  { name: "Sports event pair", category: "Event", preview: "sports-event-pair.webp", download: "sports-event-pair.jpg", alt: "Seb and a fellow attendee standing beside a large event football installation." },
  { name: "XR Hub audience", category: "Speaking", preview: "xr-hub-audience.webp", download: "xr-hub-audience.jpg", alt: "Seb seated in the audience at XR Hub." },
  { name: "XR Hub talk", category: "Speaking", preview: "xr-hub-speaking.webp", download: "xr-hub-speaking.jpg", alt: "Seb presenting to an audience at XR Hub." },
  { name: "XR Hub panel", category: "Speaking", preview: "xr-hub-panel.webp", download: "xr-hub-panel.jpg", alt: "Seb taking part in an XR Hub panel discussion." },
  { name: "XR Hub discussion", category: "Speaking", preview: "xr-hub-panel-speaking.webp", download: "xr-hub-panel-speaking.jpg", alt: "Seb speaking into a microphone during an XR Hub panel." },
  { name: "XR Hub audience profile", category: "Speaking", preview: "xr-hub-audience-profile.webp", download: "xr-hub-audience-profile.jpg", alt: "Profile view of Seb watching a presentation at XR Hub." },
  { name: "VR demonstration", category: "Technology", preview: "vr-demonstration-headset.webp", download: "vr-demonstration-headset.jpg", alt: "Seb helping an attendee put on a virtual reality headset." },
  { name: "VR setup", category: "Technology", preview: "vr-demonstration-assisting.webp", download: "vr-demonstration-assisting.jpg", alt: "Seb assisting an attendee during a virtual reality demonstration." },
  { name: "VR blaster demo", category: "Technology", preview: "vr-demonstration-blaster.webp", download: "vr-demonstration-blaster.jpg", alt: "Seb guiding an attendee using a virtual reality blaster controller." },
  { name: "VR conversation", category: "Technology", preview: "vr-demonstration-conversation.webp", download: "vr-demonstration-conversation.jpg", alt: "Seb speaking with an attendee during a virtual reality demonstration." },
  { name: "Build it live", category: "BasedCode artwork", preview: "basedcode-build-it-live.webp", download: "basedcode-build-it-live.png", alt: "BasedCode Build it Live promotional artwork featuring Seb." },
  { name: "Speaker portrait", category: "Speaking / Portrait", preview: "xr-hub-speaker-portrait.webp", download: "xr-hub-speaker-portrait.jpg", alt: "Seb speaking at XR Hub in front of a purple screen." },
] as const;

const tracks = [
  {
    name: "BasedCode Theme — Vocals",
    detail: "3:33 · WAV · Lossless master",
    source: "/media-kit/audio/basedcode-theme-vocals-bella.wav",
  },
  {
    name: "BasedCode Theme — Instrumental",
    detail: "3:33 · MP3",
    source: "/media-kit/audio/basedcode-theme-instrumental-bella.mp3",
  },
] as const;

export function MediaKitPage() {
  const [light, setLight] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const heroTitle = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const storedMotion = window.localStorage.getItem("basedcode-motion");
    const allowMotion = storedMotion ? storedMotion === "on" : true;
    const themeFrame = window.requestAnimationFrame(() => {
      setLight(window.localStorage.getItem("basedcode-theme") === "light");
    });
    const motionFrame = window.requestAnimationFrame(() => setMotionEnabled(allowMotion));

    const site = document.querySelector<HTMLElement>(".media-kit");
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-kit-reveal]"));
    let observer: IntersectionObserver | null = null;
    if (!allowMotion) {
      items.forEach((item) => item.classList.add("is-visible"));
    } else {
      if (heroTitle.current) {
        (window.TextRipple ?? localRipple).scrambleReveal(heroTitle.current, {
          duration: 1200,
          delay: 100,
          preserveText: true,
        });
      }

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -4% 0px", threshold: 0.02 });

      site?.classList.add("media-motion-ready");
      items.forEach((item, index) => {
        item.style.setProperty("--kit-delay", `${Math.min(index * 35, 210)}ms`);
        observer?.observe(item);
      });
    }

    return () => {
      window.cancelAnimationFrame(themeFrame);
      window.cancelAnimationFrame(motionFrame);
      observer?.disconnect();
      window.TextRipple?.cancelAnimations?.();
      localRipple.cancelAnimations();
    };
  }, []);

  const toggleTheme = () => {
    setLight((current) => {
      const next = !current;
      window.localStorage.setItem("basedcode-theme", next ? "light" : "dark");
      return next;
    });
  };

  const toggleMotion = () => {
    setMotionEnabled((current) => {
      const next = !current;
      window.localStorage.setItem("basedcode-motion", next ? "on" : "off");
      document.querySelectorAll<HTMLElement>("[data-kit-reveal]").forEach((item) => item.classList.add("is-visible"));
      if (!next) {
        window.TextRipple?.cancelAnimations?.();
        localRipple.cancelAnimations();
      } else if (heroTitle.current) {
        (window.TextRipple ?? localRipple).scrambleReveal(heroTitle.current, { duration: 900, preserveText: true });
      }
      return next;
    });
  };

  return (
    <div className={`site media-kit ${light ? "light" : "dark"} ${motionEnabled ? "motion-enabled motion-forced" : ""}`}>
      <header className="topbar media-kit-topbar">
        <Link className="brand" href="/" aria-label="BasedCode home"><span>Based</span>Code<span className="slash">/</span></Link>
        <nav aria-label="Media kit navigation"><a href="#profiles">Profiles</a><a href="#photos">Photos</a><a href="#music">Music</a></nav>
        <div className="topbar-controls">
          <button className="theme-toggle" type="button" onClick={toggleMotion} aria-label={`${motionEnabled ? "Pause" : "Enable"} motion`}>
            <FiActivity aria-hidden="true" /><span>{motionEnabled ? "Motion" : "Motion off"}</span>
          </button>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${light ? "dark" : "light"} theme`}>
            {light ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}<span>{light ? "Dark" : "Light"}</span>
          </button>
        </div>
      </header>

      <main id="top" className="media-kit-main">
        <section className="media-kit-hero" aria-labelledby="media-kit-title">
          <div className="media-kit-grid" aria-hidden="true" />
          <div className="media-kit-hero-copy">
            <Link className="media-kit-back" href="/"><FiArrowLeft aria-hidden="true" /> BasedCode home</Link>
            <p className="eyebrow">Official assets / Press &amp; editorial</p>
            <h1 id="media-kit-title" ref={heroTitle} data-ripple>Media<br /><span>Kit.</span></h1>
            <p>Profile pictures, event photography, and music for stories and coverage involving BasedCode and Seb Fehr.</p>
            <nav className="media-kit-jump-links" aria-label="Jump to media kit assets">
              <a href="#profiles"><FiImage aria-hidden="true" /> Profile pictures</a>
              <a href="#photos"><FiImage aria-hidden="true" /> Photo library</a>
              <a href="#music"><FiMusic aria-hidden="true" /> Theme music</a>
            </nav>
          </div>
          <div className="media-kit-hero-card" data-kit-reveal>
            <img src="/media-kit/previews/seb-fehr-profile-square.webp" alt="Square portrait of Seb Fehr against a purple background." />
            <div><small>SEB FEHR / BASEDCODE</small><strong>Developer · game maker · streamer</strong></div>
          </div>
        </section>

        <section className="media-kit-intro" data-kit-reveal>
          <p className="eyebrow">About BasedCode</p>
          <div>
            <h2>Building games and software in public.</h2>
            <p>BasedCode is a creator-led media and community brand hosted by Seb Fehr. It follows real work across software, indie games, AI, and creative technology—showing the decisions, trade-offs, experiments, and outcomes along the way.</p>
          </div>
          <dl>
            <div><dt>Display name</dt><dd>BasedCode</dd></div>
            <div><dt>Creator</dt><dd>Seb Fehr</dd></div>
            <div><dt>Primary handle</dt><dd>BasedCodeDev</dd></div>
            <div><dt>Brand guidance</dt><dd><a href="https://brand.basedcode.dev/" target="_blank" rel="noreferrer">Open brand guide <FiArrowUpRight aria-hidden="true" /></a></dd></div>
          </dl>
        </section>

        <section className="media-kit-section profile-section" id="profiles" aria-labelledby="profiles-title">
          <div className="media-kit-section-heading" data-kit-reveal>
            <p className="eyebrow">01 / Profile pictures</p>
            <h2 id="profiles-title">Ready for bios,<br />profiles, and listings.</h2>
            <p>Use the square crop for avatars and compact listings. Use the original frame when the surrounding purple field is useful.</p>
          </div>
          <div className="profile-download-grid">
            {profilePictures.map((profile) => (
              <article className={`profile-download-card is-${profile.shape}`} key={profile.name} data-kit-reveal>
                <div className="profile-download-image"><img src={profile.preview} alt={profile.alt} /></div>
                <div className="profile-download-copy">
                  <span><strong>{profile.name}</strong><small>{profile.detail}</small></span>
                  <a href={profile.download} download><FiDownload aria-hidden="true" /> Download PNG</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="media-kit-section photo-section" id="photos" aria-labelledby="photos-title">
          <div className="media-kit-section-heading" data-kit-reveal>
            <p className="eyebrow">02 / Photo library</p>
            <h2 id="photos-title">Real work.<br />Real rooms. Real people.</h2>
            <p>Press-ready photography covering live builds, community events, speaking, games, and hands-on technology.</p>
          </div>
          <p className="media-kit-asset-note" data-kit-reveal>High-resolution downloads are optimized for quality and stripped of embedded camera metadata. Suggested credit: <strong>Seb Fehr / BasedCode</strong>.</p>
          <div className="media-photo-grid">
            {photos.map((photo, index) => (
              <a className="media-photo-card" href={`/media-kit/downloads/${photo.download}`} download key={photo.download} data-kit-reveal>
                <span className="media-photo-image"><img src={`/media-kit/previews/${photo.preview}`} alt={photo.alt} loading="lazy" /></span>
                <span className="media-photo-copy">
                  <span><small>{String(index + 1).padStart(2, "0")} / {photo.category}</small><strong>{photo.name}</strong></span>
                  <FiDownload aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="media-kit-section music-section" id="music" aria-labelledby="music-title">
          <div className="media-kit-section-heading" data-kit-reveal>
            <p className="eyebrow">03 / Theme music</p>
            <h2 id="music-title">The sound of<br />BasedCode.</h2>
            <p>The BasedCode theme is available with vocals and as an instrumental. These tracks may be used in media for the BasedCode brand.</p>
          </div>
          <div className="music-credit" data-kit-reveal>
            <FiMusic aria-hidden="true" />
            <p><small>Special thanks</small><strong>Music created by <a href="https://open.spotify.com/artist/3JMAWJdzaT0eocfryPKv0M" target="_blank" rel="noreferrer">Bella Rose <FiArrowUpRight aria-hidden="true" /></a></strong></p>
          </div>
          <div className="music-grid">
            {tracks.map((track, index) => (
              <article className="music-card" key={track.name} data-kit-reveal>
                <div className="music-card-heading"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{track.name}</strong><small>{track.detail}</small></div></div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls preload="metadata" src={track.source}>Your browser does not support audio playback.</audio>
                <a href={track.source} download><FiDownload aria-hidden="true" /> Download track</a>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer media-kit-footer">
        <Link className="brand" href="/"><span>Based</span>Code<span className="slash">/</span></Link>
        <p>Official BasedCode media assets.<span className="footer-meta">For additional context, see the <a href="https://brand.basedcode.dev/" target="_blank" rel="noreferrer">brand guide <FiArrowUpRight aria-hidden="true" /></a>.</span></p>
        <Link href="/"><FiArrowLeft aria-hidden="true" /> Back to BasedCode</Link>
      </footer>
    </div>
  );
}
