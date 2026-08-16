import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as analyticsService from "./service.js";

const VALID_PERIODS = ["today", "month", "3months", "year", "all", "custom"] as const;
type Period = (typeof VALID_PERIODS)[number];

function parsePeriod(raw: unknown): Period {
  if (typeof raw === "string" && VALID_PERIODS.includes(raw as Period)) {
    return raw as Period;
  }
  return "month";
}

export const getSummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const period = parsePeriod(req.query.period);
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

    const data = await analyticsService.getAnalyticsSummary(
      req.userId!,
      String(req.params.spaceId),
      period,
      { dateFrom, dateTo }
    );
    res.json({ success: true, data });
  }
);

export const getTrends = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const period = parsePeriod(req.query.period);
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

    const data = await analyticsService.getAnalyticsTrends(
      req.userId!,
      String(req.params.spaceId),
      period,
      { dateFrom, dateTo }
    );
    res.json({ success: true, data });
  }
);

export const getRecurring = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const minCount = Number(req.query.minCount) || 2;
    const data = await analyticsService.getAnalyticsRecurring(
      req.userId!,
      String(req.params.spaceId),
      minCount
    );
    res.json({ success: true, data });
  }
);

