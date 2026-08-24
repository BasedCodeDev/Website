import { readFile, writeFile } from "node:fs/promises";
import {
  getYouTubeShortThumbnailUrl,
  normaliseYouTubeShortThumbnail,
} from "../app/youtubeShorts.mjs";

const SHORTS_PAGE_URL = "https://www.youtube.com/@BasedCode/shorts?hl=en&gl=AU";
const OUTPUT_FILE = new URL("../public/youtube-shorts.json", import.meta.url);
const RECENT_POOL_SIZE = 24;
const SHORTS_LIMIT = 15;

async function readExistingShorts() {
  try {
    const data = JSON.parse(await readFile(OUTPUT_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function extractInitialData(html) {
  const marker = "var ytInitialData = ";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) throw new Error("YouTube initial data was not found");

  const jsonStart = markerIndex + marker.length;
  const jsonEnd = html.indexOf(";</script>", jsonStart);
  if (jsonEnd === -1) throw new Error("YouTube initial data was incomplete");
  return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function parseViewCount(viewText) {
  if (typeof viewText !== "string") return 0;

  const match = viewText.toLowerCase().replaceAll(",", "").trim().match(/([\d.]+)\s*([kmb])?/);
  if (!match) return 0;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;

  const multipliers = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };
  return Math.round(value * (multipliers[match[2]] ?? 1));
}

function extractThumbnail(lockup, id) {
  const sources = lockup.thumbnailViewModel?.thumbnailViewModel?.image?.sources;
  if (!Array.isArray(sources)) return getYouTubeShortThumbnailUrl(id);

  const preferredSources = sources
    .filter((source) => source && typeof source === "object")
    .map((source) => ({
      url: normaliseYouTubeShortThumbnail(source.url, id),
      width: Number.isFinite(source.width) ? source.width : 0,
      height: Number.isFinite(source.height) ? source.height : 0,
    }))
    .filter((source) => source.url)
    .sort((left, right) => {
      const leftRatioError = left.height ? Math.abs(left.width / left.height - 9 / 16) : Number.POSITIVE_INFINITY;
      const rightRatioError = right.height ? Math.abs(right.width / right.height - 9 / 16) : Number.POSITIVE_INFINITY;
      return leftRatioError - rightRatioError || right.width * right.height - left.width * left.height;
    });

  return preferredSources[0]?.url ?? getYouTubeShortThumbnailUrl(id);
}

function extractShorts(initialData) {
  const results = [];
  const seen = new Set();
  const stack = [initialData];

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) {
      for (let index = node.length - 1; index >= 0; index -= 1) stack.push(node[index]);
      continue;
    }

    const lockup = node.shortsLockupViewModel;
    if (lockup && typeof lockup === "object") {
      const id = lockup.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
      const title = lockup.overlayMetadata?.primaryText?.content;
      const viewText = lockup.overlayMetadata?.secondaryText?.content;
      if (typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id) && typeof title === "string" && title.trim() && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          title: title.trim(),
          url: `https://www.youtube.com/shorts/${id}`,
          thumbnailUrl: extractThumbnail(lockup, id),
          ...(typeof viewText === "string" && viewText.trim() ? { viewText: viewText.trim() } : {}),
        });
      }
    }

    const values = Object.values(node);
    for (let index = values.length - 1; index >= 0; index -= 1) stack.push(values[index]);
  }

  return results
    .slice(0, RECENT_POOL_SIZE)
    .map((short, recencyIndex) => ({
      ...short,
      viewCount: parseViewCount(short.viewText),
      recencyIndex,
    }))
    .sort((a, b) => b.viewCount - a.viewCount || a.recencyIndex - b.recencyIndex)
    .slice(0, SHORTS_LIMIT)
    .map((short) => {
      const selectedShort = { ...short };
      delete selectedShort.recencyIndex;
      return selectedShort;
    });
}

const existingShorts = await readExistingShorts();

try {
  const response = await fetch(SHORTS_PAGE_URL, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-AU,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; BasedCodeSite/1.0)",
    },
  });
  if (!response.ok) throw new Error(`YouTube returned ${response.status}`);

  const shorts = extractShorts(extractInitialData(await response.text()));
  if (!shorts.length) throw new Error("No YouTube Shorts were returned");

  await writeFile(OUTPUT_FILE, `${JSON.stringify(shorts, null, 2)}\n`, "utf8");
  process.stdout.write(`Prepared ${shorts.length} YouTube Shorts.\n`);
} catch (error) {
  if (!existingShorts.length) await writeFile(OUTPUT_FILE, "[]\n", "utf8");
  process.stderr.write(`Using the existing YouTube Shorts cache: ${error.message}\n`);
}
