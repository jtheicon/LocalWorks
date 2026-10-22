import { Router } from "express";
import {
  GetReactivationContext,
  SubmitReactivationRequest,
  reactivationRateLimit,
} from "../controller/accountLifecycle";

const router = Router();

router.get("/reactivation/request", reactivationRateLimit, GetReactivationContext);
router.post("/reactivation/request", reactivationRateLimit, SubmitReactivationRequest);

export default router;
