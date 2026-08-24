export const YOUTUBE_CHANNEL_ID = "UCGE_y8dIQMLQPl-bAj-TNfA";
export const YOUTUBE_CHANNEL_NAME = "Based Code";
export const YOUTUBE_SHORTS_PROVIDERS = Object.freeze([
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
]);
export const RECENT_SHORTS_POOL_SIZE = 24;
export const DISPLAYED_SHORTS_LIMIT = 15;

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeShortThumbnailUrl(id) {
  return VIDEO_ID_PATTERN.test(id) ? `https://i.ytimg.com/vi/${id}/frame0.jpg` : null;
}

export function normaliseYouTubeShortThumbnail(value, expectedId) {
  if (typeof value !== "string" || !VIDEO_ID_PATTERN.test(expectedId)) return null;

  try {
    const source = new URL(value);
    const match = source.pathname.match(/^\/vi\/([A-Za-z0-9_-]{11})\/(?:sardefault|oar2|hq720(?:_\d+)?)\.jpg$/);
    const isYouTubeSource = source.protocol === "https:" && (
      source.hostname === "i.ytimg.com"
      || source.searchParams.get("host") === "i.ytimg.com"
    );
    if (!isYouTubeSource || match?.[1] !== expectedId) return null;

    const thumbnail = new URL(`https://i.ytimg.com${source.pathname}`);
    for (const key of ["sqp", "rs", "usqp"]) {
      const parameter = source.searchParams.get(key);
      if (parameter && parameter.length <= 512) thumbnail.searchParams.set(key, parameter);
    }
    return thumbnail.href;
  } catch {
    return null;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normaliseProviderUrl(value) {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function extractVideoId(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value, "https://www.youtube.com");
    const candidate = url.pathname.startsWith("/shorts/")
      ? url.pathname.split("/")[2]
      : url.searchParams.get("v");
    return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function belongsToBasedCode(entry) {
  if (typeof entry.uploaderUrl !== "string") return false;

  try {
    const path = new URL(entry.uploaderUrl, "https://www.youtube.com").pathname.replace(/\/+$/, "");
    const channelPath = `/channel/${YOUTUBE_CHANNEL_ID}`;
    return path === channelPath || path.startsWith(`${channelPath}/`);
  } catch {
    return false;
  }
}

export function getPipedShortsTabData(payload) {
  if (!isRecord(payload) || payload.id !== YOUTUBE_CHANNEL_ID || !Array.isArray(payload.tabs)) return null;

  const shortsTab = payload.tabs.find((tab) => (
    isRecord(tab)
    && typeof tab.name === "string"
    && tab.name.trim().toLocaleLowerCase("en-AU") === "shorts"
    && typeof tab.data === "string"
    && tab.data.trim()
  ));

  return shortsTab ? shortsTab.data.trim() : null;
}

export function normalisePipedShorts(payload, retrievedAt = Date.now()) {
  if (!isRecord(payload) || !Array.isArray(payload.content)) return [];

  const timestamp = Number.isFinite(retrievedAt) && retrievedAt >= 0 ? retrievedAt : Date.now();
  const seen = new Set();
  const recent = [];

  for (const entry of payload.content) {
    if (recent.length >= RECENT_SHORTS_POOL_SIZE) break;
    if (!isRecord(entry) || entry.type !== "stream" || entry.isShort !== true) continue;
    if (!belongsToBasedCode(entry)) continue;

    const id = extractVideoId(entry.url);
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    const viewCount = entry.views;
    if (!id || !title || seen.has(id)) continue;
    if (!Number.isSafeInteger(viewCount) || viewCount < 0) continue;

    seen.add(id);
    recent.push({
      id,
      title,
      url: `https://www.youtube.com/shorts/${id}`,
      thumbnailUrl: normaliseYouTubeShortThumbnail(entry.thumbnail, id) ?? getYouTubeShortThumbnailUrl(id),
      viewCount,
      retrievedAt: timestamp,
      recentIndex: recent.length,
    });
  }

  return recent
    .sort((left, right) => right.viewCount - left.viewCount || left.recentIndex - right.recentIndex)
    .slice(0, DISPLAYED_SHORTS_LIMIT)
    .map((short) => ({
      id: short.id,
      title: short.title,
      url: short.url,
      thumbnailUrl: short.thumbnailUrl,
      viewCount: short.viewCount,
      retrievedAt: short.retrievedAt,
    }));
}

export function formatYouTubeViewCount(value, locale = "en-AU") {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatExactYouTubeViewCount(value, locale = "en-AU") {
  return new Intl.NumberFormat(locale).format(value);
}

async function requestJson(url, fetchImpl, signal) {
  const response = await fetchImpl(url, {
    cache: "no-store",
    credentials: "omit",
    headers: { Accept: "application/json" },
    referrerPolicy: "no-referrer",
    signal,
  });

  if (!response.ok) return null;
  return response.json();
}

export async function fetchPipedShortsFromProvider(provider, options = {}) {
  const baseUrl = normaliseProviderUrl(provider);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const parentSignal = options.signal;
  if (!baseUrl || typeof fetchImpl !== "function" || parentSignal?.aborted) return null;

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

  try {
    const channel = await requestJson(
      `${baseUrl}/channel/${YOUTUBE_CHANNEL_ID}`,
      fetchImpl,
      controller.signal,
    );
    const tabData = getPipedShortsTabData(channel);
    if (!tabData) return null;

    const tab = await requestJson(
      `${baseUrl}/channels/tabs?data=${encodeURIComponent(tabData)}`,
      fetchImpl,
      controller.signal,
    );
    const shorts = normalisePipedShorts(tab, options.now ?? Date.now());
    return shorts.length ? shorts : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", forwardAbort);
  }
}

export async function fetchLiveYouTubeShorts(options = {}) {
  const providers = options.providers ?? YOUTUBE_SHORTS_PROVIDERS;

  for (const provider of providers) {
    if (options.signal?.aborted) return null;
    const shorts = await fetchPipedShortsFromProvider(provider, options);
    if (shorts) return shorts;
  }

  return null;
}
