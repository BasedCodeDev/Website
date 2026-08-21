import assert from "node:assert/strict";
import test from "node:test";
import {
  SOCIAL_STATS_CACHE_KEY,
  SOCIAL_STATS_CACHE_TTL_MS,
  fetchSocialStat,
  formatExactSocialCount,
  formatSocialCount,
  formatSocialMetricLabel,
  parseDigitalByteProfile,
  parsePulseProfile,
  parseSocialCount,
  parseSocialStatPayload,
  readFreshSocialStatsCache,
  writeSocialStatsCache,
} from "../app/socialStats.mjs";

test("parses supported social count response shapes", () => {
  assert.equal(parseSocialStatPayload("twitch", "3,834"), 3834);
  assert.equal(parseSocialStatPayload("discord", { approximate_member_count: 128 }), 128);
  assert.equal(parseSocialStatPayload("github", { followers: 42 }), 42);
  assert.equal(parseSocialStatPayload("youtube", {
    platform: "youtube",
    handle: "@BasedCode",
    followers: 271,
  }), 271);
});

test("rejects malformed, negative, fractional, and mismatched statistics", () => {
  assert.equal(parseSocialCount(-1), null);
  assert.equal(parseSocialCount(1.5), null);
  assert.equal(parseSocialCount("3.8K"), null);
  assert.equal(parseSocialStatPayload("discord", {}), null);
  assert.equal(parsePulseProfile({ platform: "instagram", handle: "someone-else", followers: 10 }, ["instagram"], "basedcodedev"), null);
  assert.equal(parsePulseProfile({ platform: "tiktok", handle: "basedcodedev", followers: 10 }, ["instagram"], "basedcodedev"), null);
});

test("validates DigitalByte Instagram profiles and preserves a valid zero", () => {
  assert.equal(parseDigitalByteProfile({
    status: true,
    username: "basedcodedev",
    user_followers: 0,
  }, "basedcodedev"), 0);
  assert.equal(parseDigitalByteProfile({
    status: true,
    username: "someone-else",
    user_followers: 12,
  }, "basedcodedev"), null);
  assert.equal(parseDigitalByteProfile({
    status: false,
    username: "basedcodedev",
    user_followers: 12,
  }, "basedcodedev"), null);
  assert.equal(parseDigitalByteProfile({
    status: true,
    username: "basedcodedev",
    user_followers: -1,
  }, "basedcodedev"), null);
});

test("formats compact, exact, zero, and singular statistics", () => {
  assert.equal(formatSocialCount(3834), "3.8K");
  assert.equal(formatExactSocialCount(3834), "3,834");
  assert.equal(formatSocialCount(0), "0");
  assert.equal(formatSocialMetricLabel("followers", 1), "follower");
  assert.equal(formatSocialMetricLabel("followers", 2), "followers");
});

test("reads only fresh, validated cache entries", () => {
  const now = 1_800_000_000_000;
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  const stats = {
    twitch: { platform: "twitch", value: 3834, label: "followers", fetchedAt: now - 1000 },
    github: { platform: "github", value: 12, label: "followers", fetchedAt: now - SOCIAL_STATS_CACHE_TTL_MS },
  };

  writeSocialStatsCache(storage, stats);
  assert.equal(JSON.parse(entries.get(SOCIAL_STATS_CACHE_KEY)).version, 1);
  assert.deepEqual(readFreshSocialStatsCache(storage, now), { twitch: stats.twitch });
});

test("returns null when a social request times out", async () => {
  const fetchImpl = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
  });

  assert.equal(await fetchSocialStat("twitch", { fetchImpl, timeoutMs: 5 }), null);
});

test("normalises a successful request and rejects an API failure", async () => {
  const success = await fetchSocialStat("github", {
    fetchImpl: async () => ({ ok: true, json: async () => ({ followers: 18 }) }),
  });
  const failure = await fetchSocialStat("github", {
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });

  assert.equal(success.platform, "github");
  assert.equal(success.value, 18);
  assert.equal(success.label, "followers");
  assert.ok(Number.isFinite(success.fetchedAt));
  assert.equal(failure, null);
});

test("uses Pulse for Instagram without requesting the fallback when it succeeds", async () => {
  const urls = [];
  const result = await fetchSocialStat("instagram", {
    fetchImpl: async (url) => {
      urls.push(url);
      return {
        ok: true,
        json: async () => ({
          platform: "instagram",
          handle: "basedcodedev",
          followers: 14,
        }),
      };
    },
  });

  assert.equal(result.value, 14);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /^https:\/\/pulse\.walls\.sh\//);
});

test("falls back to DigitalByte for Instagram and displays zero followers", async () => {
  const urls = [];
  const result = await fetchSocialStat("instagram", {
    fetchImpl: async (url) => {
      urls.push(url);
      if (url.startsWith("https://pulse.walls.sh/")) {
        return { ok: false, status: 422 };
      }

      return {
        ok: true,
        json: async () => ({
          status: true,
          username: "basedcodedev",
          user_followers: 0,
        }),
      };
    },
  });

  assert.equal(result.platform, "instagram");
  assert.equal(result.value, 0);
  assert.equal(result.label, "followers");
  assert.equal(urls.length, 2);
  assert.match(urls[1], /^https:\/\/api\.digitalbyte\.cc\/instagram\/newtucktools\//);
});

test("omits Instagram statistics when both providers fail or mismatch", async () => {
  const providerFailure = await fetchSocialStat("instagram", {
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  const mismatchedFallback = await fetchSocialStat("instagram", {
    fetchImpl: async (url) => url.startsWith("https://pulse.walls.sh/")
      ? { ok: false, status: 422 }
      : {
          ok: true,
          json: async () => ({
            status: true,
            username: "someone-else",
            user_followers: 200,
          }),
        },
  });

  assert.equal(providerFailure, null);
  assert.equal(mismatchedFallback, null);
});
