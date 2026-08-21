export const SOCIAL_STATS_CACHE_KEY = "basedcode-social-stats-v1";
export const SOCIAL_STATS_CACHE_TTL_MS = 15 * 60 * 1000;

const pulseProfileUrl = (profileUrl) =>
  `https://pulse.walls.sh/profile?url=${encodeURIComponent(profileUrl)}`;

export const SOCIAL_STAT_DEFINITIONS = Object.freeze({
  twitch: Object.freeze({
    platform: "twitch",
    label: "followers",
    responseType: "text",
    url: "https://decapi.me/twitch/followcount/basedcode",
  }),
  youtube: Object.freeze({
    platform: "youtube",
    acceptedPlatforms: Object.freeze(["youtube"]),
    expectedHandle: "BasedCode",
    label: "subscribers",
    responseType: "pulse",
    url: pulseProfileUrl("https://www.youtube.com/@BasedCode"),
  }),
  discord: Object.freeze({
    platform: "discord",
    label: "members",
    responseType: "discord",
    url: "https://discord.com/api/v10/invites/rxJufPTM2?with_counts=true",
  }),
  tiktok: Object.freeze({
    platform: "tiktok",
    acceptedPlatforms: Object.freeze(["tiktok"]),
    expectedHandle: "basedcodedev",
    label: "followers",
    responseType: "pulse",
    url: pulseProfileUrl("https://www.tiktok.com/@basedcodedev"),
  }),
  instagram: Object.freeze({
    platform: "instagram",
    acceptedPlatforms: Object.freeze(["instagram"]),
    expectedHandle: "basedcodedev",
    label: "followers",
    responseType: "pulse",
    url: pulseProfileUrl("https://www.instagram.com/basedcodedev/"),
    fallbacks: Object.freeze([
      Object.freeze({
        expectedHandle: "basedcodedev",
        responseType: "digitalbyte",
        url: "https://api.digitalbyte.cc/instagram/newtucktools/basedcodedev",
      }),
    ]),
  }),
  x: Object.freeze({
    platform: "x",
    acceptedPlatforms: Object.freeze(["x", "twitter"]),
    expectedHandle: "BasedCodeDev",
    label: "followers",
    responseType: "pulse",
    url: pulseProfileUrl("https://x.com/BasedCodeDev"),
  }),
  github: Object.freeze({
    platform: "github",
    label: "followers",
    responseType: "github",
    url: "https://api.github.com/users/BasedCodeDev",
  }),
});

export const SOCIAL_STAT_KEYS = Object.freeze(Object.keys(SOCIAL_STAT_DEFINITIONS));

export function parseSocialCount(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d[\d,]*$/.test(trimmed)) return null;
    value = Number(trimmed.replaceAll(",", ""));
  }

  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normaliseHandle(value) {
  return typeof value === "string"
    ? value.trim().replace(/^@/, "").toLocaleLowerCase("en-AU")
    : "";
}

export function parsePulseProfile(payload, acceptedPlatforms, expectedHandle) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const platform = typeof payload.platform === "string"
    ? payload.platform.trim().toLocaleLowerCase("en-AU")
    : "";
  const validPlatforms = acceptedPlatforms.map((value) => value.toLocaleLowerCase("en-AU"));
  if (!validPlatforms.includes(platform)) return null;
  if (normaliseHandle(payload.handle) !== normaliseHandle(expectedHandle)) return null;

  return parseSocialCount(payload.followers);
}

export function parseDigitalByteProfile(payload, expectedHandle) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.status !== true) return null;
  if (normaliseHandle(payload.username) !== normaliseHandle(expectedHandle)) return null;

  return parseSocialCount(payload.user_followers);
}

function parseSocialStatSource(source, payload) {
  switch (source.responseType) {
    case "text":
      return parseSocialCount(payload);
    case "discord":
      return payload && typeof payload === "object"
        ? parseSocialCount(payload.approximate_member_count)
        : null;
    case "github":
      return payload && typeof payload === "object"
        ? parseSocialCount(payload.followers)
        : null;
    case "pulse":
      return parsePulseProfile(
        payload,
        source.acceptedPlatforms,
        source.expectedHandle,
      );
    case "digitalbyte":
      return parseDigitalByteProfile(payload, source.expectedHandle);
    default:
      return null;
  }
}

export function parseSocialStatPayload(platform, payload) {
  const definition = SOCIAL_STAT_DEFINITIONS[platform];
  return definition ? parseSocialStatSource(definition, payload) : null;
}

export function formatSocialCount(value, locale = "en-AU") {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatExactSocialCount(value, locale = "en-AU") {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatSocialMetricLabel(label, value) {
  return value === 1 && label.endsWith("s") ? label.slice(0, -1) : label;
}

function normaliseCachedStat(platform, value, now) {
  const definition = SOCIAL_STAT_DEFINITIONS[platform];
  if (!definition || !value || typeof value !== "object" || Array.isArray(value)) return null;

  const count = parseSocialCount(value.value);
  const fetchedAt = Number(value.fetchedAt);
  if (count === null || value.platform !== platform || value.label !== definition.label) return null;
  if (!Number.isFinite(fetchedAt) || fetchedAt > now || now - fetchedAt >= SOCIAL_STATS_CACHE_TTL_MS) return null;

  return { platform, value: count, label: definition.label, fetchedAt };
}

export function readFreshSocialStatsCache(storage, now = Date.now()) {
  try {
    const cached = JSON.parse(storage.getItem(SOCIAL_STATS_CACHE_KEY) ?? "null");
    if (!cached || cached.version !== 1 || !cached.stats || typeof cached.stats !== "object") return {};

    return Object.fromEntries(SOCIAL_STAT_KEYS.flatMap((platform) => {
      const stat = normaliseCachedStat(platform, cached.stats[platform], now);
      return stat ? [[platform, stat]] : [];
    }));
  } catch {
    return {};
  }
}

export function writeSocialStatsCache(storage, stats) {
  try {
    storage.setItem(SOCIAL_STATS_CACHE_KEY, JSON.stringify({ version: 1, stats }));
  } catch {
    // Browser storage can be unavailable in private or restricted contexts.
  }
}

export async function fetchSocialStat(platform, options = {}) {
  const definition = SOCIAL_STAT_DEFINITIONS[platform];
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!definition || typeof fetchImpl !== "function") return null;

  const parentSignal = options.signal;
  const sources = [definition, ...(definition.fallbacks ?? [])];

  for (const source of sources) {
    if (parentSignal?.aborted) return null;

    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    parentSignal?.addEventListener("abort", forwardAbort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? source.timeoutMs ?? 6000,
    );

    try {
      const response = await fetchImpl(source.url, {
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: source.responseType === "text" ? "text/plain" : "application/json" },
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (!response.ok) continue;

      const payload = source.responseType === "text"
        ? await response.text()
        : await response.json();
      const value = parseSocialStatSource(source, payload);
      if (value === null) continue;

      return {
        platform,
        value,
        label: definition.label,
        fetchedAt: Date.now(),
      };
    } catch {
      // Try the next provider when the current source is unavailable or invalid.
    } finally {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", forwardAbort);
    }
  }

  return null;
}
