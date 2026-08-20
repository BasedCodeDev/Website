"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { SiDiscord, SiGithub, SiInstagram, SiTiktok, SiTwitch, SiX, SiYoutube } from "react-icons/si";
import { FiArrowUpRight, FiCode, FiMessageCircle, FiMoon, FiPause, FiPlay, FiRadio, FiSun } from "react-icons/fi";
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
  { name: "Discord", handle: "The workshop", benefit: "Ask, contribute, and keep building", href: "https://discord.gg/rxJufPTM2", icon: SiDiscord },
  { name: "TikTok", handle: "@basedcodedev", benefit: "Catch useful moments and findings", href: "https://www.tiktok.com/@basedcodedev", icon: SiTiktok },
  { name: "Instagram", handle: "@basedcodedev", benefit: "Follow milestones behind the scenes", href: "https://www.instagram.com/basedcodedev/", icon: SiInstagram },
  { name: "X", handle: "@BasedCodeDev", benefit: "Get fast project and stream updates", href: "https://x.com/BasedCodeDev", icon: SiX },
  { name: "GitHub", handle: "BasedCodeDev", benefit: "Inspect the code and working tools", href: "https://github.com/BasedCodeDev", icon: SiGithub },
];

const projects = [
  {
    index: "01",
    name: "Not Monsters",
    type: "GAME / IN DEVELOPMENT",
    description: "A chaotic social-deduction party game where villagers brawl, accuse, and survive to expose the monsters hiding among them.",
    visitorTakeaway: "Follow a real game as prototype decisions become active production.",
    href: "https://notmonsters.actuator.games/",
    image: "/projects/not-monsters.png",
    imageAlt: "Not Monsters characters accusing each other in a medieval village",
  },
  {
    index: "02",
    name: "Based Stream Tools",
    type: "CREATOR TOOLS",
    description: "Interactive stream tools, overlays, goal tracking, and playful systems built to bring audiences into the action.",
    visitorTakeaway: "See practical creator problems become working tools you can inspect and use.",
    href: "https://basedstreamtools.com/",
    image: "/projects/based-stream-tools.jpg",
    imageAlt: "BasedCode stream showing a custom integration and live stream overlays",
  },
  {
    index: "03",
    name: "On Point",
    type: "VR GAME",
    description: "An arcade-inspired VR first-person shooter packed with rapid-fire, WarioWare-style shooting minigames.",
    visitorTakeaway: "See how an arcade shooting idea is shaped into a focused VR experience.",
    href: "https://onpoint.games/",
    image: "/projects/on-point-environment.jpg",
    imageAlt: "A moonlit castle environment from On Point",
  },
];

export default function Home() {
  const [light, setLight] = useState(false);
  const [motion, setMotion] = useState(true);
  const heroTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setLight(window.localStorage.getItem("basedcode-theme") === "light");
    setMotion(window.localStorage.getItem("basedcode-motion") !== "off");
  }, []);

  const toggleTheme = () => {
    setLight((current) => {
      const next = !current;
      window.localStorage.setItem("basedcode-theme", next ? "light" : "dark");
      return next;
    });
  };

  const runHeroRipple = () => {
    if (motion && heroTitle.current && window.TextRipple) {
      window.TextRipple.scrambleReveal(heroTitle.current, { duration: 1350, delay: 120, preserveText: true });
    }
  };

  const toggleMotion = () => {
    setMotion((current) => {
      const next = !current;
      window.localStorage.setItem("basedcode-motion", next ? "on" : "off");
      if (next) window.setTimeout(() => {
        if (heroTitle.current && window.TextRipple) {
          window.TextRipple.scrambleReveal(heroTitle.current, { duration: 1350, delay: 120, preserveText: true });
        }
      }, 0);
      else window.TextRipple?.cancelAnimations?.();
      return next;
    });
  };

  return (
    <div className={`site ${light ? "light" : "dark"} ${motion ? "motion-on" : "motion-off"}`}>
      <Script src="/text-ripple.js" strategy="afterInteractive" onLoad={runHeroRipple} />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="BasedCode home"><span>Based</span>Code<span className="slash">/</span></a>
        <nav aria-label="Primary navigation"><a href="#socials">Start here</a><a href="#projects">Projects</a><a href="#about">About</a></nav>
        <div className="topbar-controls">
          <button className="motion-toggle" type="button" onClick={toggleMotion} aria-label={motion ? "Pause motion" : "Play motion"} aria-pressed={!motion}>
            {motion ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}<span>{motion ? "Pause" : "Play"}</span>
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
            <p className="eyebrow"><span className="status-dot" /> The workshop is open</p>
            <h1 id="hero-title" ref={heroTitle}><span className="hero-line-main">Together, we build.</span><br /><span>We play.</span><br />We learn.</h1>
            <p className="hero-intro">Step inside real game and software development. Watch the decisions, ask questions, and bring useful lessons back to your own work.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer"><SiTwitch aria-hidden="true" /> Watch a build <FiArrowUpRight aria-hidden="true" /></a>
              <a className="button button-secondary" href="https://discord.gg/rxJufPTM2" target="_blank" rel="noreferrer"><SiDiscord aria-hidden="true" /> Join the Discord</a>
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
            <p className="eyebrow">01 / Start here</p>
            <h2 id="social-title">Watch. Join.<br /><span className="no-wrap">Build forward.</span></h2>
            <p>The polished result rarely shows the constraints, trade-offs, failures, and decisions that made it real. BasedCode keeps the workshop open.</p>
          </div>
          <div className="journey-grid" aria-label="How to participate with BasedCode">
            <article><span>01</span><FiPlay aria-hidden="true" /><h3>Watch real work</h3><p>See games and software take shape while the decisions are still being made.</p></article>
            <article><span>02</span><FiMessageCircle aria-hidden="true" /><h3>Join the conversation</h3><p>Ask questions, compare approaches, and contribute where it helps the work.</p></article>
            <article><span>03</span><FiCode aria-hidden="true" /><h3>Build with context</h3><p>Take the reasoning, trade-offs, and useful patterns back to your own projects.</p></article>
          </div>
          <div className="channel-heading"><p className="eyebrow">Choose your way in</p><p>Twitch and Discord are the main doors. The other channels keep the useful parts moving between builds.</p></div>
          <div className="social-grid">
            {socials.map(({ name, handle, benefit, href, icon: Icon, primary }) => (
              <a className={`social-card ${primary ? "social-primary" : ""}`} href={href} target="_blank" rel="noreferrer" key={name}>
                <span className="social-icon"><Icon aria-hidden="true" /></span>
                <span className="social-copy"><strong>{name}</strong><small>{benefit}</small><span className="social-handle">{handle}</span></span>
                <FiArrowUpRight className="arrow" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section className="projects-section" id="projects" aria-labelledby="projects-title">
          <div className="section-heading horizontal">
            <div><p className="eyebrow">02 / Work you can enter</p><h2 id="projects-title">Real projects.<br />Visible decisions.</h2></div>
            <p>These are not polished demos built for the homepage. They are the active games and tools that make the lessons concrete.</p>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <a className="project-card" href={project.href} target="_blank" rel="noreferrer" key={project.name}>
                <span className="project-image">
                  <img src={project.image} alt={project.imageAlt} loading="lazy" />
                  <span className="project-index">{project.index}</span>
                </span>
                <div className="project-copy"><small>{project.type}</small><h3>{project.name}</h3><p className="project-description">{project.description}</p><p className="project-takeaway"><span>What you’ll see</span>{project.visitorTakeaway}</p></div>
                <span className="project-open"><FiArrowUpRight aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-visual" aria-hidden="true">
            <div className="about-mark">
              <span className="about-mark-corner">BC / 03</span>
              <div className="about-monogram"><span>&lt;/</span><strong>BC</strong></div>
              <div className="about-mark-meta"><span>creator / community</span><span>build · play · learn</span></div>
            </div>
            <div className="about-signal"><span><i /> Signal active</span><span>Always shipping</span></div>
          </div>
          <div className="about-copy">
            <p className="eyebrow">03 / Your guide</p>
            <h2 id="about-title">The workshop is open.<br />The work is real.</h2>
            <p className="about-lede">Building is messy, uncertain, and easier when you can see the decisions—not just the polished result. Seb builds real games and software in public, explaining the constraints, mistakes, and trade-offs as they happen. BasedCode opens that workshop so you can learn alongside the work, not be sold a shortcut.</p>
            <p className="about-meta">Hosted by Seb <span>/</span> Creator-led <span>/</span> Community-minded</p>
            <div className="principles">
              <span><FiCode aria-hidden="true" /><strong>Build real things</strong><small>Evidence before hype</small></span>
              <span><FiPlay aria-hidden="true" /><strong>Test through play</strong><small>Ideas meet reality</small></span>
              <span><FiRadio aria-hidden="true" /><strong>Share the reasoning</strong><small>Decisions stay visible</small></span>
            </div>
          </div>
        </section>

        <section className="success-section" aria-labelledby="success-title">
          <div className="success-panel">
            <p className="eyebrow">04 / Take it with you</p>
            <h2 id="success-title">Leave with a clearer next move.</h2>
            <p>A better question. A useful pattern. A mistake you can avoid. Or simply the confidence that messy work can become something real.</p>
            <div className="success-actions">
              <a className="button button-primary" href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer"><SiTwitch aria-hidden="true" /> Watch a build <FiArrowUpRight aria-hidden="true" /></a>
              <a className="button button-secondary" href="https://discord.gg/rxJufPTM2" target="_blank" rel="noreferrer"><SiDiscord aria-hidden="true" /> Join the Discord</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><span>Based</span>Code<span className="slash">/</span></a>
        <p>Real work, visible decisions, and a workshop you can step into.</p>
        <a href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer">Watch a build <FiArrowUpRight aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
