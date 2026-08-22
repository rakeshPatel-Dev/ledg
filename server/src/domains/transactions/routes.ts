import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as transactionController from "./controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post("/", transactionController.createTransaction);
router.get("/", transactionController.listTransactions);
router.get("/:id", transactionController.getTransaction);
router.put("/:id", transactionController.updateTransaction);
router.delete("/:id", transactionController.deleteTransaction);

// Top-level /transactions/all — not scoped to a single space
export const allTransactionsRouter = Router();
allTransactionsRouter.use(authenticate);
allTransactionsRouter.get("/all", transactionController.listAllTransactions);

export default router;