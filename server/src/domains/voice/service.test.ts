import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VoiceDraft } from "../../shared/index.js";
import { handleVoiceTurn } from "./service.js";

const TODAY = new Date().toISOString().slice(0, 10);

const READY_DRAFT: VoiceDraft = {
  type: "expense",
  amount: 50,
  category: "Food",
  note: "samosa",
  date: TODAY,
  paymentMethod: "cash",
  spaceId: null,
};

describe("voice turn routing", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("answers a fully specified utterance without calling Gemini", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleVoiceTurn({
      transcript: "samosa for 20 cash",
      draft: null,
      history: [],
      spaces: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.provider).toBe("rules");
    expect(result.draft).toMatchObject({
      amount: 20,
      category: "Food",
      paymentMethod: "cash",
    });
  });

  it("uses Gemini for an unclear correction and keeps the rules fallback", async () => {
    const fetchMock = vi.fn(async () => new Response("quota", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleVoiceTurn({
      transcript: "make it 60",
      draft: READY_DRAFT,
      history: [],
      spaces: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("rules");
    expect(result.draft.amount).toBe(60);
  });
});
