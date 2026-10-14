import { Router } from "express";

import {
  getApplicationHealth,
  getPlatformHealth
} from "../controller/applicationHealth.controller";

const applicationHealthRouter = Router();

applicationHealthRouter.get("/", getApplicationHealth);
applicationHealthRouter.get("/platform-health", getPlatformHealth)

export default applicationHealthRouter;