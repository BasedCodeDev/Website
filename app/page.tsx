"use client";

import { useEffect, useRef, useState } from "react";
import { SiDiscord, SiGithub, SiInstagram, SiTiktok, SiTwitch, SiX, SiYoutube } from "react-icons/si";
import { FiArrowDown, FiArrowUpRight, FiMoon, FiSun } from "react-icons/fi";
import { TwitchHeroPlayer } from "./TwitchHeroPlayer";

declare global {
  interface Window {
    TextRipple?: {
      scrambleReveal: (element: Element, options?: { duration?: number; delay?: number; preserveText?: boolean }) => Promise<void>;
      cancelAnimations?: () => void;
    };
  }
}

const socials = [
  { name: "Twitch", handle: "@basedcode", benefit: "Participate in the work live", href: "https://www.twitch.tv/basedcode", icon: SiTwitch, primary: true },
  { name: "YouTube", handle: "@BasedCode", benefit: "Watch durable project breakdowns", href: "https://www.youtube.com/@BasedCode", icon: SiYoutube },
  { name: "Discord", handle: "Community", benefit: "Ask, contribute, and keep building", href: "https://discord.gg/rxJufPTM2", icon: SiDiscord },
  { name: "TikTok", handle: "@basedcodedev", benefit: "Catch useful moments and findings", href: "https://www.tiktok.com/@basedcodedev", icon: SiTiktok },
  { name: "Instagram", handle: "@basedcodedev", benefit: "Follow milestones behind the scenes", href: "https://www.instagram.com/basedcodedev/", icon: SiInstagram },
  { name: "X", handle: "@BasedCodeDev", benefit: "Get fast project and stream updates", href: "https://x.com/BasedCodeDev", icon: SiX },
  { name: "GitHub", handle: "BasedCodeDev", benefit: "Inspect the code and working tools", href: "https://github.com/BasedCodeDev", icon: SiGithub },
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
  const heroTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setLight(window.localStorage.getItem("basedcode-theme") === "light");

    const revealTitle = () => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && heroTitle.current && window.TextRipple) {
        window.TextRipple.scrambleReveal(heroTitle.current, { duration: 1350, delay: 120, preserveText: true });
      }
    };

    if (window.TextRipple) {
      revealTitle();
      return;
    }

    const rippleScript = document.createElement("script");
    rippleScript.src = "/text-ripple.js";
    rippleScript.async = true;
    rippleScript.addEventListener("load", revealTitle, { once: true });
    document.head.appendChild(rippleScript);

    return () => rippleScript.removeEventListener("load", revealTitle);
  }, []);

  const toggleTheme = () => {
    setLight((current) => {
      const next = !current;
      window.localStorage.setItem("basedcode-theme", next ? "light" : "dark");
      return next;
    });
  };

  return (
    <div className={`site ${light ? "light" : "dark"}`}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="BasedCode home"><span>Based</span>Code<span className="slash">/</span></a>
        <nav aria-label="Primary navigation"><a href="#socials">Start here</a><a href="#projects">Projects</a><a href="#about">About</a></nav>
        <div className="topbar-controls">
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
            <h1 id="hero-title" ref={heroTitle}><span className="hero-kicker">Together, we</span>build.<br /><span>play.</span><br />learn.</h1>
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

        <section className="social-section" id="socials" aria-labelledby="social-title">
          <div className="section-heading">
            <p className="eyebrow">01 / Find the signal</p>
            <h2 id="social-title">Watch. Follow.<br /><span className="no-wrap">Build with us.</span></h2>
            <p>Twitch is where the work happens live. Discord keeps the conversation going, while every other channel carries useful moments, code, and progress between builds.</p>
          </div>
          <div className="social-grid">
            {socials.map(({ name, benefit, href, icon: Icon, primary }) => (
              <a className={`social-card ${primary ? "social-primary" : ""}`} href={href} target="_blank" rel="noreferrer" key={name}>
                <span className="social-icon"><Icon aria-hidden="true" /></span>
                <span className="social-copy"><strong>{name}</strong><small>{benefit}</small></span>
                <FiArrowUpRight className="arrow" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section className="projects-section" id="projects" aria-labelledby="projects-title">
          <div className="section-heading horizontal">
            <div><p className="eyebrow">02 / Current projects</p><h2 id="projects-title">Things we’re<br />making real.</h2></div>
            <p>Real games and tools where experiments, trade-offs, and useful lessons have somewhere concrete to land.</p>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <a className="project-card" href={project.href} target="_blank" rel="noreferrer" key={project.name}>
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

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-visual">
            <div className="about-photo">
              <img src="/about/seb-live-build.jpg" alt="Seb working with fellow developers during a live PC build event." loading="lazy" />
              <span className="about-photo-tag">REAL WORK / LIVE BUILD</span>
              <div className="about-photo-meta" aria-hidden="true">
                <span>SEB FEHR / BASEDCODE</span>
                <span>BUILDING IN PUBLIC</span>
              </div>
            </div>
          </div>
          <div className="about-copy">
            <p className="eyebrow">03 / Building in public</p>
            <h2 id="about-title">Come build<br />alongside us.</h2>
            <p className="about-lede">BasedCode is where Seb builds games and software in public. See how decisions get made, ask questions, contribute where useful, and take practical lessons back to your own projects.</p>
            <p className="about-host">Seb Fehr <span>/</span> Developer · game maker · streamer</p>
            <div className="participation-cues" aria-label="Ways to participate">
              <span><small>01</small>Watch the process</span>
              <span><small>02</small>Ask better questions</span>
              <span><small>03</small>Make something real</span>
            </div>
            <a className="button about-cta" href="https://discord.gg/rxJufPTM2" target="_blank" rel="noreferrer"><SiDiscord aria-hidden="true" /> Join the Discord <FiArrowUpRight aria-hidden="true" /></a>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><span>Based</span>Code<span className="slash">/</span></a>
        <p>Building games, software, and creative technology in public—together.<span className="footer-studio">Studio work at <a href="https://actuator.digital/" target="_blank" rel="noreferrer">Actuator Digital <FiArrowUpRight aria-hidden="true" /></a></span></p>
        <a href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer">Watch a build <FiArrowUpRight aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
