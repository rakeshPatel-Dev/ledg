import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as importController from "./controller.js";

const router = Router();

router.use(authenticate);

router.post("/", importController.importTransactions);

export default router;
