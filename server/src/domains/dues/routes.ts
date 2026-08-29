import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as duesController from "./controller.js";

const router = Router();

router.use(authenticate);

router.get("/summary", duesController.getDuesSummary);
router.post("/", duesController.createDue);
router.get("/", duesController.listDues);
router.get("/:id", duesController.getDue);
router.post("/:id/settle", duesController.settleDue);
router.delete("/:id/settlements/:sid", duesController.undoSettlement);
router.delete("/:id", duesController.deleteDue);

export default router;
