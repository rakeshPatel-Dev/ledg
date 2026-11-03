import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { domainUserIdFromSession } from "./session.js";

describe("domainUserIdFromSession", () => {
  it("returns the ObjectId for a valid app user id", () => {
    const id = new Types.ObjectId();

    const result = domainUserIdFromSession({ userId: id.toHexString() });

    expect(result).toBeInstanceOf(Types.ObjectId);
    expect(result?.toHexString()).toBe(id.toHexString());
  });

  it("returns null for missing or invalid ids", () => {
    expect(domainUserIdFromSession({})).toBeNull();
    expect(domainUserIdFromSession({ userId: null })).toBeNull();
    expect(domainUserIdFromSession({ userId: "not-an-object-id" })).toBeNull();
  });
});
