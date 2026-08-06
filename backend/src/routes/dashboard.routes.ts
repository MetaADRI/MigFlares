import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/stats", dashboardController.stats);
router.get("/revenue", dashboardController.revenue);
router.get("/activities", dashboardController.activities);
router.get("/top-services", dashboardController.topServices);
router.get("/recent-customers", dashboardController.recentCustomers);
router.get("/insights", dashboardController.insights);
router.get("/staff", dashboardController.staff);

export default router;
