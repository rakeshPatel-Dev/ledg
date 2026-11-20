import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as string[],
  voice: "",
  metadataCalls: 0,
  fail: false,
  chunks: [] as Buffer[],
}));

vi.mock("msedge-tts", async () => {
  const { Readable } = await import("node:stream");

  class FakeMsEdgeTTS {
    async setMetadata(voice: string) {
      state.metadataCalls += 1;
      state.voice = voice;
    }

    async toStream(text: string) {
      state.calls.push(text);
      if (state.fail) throw new Error("speech service offline");
      return { audioStream: Readable.from(state.chunks) };
    }

    close() {
      // No-op in the fake.
    }
  }

  return {
    MsEdgeTTS: FakeMsEdgeTTS,
    OUTPUT_FORMAT: {
      AUDIO_24KHZ_96KBITRATE_MONO_MP3: "audio-24khz-96kbitrate-mono-mp3",
    },
  };
});

import {
  escapeSsml,
  getSpeechClip,
  isValidSpeechText,
  normalizeSpeechText,
  resetSpeechCacheForTests,
} from "./tts.js";

describe("voice synthesis", () => {
  beforeEach(() => {
    state.calls = [];
    state.voice = "";
    state.metadataCalls = 0;
    state.fail = false;
    state.chunks = [Buffer.from("fake-mp3-audio")];
    vi.stubEnv("VOICE_TTS", "");
    vi.stubEnv("VOICE_TTS_VOICE", "");
    resetSpeechCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetSpeechCacheForTests();
  });

  it("uses the female Indian English voice by default", async () => {
    await getSpeechClip("Added.");

    expect(state.voice).toBe("en-IN-NeerjaNeural");
  });

  it("honours the voice override", async () => {
    vi.stubEnv("VOICE_TTS_VOICE", "en-GB-SoniaNeural");

    await getSpeechClip("Added.");

    expect(state.voice).toBe("en-GB-SoniaNeural");
  });

  it("returns MP3 audio and serves the second call from cache", async () => {
    const first = await getSpeechClip("Added.");
    const second = await getSpeechClip("Added.");

    expect(first).toMatchObject({ cached: false, mimeType: "audio/mpeg" });
    expect(second).toMatchObject({ cached: true, mimeType: "audio/mpeg" });
    expect(first?.audio.toString()).toBe("fake-mp3-audio");
    expect(second?.audio.equals(first!.audio)).toBe(true);
    expect(state.calls).toHaveLength(1);
    expect(state.metadataCalls).toBe(1);
  });

  it("shares a cache entry across whitespace and line breaks", async () => {
    await getSpeechClip("  Was that cash,   card,\n or wallet?  ");
    const second = await getSpeechClip("Was that cash, card, or wallet?");

    expect(state.calls).toHaveLength(1);
    expect(second?.cached).toBe(true);
    expect(state.calls[0]).toBe("Was that cash, card, or wallet?");
  });

  it("escapes XML before sending text to the SSML template", async () => {
    await getSpeechClip("Save & continue <now>");

    expect(state.calls[0]).toBe("Save &amp; continue &lt;now&gt;");
  });

  it("returns null when the speech service fails", async () => {
    state.fail = true;

    await expect(getSpeechClip("Added.")).resolves.toBeNull();
  });

  it("reconnects after a failed request", async () => {
    state.fail = true;
    await expect(getSpeechClip("Added.")).resolves.toBeNull();

    state.fail = false;
    const clip = await getSpeechClip("Added.");

    expect(clip).not.toBeNull();
    expect(state.metadataCalls).toBe(2);
  });

  it("returns null without calling the service when disabled", async () => {
    vi.stubEnv("VOICE_TTS", "off");

    await expect(getSpeechClip("Added.")).resolves.toBeNull();
    expect(state.calls).toHaveLength(0);
  });

  it("rejects empty and overlong text without calling the service", async () => {
    await expect(getSpeechClip("   ")).resolves.toBeNull();
    await expect(getSpeechClip("a".repeat(321))).resolves.toBeNull();
    expect(state.calls).toHaveLength(0);
  });
});

describe("speech text helpers", () => {
  it("collapses whitespace and strips control characters", () => {
    expect(normalizeSpeechText("  Saved.\n Next\u0007  ")).toBe("Saved. Next");
  });

  it("caps text at 320 characters", () => {
    expect(isValidSpeechText("Saved.")).toBe(true);
    expect(isValidSpeechText("   ")).toBe(false);
    expect(isValidSpeechText("a".repeat(320))).toBe(true);
    expect(isValidSpeechText("a".repeat(321))).toBe(false);
  });

  it("escapes SSML-sensitive characters", () => {
    expect(escapeSsml(`"A" & 'B' <c>`)).toBe(
      "&quot;A&quot; &amp; &apos;B&apos; &lt;c&gt;"
    );
  });
});
