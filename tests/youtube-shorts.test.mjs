import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAYED_SHORTS_LIMIT,
  RECENT_SHORTS_POOL_SIZE,
  YOUTUBE_CHANNEL_ID,
  fetchLiveYouTubeShorts,
  formatExactYouTubeViewCount,
  formatYouTubeViewCount,
  getYouTubeShortThumbnailUrl,
  getPipedShortsTabData,
  normaliseYouTubeShortThumbnail,
  normalisePipedShorts,
} from "../app/youtubeShorts.mjs";

const shortsTabData = "encoded-shorts-tab";

function channelPayload(overrides = {}) {
  return {
    id: YOUTUBE_CHANNEL_ID,
    tabs: [{ name: "shorts", data: shortsTabData }],
    ...overrides,
  };
}

function videoId(index) {
  return `short${String(index).padStart(6, "0")}`;
}

function shortEntry(index, overrides = {}) {
  const id = videoId(index);
  return {
    type: "stream",
    isShort: true,
    url: `/watch?v=${id}`,
    title: `Short ${index}`,
    thumbnail: `https://proxy.piped.example/vi/${id}/sardefault.jpg?host=i.ytimg.com&sqp=vertical-${index}&rs=signed-${index}`,
    uploaderName: "Based Code",
    uploaderUrl: `/channel/${YOUTUBE_CHANNEL_ID}/shorts`,
    views: index,
    ...overrides,
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("finds the BasedCode Shorts tab only on the expected channel", () => {
  assert.equal(getPipedShortsTabData(channelPayload()), shortsTabData);
  assert.equal(getPipedShortsTabData(channelPayload({ id: "wrong-channel" })), null);
  assert.equal(getPipedShortsTabData(channelPayload({ tabs: [] })), null);
  assert.equal(getPipedShortsTabData({}), null);
});

test("normalises valid Piped Shorts into canonical BasedCode records", () => {
  const [short] = normalisePipedShorts({ content: [shortEntry(1, { views: 1234 })] }, 456);

  assert.deepEqual(short, {
    id: videoId(1),
    title: "Short 1",
    url: `https://www.youtube.com/shorts/${videoId(1)}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId(1)}/sardefault.jpg?sqp=vertical-1&rs=signed-1`,
    viewCount: 1234,
    retrievedAt: 456,
  });
  assert.equal(formatYouTubeViewCount(1234), "1.2K");
  assert.equal(formatExactYouTubeViewCount(1234), "1,234");
});

test("uses YouTube's selected vertical artwork and rejects unrelated images", () => {
  const id = videoId(1);
  assert.equal(
    normaliseYouTubeShortThumbnail(
      `https://proxy.example/vi/${id}/sardefault.jpg?host=i.ytimg.com&rs=signature&sqp=portrait`,
      id,
    ),
    `https://i.ytimg.com/vi/${id}/sardefault.jpg?sqp=portrait&rs=signature`,
  );
  assert.equal(normaliseYouTubeShortThumbnail(`https://i.ytimg.com/vi/${id}/frame0.jpg`, id), null);
  assert.equal(normaliseYouTubeShortThumbnail("https://example.com/image.jpg", id), null);
  assert.equal(getYouTubeShortThumbnailUrl(id), `https://i.ytimg.com/vi/${id}/sardefault.jpg`);
});

test("rejects malformed, duplicate, non-Short, wrong-channel, and invalid-count entries", () => {
  const valid = shortEntry(1, { views: 8 });
  const shorts = normalisePipedShorts({ content: [
    null,
    shortEntry(2, { type: "playlist" }),
    shortEntry(3, { isShort: false }),
    shortEntry(4, { uploaderUrl: "/channel/not-based-code/shorts" }),
    shortEntry(5, { url: "/watch?v=bad" }),
    shortEntry(6, { title: "   " }),
    shortEntry(7, { views: -1 }),
    shortEntry(8, { views: 1.5 }),
    valid,
    { ...valid, title: "Duplicate" },
  ] });

  assert.equal(shorts.length, 1);
  assert.equal(shorts[0].id, videoId(1));
});

test("ranks the strongest 15 only from the first 24 valid recent Shorts", () => {
  const entries = Array.from({ length: RECENT_SHORTS_POOL_SIZE + 2 }, (_, index) => shortEntry(index));
  entries[RECENT_SHORTS_POOL_SIZE].views = 1_000_000;

  const shorts = normalisePipedShorts({ content: entries });

  assert.equal(shorts.length, DISPLAYED_SHORTS_LIMIT);
  assert.equal(shorts[0].id, videoId(RECENT_SHORTS_POOL_SIZE - 1));
  assert.ok(!shorts.some((short) => short.id === videoId(RECENT_SHORTS_POOL_SIZE)));
  for (let index = 1; index < shorts.length; index += 1) {
    assert.ok(shorts[index - 1].viewCount >= shorts[index].viewCount);
  }
});

test("returns validated live Shorts from the primary provider", async () => {
  const fetchImpl = async (url) => (
    url.includes("/channel/")
      ? jsonResponse(channelPayload())
      : jsonResponse({ content: [shortEntry(1, { views: 42 })] })
  );

  const result = await fetchLiveYouTubeShorts({
    providers: ["https://primary.example"],
    fetchImpl,
    now: 123,
  });

  assert.equal(result?.length, 1);
  assert.equal(result?.[0].viewCount, 42);
  assert.equal(result?.[0].retrievedAt, 123);
});

test("uses the secondary provider after the primary provider fails", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.startsWith("https://primary.example")) return jsonResponse({}, 503);
    if (url.includes("/channel/")) return jsonResponse(channelPayload());
    return jsonResponse({ content: [shortEntry(1, { views: 99 })] });
  };

  const result = await fetchLiveYouTubeShorts({
    providers: ["https://primary.example", "https://secondary.example/"],
    fetchImpl,
  });

  assert.equal(result?.[0].viewCount, 99);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].url, `https://secondary.example/channel/${YOUTUBE_CHANNEL_ID}`);
  assert.equal(calls[2].url, `https://secondary.example/channels/tabs?data=${encodeURIComponent(shortsTabData)}`);
  for (const { init } of calls) {
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");
    assert.equal(init.referrerPolicy, "no-referrer");
  }
});

test("returns null after provider timeouts and total provider failure", async () => {
  const hangingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });

  const timedOut = await fetchLiveYouTubeShorts({
    providers: ["https://slow.example"],
    fetchImpl: hangingFetch,
    timeoutMs: 5,
  });
  const failed = await fetchLiveYouTubeShorts({
    providers: ["https://one.example", "https://two.example"],
    fetchImpl: async () => jsonResponse({}, 500),
  });

  assert.equal(timedOut, null);
  assert.equal(failed, null);
});

test("does not start or continue provider requests after the component signal aborts", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;

  const result = await fetchLiveYouTubeShorts({
    providers: ["https://unused.example"],
    signal: controller.signal,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(channelPayload());
    },
  });

  assert.equal(result, null);
  assert.equal(calls, 0);
});
