"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SiDiscord, SiGithub, SiInstagram, SiTiktok, SiTwitch, SiX, SiYoutube } from "react-icons/si";
import { FiActivity, FiArrowDown, FiArrowUpRight, FiImage, FiMoon, FiSun } from "react-icons/fi";
import { TwitchHeroPlayer } from "./TwitchHeroPlayer";
import { YouTubeShortsStrip } from "./YouTubeShortsStrip";
import * as localRipple from "./textRipple";
import {
  formatExactSocialCount,
  formatSocialCount,
  formatSocialMetricLabel,
} from "./socialStats.mjs";
import { useSocialStats, type SocialStatKey } from "./useSocialStats";

declare global {
  interface Window {
    TextRipple?: {
      scrambleReveal: (element: Element, options?: { duration?: number; delay?: number; preserveText?: boolean }) => Promise<void>;
      cancelAnimations?: () => void;
    };
  }
}

type SocialLink = {
  name: string;
  handle: string;
  benefit: string;
  href: string;
  icon: typeof SiTwitch;
  primary?: boolean;
  metric: { key: SocialStatKey; label: "followers" | "subscribers" | "members" };
};

const socials: SocialLink[] = [
  { name: "Twitch", handle: "@basedcode", benefit: "Participate in the work live", href: "https://www.twitch.tv/basedcode", icon: SiTwitch, primary: true, metric: { key: "twitch", label: "followers" } },
  { name: "YouTube", handle: "@BasedCode", benefit: "Watch durable project breakdowns", href: "https://www.youtube.com/@BasedCode", icon: SiYoutube, metric: { key: "youtube", label: "subscribers" } },
  { name: "Discord", handle: "Community", benefit: "Ask, contribute, and keep building", href: "https://discord.gg/rxJufPTM2", icon: SiDiscord, metric: { key: "discord", label: "members" } },
  { name: "TikTok", handle: "@basedcodedev", benefit: "Catch useful moments and findings", href: "https://www.tiktok.com/@basedcodedev", icon: SiTiktok, metric: { key: "tiktok", label: "followers" } },
  { name: "Instagram", handle: "@basedcodedev", benefit: "Follow milestones behind the scenes", href: "https://www.instagram.com/basedcodedev/", icon: SiInstagram, metric: { key: "instagram", label: "followers" } },
  { name: "X", handle: "@BasedCodeDev", benefit: "Get fast project and stream updates", href: "https://x.com/BasedCodeDev", icon: SiX, metric: { key: "x", label: "followers" } },
  { name: "GitHub", handle: "BasedCodeDev", benefit: "Inspect the code and working tools", href: "https://github.com/BasedCodeDev", icon: SiGithub, metric: { key: "github", label: "followers" } },
];

const projects = [
  {
    index: "01",
    name: "Not Monsters",
    type: "GAME / ACTUATOR GAMES",
    description: "A chaotic social-deduction party game where villagers brawl, accuse, and survive to expose the monsters hiding among them.",
    href: "https://notmonsters.actuator.games/",
    image: "/projects/not-monsters.png",
    imageAlt: "Not Monsters characters accusing each other in a medieval village",
  },
  {
    index: "02",
    name: "Based Stream Tools",
    type: "CREATOR TOOLS",
    description: "Interactive stream tools, overlays, goal tracking, and playful systems built to bring audiences into the action.",
    href: "https://basedstreamtools.com/",
    image: "/projects/based-stream-tools.jpg",
    imageAlt: "Based Stream Tools logo surrounded by glowing goal, leaderboard, chat, and live-activity panels",
  },
  {
    index: "03",
    name: "On Point",
    type: "VR GAME / ACTUATOR DIGITAL",
    description: "An arcade-inspired VR first-person shooter packed with rapid-fire, WarioWare-style shooting minigames.",
    href: "https://onpoint.games/",
    image: "/projects/on-point-environment.jpg",
    imageAlt: "On Point logo surrounded by colourful arcade cabinets and light guns",
  },
];

export default function Home() {
  const [light, setLight] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const socialStats = useSocialStats();
  const heroTitle = useRef<HTMLHeadingElement>(null);
  const setupMotionRef = useRef<((enabled: boolean) => void) | null>(null);

  useLayoutEffect(() => {
    const themeFrame = window.requestAnimationFrame(() => {
      setLight(window.localStorage.getItem("basedcode-theme") === "light");
    });
    const storedMotion = window.localStorage.getItem("basedcode-motion");
    const initialMotion = storedMotion ? storedMotion === "on" : true;
    const motionFrame = window.requestAnimationFrame(() => setMotionEnabled(initialMotion));

    let revealObserver: IntersectionObserver | null = null;
    let revealFrame = 0;

    const setupRipple = (allowMotion: boolean) => {
      const site = document.querySelector<HTMLElement>(".site");
      if (!allowMotion) {
        site?.classList.remove("motion-enabled");
        site?.classList.remove("motion-forced");
        site?.classList.remove("motion-preparing");
        document.querySelectorAll<HTMLElement>("[data-reveal-item]").forEach((item) => {
          item.classList.remove("motion-pending");
          item.classList.add("motion-visible");
        });
        revealObserver?.disconnect();
        return;
      }

      site?.classList.add("motion-preparing");
      site?.classList.remove("motion-enabled");
      site?.classList.toggle("motion-forced", window.localStorage.getItem("basedcode-motion") !== "off");
      const ripple = window.TextRipple ?? localRipple;
      if (heroTitle.current) {
        ripple.scrambleReveal(heroTitle.current, { duration: 1350, delay: 120, preserveText: true });
      }

      document.querySelectorAll<HTMLElement>("[data-section-ripple]").forEach((signal) => {
        delete signal.dataset.ripplePlayed;
      });

      const revealSections = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal-section]"));
      const revealItems: HTMLElement[] = [];
      revealSections.forEach((section) => {
        const stagger = Number(section.dataset.revealStagger ?? 45);
        const maxDelay = Number(section.dataset.revealMaxDelay ?? 180);

        section.querySelectorAll<HTMLElement>("[data-reveal-item]").forEach((item, index) => {
          item.classList.remove("motion-visible");
          item.classList.add("motion-pending");
          item.style.setProperty("--reveal-delay", `${Math.min(index * stagger, maxDelay)}ms`);
          revealItems.push(item);
        });
      });
      site?.classList.add("motion-enabled");
      if (site) void site.offsetWidth;
      revealFrame = window.requestAnimationFrame(() => site?.classList.remove("motion-preparing"));
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const revealItem = entry.target as HTMLElement;
          revealItem.classList.remove("motion-pending");
          revealItem.classList.add("motion-visible");

          const signal = revealItem.matches("[data-section-ripple]")
            ? revealItem
            : revealItem.querySelector<HTMLElement>("[data-section-ripple]");
          if (signal && signal.dataset.ripplePlayed !== "true") {
            signal.dataset.ripplePlayed = "true";
            const revealDelay = Number.parseFloat(revealItem.style.getPropertyValue("--reveal-delay")) || 0;
            ripple.scrambleReveal(signal, {
              duration: Number(signal.dataset.duration || 1000),
              delay: revealDelay + 160,
              preserveText: false,
            });
          }

          revealObserver?.unobserve(revealItem);
        });
      }, { rootMargin: "0px 0px -2% 0px", threshold: 0.01 });
      revealItems.forEach((item) => revealObserver?.observe(item));
    };

    setupMotionRef.current = setupRipple;
    setupRipple(initialMotion);

    return () => {
      window.cancelAnimationFrame(themeFrame);
      window.cancelAnimationFrame(motionFrame);
      window.cancelAnimationFrame(revealFrame);
      revealObserver?.disconnect();
      setupMotionRef.current = null;
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
      if (!next) {
        window.TextRipple?.cancelAnimations?.();
        localRipple.cancelAnimations();
        setupMotionRef.current?.(false);
      } else if (heroTitle.current) {
        setupMotionRef.current?.(true);
        (window.TextRipple ?? localRipple).scrambleReveal(heroTitle.current, { duration: 900, preserveText: true });
      }
      return next;
    });
  };

  return (
    <div className={`site ${light ? "light" : "dark"} ${motionEnabled ? "motion-enabled motion-forced" : ""}`}>
      <header className="topbar">
        {/* A document navigation is intentional: this site is exported to a static host. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand" href="/" aria-label="BasedCode home"><span>Based</span>Code<span className="slash">/</span></a>
        <nav aria-label="Primary navigation"><a href="#socials">Start here</a><a href="#projects">Projects</a><a href="#about">About</a></nav>
        <div className="topbar-controls">
          <button className="theme-toggle" type="button" onClick={toggleMotion} aria-label={`${motionEnabled ? "Pause" : "Enable"} motion`}>
            <FiActivity aria-hidden="true" /><span>{motionEnabled ? "Motion" : "Motion off"}</span>
          </button>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${light ? "dark" : "light"} theme`}>
            {light ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}<span>{light ? "Dark" : "Light"}</span>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> Building in public</p>
            <h1 id="hero-title" ref={heroTitle} data-ripple data-duration="1350"><span className="hero-kicker">Together, we</span><span className="hero-word">build.</span><br /><span className="hero-word">play.</span><br /><span className="hero-word">learn.</span></h1>
            <p className="hero-intro">Step inside real game and software development. Watch the decisions, ask questions, and bring useful lessons back to your own work.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer"><SiTwitch aria-hidden="true" /> Watch a build <FiArrowUpRight aria-hidden="true" /></a>
              <a className="button button-secondary" href="#socials">Find BasedCode <FiArrowDown aria-hidden="true" /></a>
            </div>
            <nav className="hero-socials" aria-label="BasedCode social profiles">
              <span>Find us</span>
              <div>
                {socials.map(({ name, href, icon: Icon }) => (
                  <a href={href} target="_blank" rel="noreferrer" aria-label={`BasedCode on ${name}`} title={name} key={name}>
                    <Icon aria-hidden="true" />
                  </a>
                ))}
              </div>
            </nav>
          </div>

          <TwitchHeroPlayer />
        </section>

        <YouTubeShortsStrip />

        <section className="social-section" id="socials" aria-labelledby="social-title" data-reveal-section>
          <div className="section-heading" data-reveal-item>
            <p className="eyebrow" data-ripple data-section-ripple data-duration="1000">01 / Find the signal</p>
            <h2 id="social-title">Watch. Follow.<br /><span className="no-wrap">Build with us.</span></h2>
            <p>Twitch is where the work happens live. Discord keeps the conversation going, while every other channel carries useful moments, code, and progress between builds.</p>
          </div>
          <div className="social-grid">
            {socials.map(({ name, benefit, href, icon: Icon, primary, metric }) => {
              const stat = socialStats[metric.key];
              const statLabel = stat ? formatSocialMetricLabel(stat.label, stat.value) : "";
              const secondaryLabel = stat?.secondary
                ? formatSocialMetricLabel(stat.secondary.label, stat.secondary.value)
                : "";
              const exactStat = stat
                ? [
                    `${formatExactSocialCount(stat.value)} ${statLabel}`,
                    stat.secondary
                      ? `${formatExactSocialCount(stat.secondary.value)} ${secondaryLabel}`
                      : null,
                  ].filter(Boolean).join("; ")
                : "";

              return (
                <a className={`social-card ${primary ? "social-primary" : ""}`} href={href} target="_blank" rel="noreferrer" key={name} data-reveal-item data-stat-key={metric.key}>
                  <span className="social-icon"><Icon aria-hidden="true" /></span>
                  <span className="social-copy">
                    <strong>{name}</strong>
                    <small>{benefit}</small>
                    {stat && (
                      <span className="social-stat" title={exactStat} aria-label={exactStat}>
                        {formatSocialCount(stat.value)} {statLabel}
                        {stat.secondary && (
                          <>
                            <span className="social-stat-separator" aria-hidden="true">·</span>
                            {formatSocialCount(stat.secondary.value)} {secondaryLabel}
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  <FiArrowUpRight className="arrow" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </section>

        <section className="projects-section" id="projects" aria-labelledby="projects-title" data-reveal-section>
          <div className="section-heading horizontal" data-reveal-item>
            <div><p className="eyebrow" data-ripple data-section-ripple data-duration="1000">02 / Current projects</p><h2 id="projects-title">Things we’re<br />making real.</h2></div>
            <p>Real games and tools where experiments, trade-offs, and useful lessons have somewhere concrete to land.</p>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <a className="project-card" href={project.href} target="_blank" rel="noreferrer" key={project.name} data-reveal-item>
                <span className="project-image">
                  <img src={project.image} alt={project.imageAlt} loading="lazy" />
                  <span className="project-index">{project.index}</span>
                </span>
                <div className="project-copy"><small>{project.type}</small><h3>{project.name}</h3><p className="project-description">{project.description}</p></div>
                <span className="project-open"><FiArrowUpRight aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title" data-reveal-section>
          <div className="about-visual" data-reveal-item>
            <div className="about-photo">
              <img src="/about/seb-live-build.jpg" alt="Seb working with fellow developers during a live PC build event." loading="lazy" />
              <span className="about-photo-tag">REAL WORK / LIVE BUILD</span>
              <div className="about-photo-meta" aria-hidden="true">
                <span>SEB FEHR / BASEDCODE</span>
                <span>BUILDING IN PUBLIC</span>
              </div>
            </div>
          </div>
          <div className="about-copy" data-reveal-item>
            <p className="eyebrow" data-ripple data-section-ripple data-duration="1000">03 / Building in public</p>
            <h2 id="about-title">Come build<br />alongside us.</h2>
            <p className="about-lede">BasedCode is where Seb builds games and software in public. See how decisions get made, ask questions, contribute where useful, and take practical lessons back to your own projects.</p>
            <p className="about-host">Seb Fehr <span>/</span> Developer · game maker · streamer</p>
            <div className="participation-cues" aria-label="Ways to participate">
              <span><small>01</small>Watch the process</span>
              <span><small>02</small>Ask better questions</span>
              <span><small>03</small>Make something real</span>
            </div>
            <div className="about-actions">
              <a className="button about-cta" href="https://discord.gg/rxJufPTM2" target="_blank" rel="noreferrer"><SiDiscord aria-hidden="true" /> Join the Discord <FiArrowUpRight aria-hidden="true" /></a>
              <a className="button about-media-link" href="/media-kit/"><FiImage aria-hidden="true" /> Media kit <FiArrowUpRight aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top"><span>Based</span>Code<span className="slash">/</span></a>
        <p>
          Building games, software, and creative technology in public—together.
          <span className="footer-meta">
            <a href="/media-kit/">Media kit <FiArrowUpRight aria-hidden="true" /></a>
            <span aria-hidden="true">·</span>
            <a href="https://brand.basedcode.dev/" target="_blank" rel="noreferrer">Brand guide <FiArrowUpRight aria-hidden="true" /></a>
            <span aria-hidden="true">·</span>
            <span className="footer-studio">Studio work at <a href="https://actuator.digital/" target="_blank" rel="noreferrer">Actuator Digital <FiArrowUpRight aria-hidden="true" /></a></span>
          </span>
        </p>
        <a href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer">Watch a build <FiArrowUpRight aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
