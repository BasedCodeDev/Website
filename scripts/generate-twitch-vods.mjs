import { readFile, writeFile } from "node:fs/promises";

const VODS_URL = "https://decapi.me/twitch/videos/basedcode?limit=5&separator=%0A";
const OUTPUT_FILE = new URL("../public/twitch-vods.json", import.meta.url);

function parseVods(response) {
  return response
    .trim()
    .split(/\r?\n|\s+\|\s+/)
    .flatMap((entry) => {
      const match = entry.trim().match(/^(.*?)\s+-\s+(https:\/\/www\.twitch\.tv\/videos\/(\d+))(?:\?.*)?$/s);
      if (!match || !match[1].trim()) return [];
      return [{ id: match[3], title: match[1].trim(), url: match[2] }];
    })
    .slice(0, 5);
}

async function readExistingVods() {
  try {
    const data = JSON.parse(await readFile(OUTPUT_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function extractSmallThumbnail(html) {
  const meta = html.match(/<meta\b(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'])[^>]*>/i)?.[0];
  const content = meta?.match(/\bcontent=["']([^"']+)["']/i)?.[1]?.replaceAll("&amp;", "&");
  if (!content) return null;

  const url = new URL(content);
  if (url.hostname !== "static-cdn.jtvnw.net" || !url.pathname.includes("/cf_vods/")) return null;
  url.pathname = url.pathname.replace(/thumb\d+-\d+x\d+\.jpg$/, "thumb0-160x90.jpg");
  url.search = "";
  return url.href;
}

async function requestThumbnail(vod) {
  const response = await fetch(vod.url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Twitterbot/1.0 BasedCodeSite/1.0",
    },
  });
  if (!response.ok) throw new Error(`Twitch returned ${response.status} for VOD ${vod.id}`);
  return extractSmallThumbnail(await response.text());
}

const existingVods = await readExistingVods();
const existingById = new Map(existingVods.map((vod) => [vod.id, vod]));

try {
  const response = await fetch(VODS_URL, { headers: { Accept: "text/plain" } });
  if (!response.ok) throw new Error(`DecAPI returned ${response.status}`);

  const vods = parseVods(await response.text());
  if (!vods.length) throw new Error("No recent Twitch VODs were returned");

  const enrichedVods = await Promise.all(vods.map(async (vod) => {
    try {
      const thumbnailUrl = await requestThumbnail(vod);
      return thumbnailUrl ? { ...vod, thumbnailUrl } : { ...vod, thumbnailUrl: existingById.get(vod.id)?.thumbnailUrl };
    } catch {
      return { ...vod, thumbnailUrl: existingById.get(vod.id)?.thumbnailUrl };
    }
  }));

  await writeFile(OUTPUT_FILE, `${JSON.stringify(enrichedVods, null, 2)}\n`, "utf8");
  process.stdout.write(`Prepared ${enrichedVods.filter((vod) => vod.thumbnailUrl).length} Twitch VOD thumbnails.\n`);
} catch (error) {
  if (!existingVods.length) await writeFile(OUTPUT_FILE, "[]\n", "utf8");
  process.stderr.write(`Using the existing Twitch VOD cache: ${error.message}\n`);
}
