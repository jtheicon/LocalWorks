import { Request, Response } from "express";
import PlatformHealth from "../model/PlatformHealth";
import { getApplicationHealthMetrics } from "../services/applicationHealthMetrics";

export const getApplicationHealth = async (_req: Request, res: Response) => {
  try {
    const data = await getApplicationHealthMetrics();
    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const getPlatformHealth = async (_req: Request, res: Response) => {
  try {
    let status: "OK" | "ERR" = "OK";

    try {
      await PlatformHealth.db.db?.command({ ping: 1 });
    } catch {
      status = "ERR";
    }

    await PlatformHealth.create({ status });

    const records = await PlatformHealth.find().select("status").lean();
    const totalChecks = records.length;
    const okChecks = records.filter((record) => record.status === "OK").length;
    const platformUptime = totalChecks === 0 ? 0 : (okChecks / totalChecks) * 100;

    res.status(200).json({
      status,
      platformUptime: Number(platformUptime.toFixed(2)),
    });
  } catch {
    res.status(500).json({ message: "Failed to get platform health" });
  }
};
