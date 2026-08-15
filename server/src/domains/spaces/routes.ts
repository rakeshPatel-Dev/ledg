import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as spaceController from "./controller.js";

const router = Router();

router.use(authenticate);

router.post("/", spaceController.createSpace);
router.get("/", spaceController.listSpaces);
router.get("/:id", spaceController.getSpace);
router.put("/:id", spaceController.updateSpace);
router.delete("/:id", spaceController.deleteSpace);

export default router;