const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const TWITCH_WEB_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const TWITCH_CHANNEL = "basedcode";
const DEFAULT_TIMEOUT_MS = 5000;

const VIDEO_METADATA_QUERY = `query VideoMetadata($videoID: ID!) {
  video(id: $videoID) {
    id
    title
    description
    createdAt
    publishedAt
    lengthSeconds
    viewCount
    previewThumbnailURL(width: 320, height: 180)
    owner { login }
    game { name }
  }
}`;

function normaliseString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normaliseNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

export function normaliseTwitchThumbnailUrl(value) {
  if (typeof value !== "string") return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;

    if (url.hostname === "static-cdn.jtvnw.net" && url.pathname.includes("/cf_vods/")) {
      url.pathname = url.pathname.replace(/thumb\d+-\d+x\d+\.jpg$/, "thumb0-320x180.jpg");
      url.search = "";
      return url.href;
    }

    if (url.hostname === "vod-secure.twitch.tv" && /^\/_404\/404_processing_\d+x\d+\.png$/.test(url.pathname)) {
      url.search = "";
      return url.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function parseTwitchVideoMetadata(payload, expectedIds, expectedChannel = TWITCH_CHANNEL) {
  const expected = new Set(expectedIds);
  const entries = Array.isArray(payload) ? payload : [payload];
  const metadataById = new Map();

  for (const entry of entries) {
    const video = entry?.data?.video;
    if (!video || typeof video !== "object") continue;
    if (typeof video.id !== "string" || !expected.has(video.id)) continue;
    if (video.owner?.login?.toLowerCase() !== expectedChannel.toLowerCase()) continue;

    const thumbnailUrl = normaliseTwitchThumbnailUrl(video.previewThumbnailURL);
    const title = normaliseString(video.title);
    const description = normaliseString(video.description);
    const category = normaliseString(video.game?.name);
    const publishedAt = normaliseString(video.publishedAt ?? video.createdAt);
    const durationSeconds = normaliseNonNegativeInteger(video.lengthSeconds);
    const viewCount = normaliseNonNegativeInteger(video.viewCount);

    metadataById.set(video.id, {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(category ? { category } : {}),
      ...(publishedAt && !Number.isNaN(Date.parse(publishedAt)) ? { publishedAt } : {}),
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      ...(viewCount !== undefined ? { viewCount } : {}),
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    });
  }

  return metadataById;
}

export async function fetchTwitchVideoMetadata(vods, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const ids = [...new Set(vods.map((vod) => vod.id).filter((id) => typeof id === "string" && /^\d+$/.test(id)))];
  if (!ids.length) return new Map();

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException("Twitch metadata timed out", "TimeoutError")), timeoutMs);

  try {
    const response = await fetchImpl(TWITCH_GQL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Client-ID": TWITCH_WEB_CLIENT_ID,
      },
      body: JSON.stringify(ids.map((videoID) => ({
        operationName: "VideoMetadata",
        variables: { videoID },
        query: VIDEO_METADATA_QUERY,
      }))),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Twitch metadata request failed with ${response.status}`);
    return parseTwitchVideoMetadata(await response.json(), ids);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export function formatTwitchDuration(totalSeconds) {
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
