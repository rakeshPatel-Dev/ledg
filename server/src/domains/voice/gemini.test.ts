import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseWithGemini, parseWithGeminiAudio } from "./gemini.js";

const TODAY = "2026-11-19";

function modelResponse(overrides: Record<string, unknown> = {}) {
  return {
    transcript: "samosa for 20 cash",
    reply: "Samosa for Rs 20, cash. Add it?",
    intent: "draft",
    draft: {
      type: "expense",
      amount: 20,
      category: "Food",
      note: "samosa",
      date: TODAY,
      paymentMethod: "cash",
      spaceId: null,
    },
    confidence: 0.95,
    ...overrides,
  };
}

function geminiBody(payload: unknown) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

describe("Gemini voice turns", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T06:00:00Z`));
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("transcribes and parses a clip in a single request", async () => {
    const bodies: {
      contents: { parts: { text?: string; inlineData?: { data: string } }[] }[];
    }[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return geminiBody(modelResponse());
      })
    );

    const result = await parseWithGeminiAudio({
      audio: "AAAA",
      mimeType: "audio/wav",
      draft: null,
      history: [],
      spaces: [],
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(bodies[0]?.contents[0]?.parts[0]?.text).toContain("transcribe");
    expect(bodies[0]?.contents[0]?.parts[1]?.inlineData?.data).toBe("AAAA");

    expect(result?.transcript).toBe("samosa for 20 cash");
    expect(result?.result).toMatchObject({
      intent: "draft",
      ready: true,
      provider: "gemini",
      draft: {
        type: "expense",
        amount: 20,
        category: "Food",
        note: "samosa",
        paymentMethod: "cash",
      },
    });
  });

  it("keeps a pure agreement on the existing draft", async () => {
    const draft = {
      type: "expense" as const,
      amount: 20,
      category: "Food",
      note: "samosa",
      date: TODAY,
      paymentMethod: "cash" as const,
      spaceId: null,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        geminiBody(
          modelResponse({
            transcript: "of course",
            intent: "draft",
            reply: "Education for 20 rupees. Add it?",
            draft: { ...draft, category: "Education" },
          })
        )
      )
    );

    const result = await parseWithGemini({
      transcript: "of course",
      draft,
      history: [],
      spaces: [],
    });

    expect(result?.intent).toBe("confirm");
    expect(result?.draft).toEqual(draft);
  });

  it("keeps the draft and asks again when the clip has no words", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        geminiBody(
          modelResponse({
            transcript: "",
            intent: "chat",
            reply: "I didn't catch that.",
          })
        )
      )
    );

    const draft = {
      type: "expense" as const,
      amount: 20,
      category: "Food",
      note: "samosa",
      date: TODAY,
      paymentMethod: "cash" as const,
      spaceId: null,
    };

    const result = await parseWithGeminiAudio({
      audio: "AAAA",
      mimeType: "audio/wav",
      draft,
      history: [],
      spaces: [],
    });

    expect(result?.transcript).toBe("");
    expect(result?.result.intent).toBe("chat");
    expect(result?.result.draft).toEqual(draft);
  });

  it("falls back when Gemini is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const audio = await parseWithGeminiAudio({
      audio: "AAAA",
      mimeType: "audio/wav",
      draft: null,
      history: [],
      spaces: [],
    });
    const text = await parseWithGemini({
      transcript: "samosa for 20 cash",
      draft: null,
      history: [],
      spaces: [],
    });

    expect(audio).toBeNull();
    expect(text).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota", { status: 429 }))
    );

    const result = await parseWithGeminiAudio({
      audio: "AAAA",
      mimeType: "audio/wav",
      draft: null,
      history: [],
      spaces: [],
    });

    expect(result).toBeNull();
  });

  it("still parses typed turns without an audio part", async () => {
    const bodies: {
      contents: { parts: { text?: string; inlineData?: unknown }[] }[];
    }[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return geminiBody(modelResponse({ transcript: undefined }));
      })
    );

    const result = await parseWithGemini({
      transcript: "samosa for 20 cash",
      draft: null,
      history: [],
      spaces: [],
    });

    expect(bodies[0]?.contents[0]?.parts).toHaveLength(1);
    expect(bodies[0]?.contents[0]?.parts[0]?.text).toContain("<utterance>");
    expect(result?.provider).toBe("gemini");
    expect(result?.draft.amount).toBe(20);
  });
});
