import { readFile, writeFile } from "node:fs/promises";

const SHORTS_PAGE_URL = "https://www.youtube.com/@BasedCode/shorts?hl=en&gl=AU";
const OUTPUT_FILE = new URL("../public/youtube-shorts.json", import.meta.url);

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
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/frame0.jpg`,
          ...(typeof viewText === "string" && viewText.trim() ? { viewText: viewText.trim() } : {}),
        });
      }
    }

    const values = Object.values(node);
    for (let index = values.length - 1; index >= 0; index -= 1) stack.push(values[index]);
  }

  return results.slice(0, 8);
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
