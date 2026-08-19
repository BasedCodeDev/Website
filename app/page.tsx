"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { SiDiscord, SiGithub, SiInstagram, SiTiktok, SiTwitch, SiX, SiYoutube } from "react-icons/si";
import { FiArrowDown, FiArrowUpRight, FiCode, FiMoon, FiPlay, FiRadio, FiSun } from "react-icons/fi";

declare global {
  interface Window {
    TextRipple?: {
      scrambleReveal: (element: Element, options?: { duration?: number; delay?: number; preserveText?: boolean }) => Promise<void>;
    };
  }
}

const socials = [
  { name: "Twitch", handle: "@basedcode", href: "https://www.twitch.tv/basedcode", icon: SiTwitch, primary: true },
  { name: "YouTube", handle: "@BasedCode", href: "https://www.youtube.com/@BasedCode", icon: SiYoutube },
  { name: "Discord", handle: "Join the community", href: "https://discord.gg/rxJufPTM2", icon: SiDiscord },
  { name: "TikTok", handle: "@basedcodedev", href: "https://www.tiktok.com/@basedcodedev", icon: SiTiktok },
  { name: "Instagram", handle: "@basedcodedev", href: "https://www.instagram.com/basedcodedev/", icon: SiInstagram },
  { name: "X", handle: "@BasedCodeDev", href: "https://x.com/BasedCodeDev", icon: SiX },
  { name: "GitHub", handle: "BasedCodeDev", href: "https://github.com/BasedCodeDev", icon: SiGithub },
];

const projects = [
  {
    index: "01",
    name: "Not Monsters",
    type: "GAME / IN DEVELOPMENT",
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
    imageAlt: "BasedCode stream showing a custom integration and live stream overlays",
  },
  {
    index: "03",
    name: "On Point",
    type: "VR GAME",
    description: "An arcade-inspired VR first-person shooter packed with rapid-fire, WarioWare-style shooting minigames.",
    href: "https://onpoint.games/",
    image: "/projects/on-point-environment.jpg",
    imageAlt: "A moonlit castle environment from On Point",
  },
];

export default function Home() {
  const [light, setLight] = useState(false);
  const heroTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setLight(window.localStorage.getItem("basedcode-theme") === "light");
  }, []);

  const toggleTheme = () => {
    setLight((current) => {
      const next = !current;
      window.localStorage.setItem("basedcode-theme", next ? "light" : "dark");
      return next;
    });
  };

  const runHeroRipple = () => {
    if (heroTitle.current && window.TextRipple) {
      window.TextRipple.scrambleReveal(heroTitle.current, { duration: 1350, delay: 120, preserveText: true });
    }
  };

  return (
    <div className={`site ${light ? "light" : "dark"}`}>
      <Script src="/text-ripple.js" strategy="afterInteractive" onLoad={runHeroRipple} />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="BasedCode home"><span>Based</span>Code<span className="slash">/</span></a>
        <nav aria-label="Primary navigation"><a href="#socials">Socials</a><a href="#projects">Projects</a><a href="#about">About</a></nav>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${light ? "dark" : "light"} theme`}>
          {light ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}<span>{light ? "Dark" : "Light"}</span>
        </button>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> Building in public</p>
            <h1 id="hero-title" ref={heroTitle}>Build it.<br /><span>Play it.</span><br />Learn it.</h1>
            <p className="hero-intro">Games, software, AI experiments, and the honest decisions behind shipping real things.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer"><SiTwitch aria-hidden="true" /> Watch on Twitch <FiArrowUpRight aria-hidden="true" /></a>
              <a className="button button-secondary" href="#socials">Find BasedCode <FiArrowDown aria-hidden="true" /></a>
            </div>
          </div>

          <a className="stream-card" href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer" aria-label="Visit BasedCode on Twitch">
            <div className="stream-topline"><span><FiRadio aria-hidden="true" /> TWITCH / BASEDCODE</span><span>LIVE BUILDS</span></div>
            <div className="stream-window">
              <div className="code-lines" aria-hidden="true"><span>const idea = build();</span><span>while (!shipped) iterate();</span><span>learn(result);</span></div>
              <span className="play"><FiPlay aria-hidden="true" /></span>
            </div>
            <div className="stream-footer"><strong>Come watch the work happen.</strong><span>twitch.tv/basedcode <FiArrowUpRight aria-hidden="true" /></span></div>
          </a>
        </section>

        <section className="social-section" id="socials" aria-labelledby="social-title">
          <div className="section-heading">
            <p className="eyebrow">01 / Find the signal</p>
            <h2 id="social-title">Watch. Follow.<br />Build with us.</h2>
            <p>Twitch is the main stage. Everywhere else keeps the work, clips, code, and community moving between streams.</p>
          </div>
          <div className="social-grid">
            {socials.map(({ name, handle, href, icon: Icon, primary }) => (
              <a className={`social-card ${primary ? "social-primary" : ""}`} href={href} target="_blank" rel="noreferrer" key={name}>
                <span className="social-icon"><Icon aria-hidden="true" /></span>
                <span className="social-copy"><strong>{name}</strong><small>{handle}</small></span>
                <FiArrowUpRight className="arrow" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section className="projects-section" id="projects" aria-labelledby="projects-title">
          <div className="section-heading horizontal">
            <div><p className="eyebrow">02 / Current projects</p><h2 id="projects-title">Things we’re<br />making real.</h2></div>
            <p>Games and tools built through practical experiments, visible iteration, and a willingness to show what breaks.</p>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <a className="project-card" href={project.href} target="_blank" rel="noreferrer" key={project.name}>
                <span className="project-image">
                  <img src={project.image} alt={project.imageAlt} loading="lazy" />
                  <span className="project-index">{project.index}</span>
                </span>
                <div className="project-copy"><small>{project.type}</small><h3>{project.name}</h3><p>{project.description}</p></div>
                <span className="project-open"><FiArrowUpRight aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-mark" aria-hidden="true"><span>&lt;/</span>BC</div>
          <div className="about-copy">
            <p className="eyebrow">03 / BasedCode</p>
            <h2 id="about-title">Real work.<br />Useful lessons.<br />No guru theatre.</h2>
            <p>BasedCode is Seb Fehr’s creator and technology brand. It turns active game and software production into useful, entertaining content through live development, technical explanation, honest experiments, and visible outcomes.</p>
            <div className="principles"><span><FiCode /> Build</span><span><FiPlay /> Play</span><span><FiRadio /> Learn live</span></div>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><span>Based</span>Code<span className="slash">/</span></a>
        <p>Building games, software, and creative technology in public.</p>
        <a href="https://www.twitch.tv/basedcode" target="_blank" rel="noreferrer">Watch on Twitch <FiArrowUpRight aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
