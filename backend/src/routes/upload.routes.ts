import { Router } from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

router.post("/", requireAuth, upload.single("image"), uploadController.uploadImage);

export default router;
