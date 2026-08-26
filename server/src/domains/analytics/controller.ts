import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import { BadRequestError } from "../../common/errors/index.js";
import * as analyticsService from "./service.js";

const VALID_PERIODS = ["today", "month", "3months", "year", "all", "custom"] as const;
type Period = (typeof VALID_PERIODS)[number];

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function parsePeriod(raw: unknown): Period {
  if (typeof raw === "string" && VALID_PERIODS.includes(raw as Period)) {
    return raw as Period;
  }
  return "month";
}

function parseSpaceId(raw: unknown): string {
  const value = String(raw ?? "");
  // "all" aggregates across every space the user owns
  if (value === "all" || OBJECT_ID_RE.test(value)) {
    return value;
  }
  throw new BadRequestError("Invalid space id");
}

export const getSummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const period = parsePeriod(req.query.period);
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

    const data = await analyticsService.getAnalyticsSummary(
      req.userId!,
      parseSpaceId(req.params.spaceId),
      period,
      { dateFrom, dateTo }
    );
    res.json({ success: true, data });
  }
);

export const getRecurring = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const minCount = Number(req.query.minCount) || 2;
    const rawLimit = Number(req.query.limit);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 50);
    const data = await analyticsService.getAnalyticsRecurring(
      req.userId!,
      parseSpaceId(req.params.spaceId),
      minCount,
      limit
    );
    res.json({ success: true, data });
  }
);

export const getDashboardSummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = await analyticsService.getDashboardSummary(req.userId!);
    res.json({ success: true, data });
  }
);

