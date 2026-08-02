import { describe, expect, test } from "bun:test";

import { containerOf } from "./drill";

describe("containerOf", () => {
  test("accepts the audio types browsers usually report", () => {
    expect(containerOf("audio/webm")).toBe("webm");
    expect(containerOf("audio/mp4")).toBe("mp4");
    expect(containerOf("audio/ogg")).toBe("ogg");
    expect(containerOf("audio/wav")).toBe("wav");
  });

  test("accepts video-labelled containers", () => {
    // Chrome stamps video/webm on an audio-only recording whenever it picks
    // the container itself. Rejecting that was the original bug.
    expect(containerOf("video/webm")).toBe("webm");
    expect(containerOf("video/mp4")).toBe("mp4");
  });

  test("rejects anything that isn't a media container", () => {
    expect(containerOf("application/octet-stream")).toBeNull();
    expect(containerOf("text/html")).toBeNull();
    expect(containerOf("image/png")).toBeNull();
    expect(containerOf("audio/x-pn-realaudio")).toBeNull();
    expect(containerOf("")).toBeNull();
    expect(containerOf("audio")).toBeNull();
  });
});
