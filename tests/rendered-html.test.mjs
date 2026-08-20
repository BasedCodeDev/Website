import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const exportedIndex = new URL("../dist/client/index.html", import.meta.url);

test("exports the BasedCode homepage for static hosting", async () => {
  const html = await readFile(exportedIndex, "utf8");

  assert.match(html, /<title>BasedCode — Together, we build\.<\/title>/i);
  assert.match(html, /Together, we/);
  assert.match(html, /Step inside real game and software development\./);
  assert.match(html, /https:\/\/www\.twitch\.tv\/basedcode/);
  assert.match(html, /Not Monsters/);
  assert.match(html, /Based Stream Tools/);
  assert.match(html, /On Point/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps required static assets in the Pages artifact", async () => {
  const requiredAssets = [
    "dist/client/favicon.svg",
    "dist/client/og.png",
    "dist/client/text-ripple.js",
    "dist/client/about/seb-live-build.jpg",
    "dist/client/projects/not-monsters.png",
    "dist/client/projects/based-stream-tools.jpg",
    "dist/client/projects/on-point-environment.jpg",
  ];

  await Promise.all(requiredAssets.map((asset) => access(new URL(asset, projectRoot))));
});
