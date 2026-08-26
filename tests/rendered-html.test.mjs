import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const exportedIndex = new URL("../dist/client/index.html", import.meta.url);

test("exports the BasedCode homepage for static hosting", async () => {
  const html = await readFile(exportedIndex, "utf8");

  assert.match(html, /<title>BasedCode — Together, we build\.<\/title>/i);
  assert.match(html, /<script[^>]+src="\/text-ripple\.js"/i);
  assert.match(html, /aria-label="Pause motion"/i);
  assert.match(html, /site dark motion-enabled motion-forced/);
  assert.match(html, /data-reveal-section/);
  assert.match(html, /data-reveal-item/);
  assert.match(html, /data-reveal-axis="x"/);
  assert.match(html, /Together, we/);
  assert.match(html, /id="hero-title"[^>]*data-ripple/);
  assert.match(html, /<p class="eyebrow"[^>]*data-section-ripple[^>]*>01 \/ Find the signal/);
  assert.match(html, /<p class="eyebrow"[^>]*data-section-ripple[^>]*>02 \/ Current projects/);
  assert.match(html, /<p class="eyebrow"[^>]*data-section-ripple[^>]*>03 \/ Building in public/);
  assert.doesNotMatch(html, /id="(?:social|projects|about)-title"[^>]*data-ripple/);
  assert.match(html, /class="hero-word">build\.<\/span>/);
  assert.match(html, /class="hero-word">play\.<\/span>/);
  assert.match(html, /class="hero-word">learn\.<\/span>/);
  assert.match(html, /<footer class="site-footer">/);
  assert.match(html, /<header class="topbar"><a class="brand" href="\/" aria-label="BasedCode home">/);
  assert.match(html, /Step inside real game and software development\./);
  assert.match(html, /https:\/\/www\.twitch\.tv\/basedcode/);
  for (const href of [
    "https://www.youtube.com/@BasedCode",
    "https://discord.gg/rxJufPTM2",
    "https://www.tiktok.com/@basedcodedev",
    "https://www.instagram.com/basedcodedev/",
    "https://x.com/BasedCodeDev",
    "https://github.com/BasedCodeDev",
  ]) {
    assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(html, /Recent broadcasts/);
  assert.match(html, /View all/);
  assert.match(html, /Recent hits/);
  assert.match(html, /All Shorts/);
  assert.match(html, /Not Monsters/);
  assert.match(html, /Based Stream Tools/);
  assert.match(html, /On Point/);
  assert.match(html, /https:\/\/brand\.basedcode\.dev\//);
  assert.match(html, /Brand guide/);
  assert.doesNotMatch(html, /<nav aria-label="Primary navigation">[\s\S]*?href="\/media-kit\/"[\s\S]*?<\/nav>/);
  assert.match(html, /class="button about-media-link" href="\/media-kit\/"/);
  for (const platform of ["twitch", "youtube", "discord", "tiktok", "instagram", "x", "github"]) {
    assert.match(html, new RegExp(`data-stat-key="${platform}"`));
  }
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("exports the BasedCode media kit with profiles, photos, and music", async () => {
  const html = await readFile(new URL("../dist/client/media-kit/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Media Kit — BasedCode<\/title>/i);
  assert.match(html, /<header class="topbar media-kit-topbar"><a class="brand" href="\/" aria-label="BasedCode home">/);
  assert.match(html, /Official assets \/ Press &amp; editorial/);
  assert.match(html, /Profile pictures/);
  assert.match(html, /Photo library/);
  assert.match(html, /Theme music/);
  assert.match(html, /These tracks may be used in media for the BasedCode brand\./);
  assert.doesNotMatch(html, /confirm usage rights/i);
  assert.match(html, /Seb Fehr \/ BasedCode/);
  assert.match(html, /https:\/\/open\.spotify\.com\/artist\/3JMAWJdzaT0eocfryPKv0M/);
  assert.match(html, /basedcode-theme-vocals-bella\.wav/);
  assert.match(html, /basedcode-theme-instrumental-bella\.mp3/);
  assert.match(html, /seb-fehr-profile-square\.png/);
  assert.match(html, /seb-fehr-profile-purple\.png/);
  assert.match(html, /xr-hub-speaking\.jpg/);
  assert.match(html, /vr-demonstration-blaster\.jpg/);
});

test("keeps media kit downloads and lightweight previews in the static artifact", async () => {
  const photoNames = [
    "seb-live-build-team",
    "seb-white-studio-portrait",
    "red-bull-team-stage",
    "community-art-gallery",
    "red-bull-team-selfie",
    "red-bull-team-finale",
    "red-bull-team-social",
    "games-event-speakers",
    "sports-event-portrait",
    "sports-event-pair",
    "xr-hub-audience",
    "xr-hub-speaking",
    "xr-hub-panel",
    "xr-hub-panel-speaking",
    "xr-hub-audience-profile",
    "vr-demonstration-headset",
    "vr-demonstration-assisting",
    "vr-demonstration-blaster",
    "vr-demonstration-conversation",
    "basedcode-build-it-live",
    "xr-hub-speaker-portrait",
  ];
  const pngDownloads = new Set(["seb-white-studio-portrait", "basedcode-build-it-live"]);
  const requiredAssets = [
    "dist/client/media-kit/previews/seb-fehr-profile-square.webp",
    "dist/client/media-kit/previews/seb-fehr-profile-purple.webp",
    "dist/client/media-kit/downloads/seb-fehr-profile-square.png",
    "dist/client/media-kit/downloads/seb-fehr-profile-purple.png",
    "dist/client/media-kit/audio/basedcode-theme-vocals-bella.wav",
    "dist/client/media-kit/audio/basedcode-theme-instrumental-bella.mp3",
    ...photoNames.flatMap((name) => [
      `dist/client/media-kit/previews/${name}.webp`,
      `dist/client/media-kit/downloads/${name}.${pngDownloads.has(name) ? "png" : "jpg"}`,
    ]),
  ];

  await Promise.all(requiredAssets.map((asset) => access(new URL(asset, projectRoot))));
});

test("keeps required static assets in the Pages artifact", async () => {
  const requiredAssets = [
    "dist/client/favicon.svg",
    "dist/client/og.png",
    "dist/client/text-ripple.js",
    "dist/client/twitch-vods.json",
    "dist/client/youtube-shorts.json",
    "dist/client/about/seb-live-build.jpg",
    "dist/client/projects/not-monsters.png",
    "dist/client/projects/based-stream-tools.jpg",
    "dist/client/projects/on-point-environment.jpg",
  ];

  await Promise.all(requiredAssets.map((asset) => access(new URL(asset, projectRoot))));
});

test("keeps small cached Twitch thumbnails as an outage fallback", async () => {
  const vods = JSON.parse(await readFile(new URL("../dist/client/twitch-vods.json", import.meta.url), "utf8"));

  assert.ok(Array.isArray(vods) && vods.length > 1);
  for (const vod of vods) {
    assert.match(vod.url, /^https:\/\/www\.twitch\.tv\/videos\/\d+$/);
    if (vod.thumbnailUrl) assert.match(vod.thumbnailUrl, /^https:\/\/static-cdn\.jtvnw\.net\/.*-160x90\.jpg$/);
  }
});

test("exports successful recent BasedCode YouTube Shorts", async () => {
  const shorts = JSON.parse(await readFile(new URL("../dist/client/youtube-shorts.json", import.meta.url), "utf8"));
  const html = await readFile(exportedIndex, "utf8");

  assert.ok(Array.isArray(shorts));
  assert.equal(shorts.length, 15);
  for (const short of shorts) {
    assert.match(short.id, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(short.url, `https://www.youtube.com/shorts/${short.id}`);
    assert.match(short.thumbnailUrl, new RegExp(`^https://i\\.ytimg\\.com/vi/${short.id}/(?:sardefault|oar2|hq720(?:_\\d+)?|frame0)\\.jpg(?:\\?.*)?$`));
    assert.ok(Number.isInteger(short.viewCount) && short.viewCount >= 0);
  }

  for (let index = 1; index < shorts.length; index += 1) {
    assert.ok(shorts[index - 1].viewCount >= shorts[index].viewCount);
  }

  for (const short of shorts) {
    if (short.viewText) assert.doesNotMatch(html, new RegExp(`>${short.viewText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<`));
  }

  assert.match(html, /data-shorts-state="fallback"/);
  assert.match(html, /Recent BasedCode Shorts\./);
});

test("keeps live Twitch autoplay and visible live feedback", async () => {
  const [playerSource, styles] = await Promise.all([
    readFile(new URL("../app/TwitchHeroPlayer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(playerSource, /autoplay:\s*true/);
  assert.match(playerSource, /muted:\s*true/);
  assert.match(playerSource, /const onOnline = \(\) => \{[\s\S]*?startMutedPlayback\(\);[\s\S]*?\};/);
  assert.match(playerSource, /!playerVisible \|\| !scriptReady/);
  assert.match(playerSource, /visibleRatio >= 0\.5/);
  assert.match(playerSource, /window\.addEventListener\("scroll", updatePlayerVisibility/);
  assert.match(playerSource, /document\.addEventListener\("visibilitychange", attemptVisiblePlayback\)/);
  assert.match(playerSource, /LIVE — PRESS PLAY/);
  assert.match(playerSource, /!playbackStartedRef\.current\) setAutoplayBlocked\(true\)/);
  assert.match(playerSource, /status === "live" \? "is-live"/);
  assert.match(playerSource, /role="status" aria-live="polite"/);
  assert.match(styles, /\.stream-card\.is-live\s*\{/);
  assert.match(styles, /\.stream-status\.status-live\s*\{/);
});

test("renders compact YouTube subscribers and channel views when available", async () => {
  const [pageSource, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /stat\.secondary/);
  assert.match(pageSource, /social-stat-separator/);
  assert.match(pageSource, /aria-label=\{exactStat\}/);
  assert.match(styles, /\.social-stat\s*\{[^}]*white-space:\s*nowrap/);
});
