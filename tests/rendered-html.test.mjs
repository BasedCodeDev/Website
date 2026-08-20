import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const exportedIndex = new URL("../dist/client/index.html", import.meta.url);

test("exports the BasedCode homepage for static hosting", async () => {
  const html = await readFile(exportedIndex, "utf8");

  assert.match(html, /<title>BasedCode — Together, we build\.<\/title>/i);
  assert.match(html, /Together, we/);
  assert.match(html, /id="hero-title"[^>]*data-ripple/);
  assert.match(html, /id="social-title"[^>]*data-ripple/);
  assert.match(html, /id="projects-title"[^>]*data-ripple/);
  assert.match(html, /id="about-title"[^>]*data-ripple/);
  assert.match(html, /class="hero-word">build\.<\/span>/);
  assert.match(html, /class="hero-word">play\.<\/span>/);
  assert.match(html, /class="hero-word">learn\.<\/span>/);
  assert.match(html, /Step inside real game and software development\./);
  assert.match(html, /https:\/\/www\.twitch\.tv\/basedcode/);
  assert.match(html, /Recent broadcasts/);
  assert.match(html, /View all/);
  assert.match(html, /Recent hits/);
  assert.match(html, /All Shorts/);
  assert.match(html, /Not Monsters/);
  assert.match(html, /Based Stream Tools/);
  assert.match(html, /On Point/);
  assert.match(html, /https:\/\/brand\.basedcode\.dev\//);
  assert.match(html, /Brand guide/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
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

test("exports small Twitch thumbnails for recent VODs", async () => {
  const vods = JSON.parse(await readFile(new URL("../dist/client/twitch-vods.json", import.meta.url), "utf8"));

  assert.ok(Array.isArray(vods) && vods.length > 1);
  for (const vod of vods) {
    assert.match(vod.url, /^https:\/\/www\.twitch\.tv\/videos\/\d+$/);
    if (vod.thumbnailUrl) assert.match(vod.thumbnailUrl, /^https:\/\/static-cdn\.jtvnw\.net\/.*-160x90\.jpg$/);
  }
});

test("exports successful recent BasedCode YouTube Shorts", async () => {
  const shorts = JSON.parse(await readFile(new URL("../dist/client/youtube-shorts.json", import.meta.url), "utf8"));

  assert.ok(Array.isArray(shorts) && shorts.length > 2);
  for (const short of shorts) {
    assert.match(short.id, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(short.url, `https://www.youtube.com/shorts/${short.id}`);
    assert.equal(short.thumbnailUrl, `https://i.ytimg.com/vi/${short.id}/frame0.jpg`);
    assert.ok(Number.isInteger(short.viewCount) && short.viewCount >= 0);
  }

  for (let index = 1; index < shorts.length; index += 1) {
    assert.ok(shorts[index - 1].viewCount >= shorts[index].viewCount);
  }
});
