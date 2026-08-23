import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchTwitchVideoMetadata,
  formatTwitchDuration,
  normaliseTwitchThumbnailUrl,
  parseTwitchVideoMetadata,
} from "../app/twitchMetadata.mjs";

const vodId = "2854197474";
const thumbnail = "https://static-cdn.jtvnw.net/cf_vods/example//thumb/thumb0-640x360.jpg";

function responsePayload(overrides = {}) {
  return {
    data: {
      video: {
        id: vodId,
        title: "A current Twitch title",
        description: "A useful description.",
        publishedAt: "2026-08-23T12:08:18Z",
        lengthSeconds: 19160,
        viewCount: 42,
        previewThumbnailURL: thumbnail,
        owner: { login: "basedcode" },
        game: { name: "Software and Game Development" },
        ...overrides,
      },
    },
  };
}

test("normalises Twitch VOD and processing thumbnails", () => {
  assert.equal(
    normaliseTwitchThumbnailUrl(thumbnail),
    "https://static-cdn.jtvnw.net/cf_vods/example//thumb/thumb0-320x180.jpg",
  );
  assert.equal(
    normaliseTwitchThumbnailUrl("https://vod-secure.twitch.tv/_404/404_processing_640x360.png"),
    "https://vod-secure.twitch.tv/_404/404_processing_640x360.png",
  );
  assert.equal(normaliseTwitchThumbnailUrl("https://example.com/thumb.jpg"), undefined);
});

test("parses current metadata only for the expected BasedCode VOD", () => {
  const metadata = parseTwitchVideoMetadata([
    responsePayload(),
    responsePayload({ id: "999" }),
    responsePayload({ owner: { login: "someone-else" } }),
  ], [vodId]);

  assert.deepEqual(metadata.get(vodId), {
    title: "A current Twitch title",
    description: "A useful description.",
    category: "Software and Game Development",
    publishedAt: "2026-08-23T12:08:18Z",
    durationSeconds: 19160,
    viewCount: 42,
    thumbnailUrl: "https://static-cdn.jtvnw.net/cf_vods/example//thumb/thumb0-320x180.jpg",
  });
  assert.equal(metadata.size, 1);
});

test("requests metadata directly in the browser without credentials or caching", async () => {
  let request;
  const metadata = await fetchTwitchVideoMetadata([{ id: vodId }], {
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => [responsePayload()] };
    },
  });

  assert.equal(request.url, "https://gql.twitch.tv/gql");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.cache, "no-store");
  assert.equal(request.options.credentials, "omit");
  assert.equal(request.options.referrerPolicy, "no-referrer");
  assert.match(request.options.headers["Client-ID"], /^[a-z0-9]+$/);
  assert.equal(JSON.parse(request.options.body)[0].variables.videoID, vodId);
  assert.equal(metadata.get(vodId).viewCount, 42);
});

test("formats compact broadcast durations", () => {
  assert.equal(formatTwitchDuration(19160), "5h 19m");
  assert.equal(formatTwitchDuration(3599), "59m");
  assert.equal(formatTwitchDuration(-1), "");
});
