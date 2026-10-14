import { Request, Response } from "express";
import VerifiedWorker from "../model/VerifiedWorker";
import Worker from "../model/Worker";
import ApplicationAccepted from "../model/ApplicationAccepted";
import { ResponseModel } from "../model/Response";
import PlatformHealth from "../model/PlatformHealth";

export const getApplicationHealth = async (
  req: Request,
  res: Response
) => {
  try {
    const workers = await Worker.find()
    const VerifiedWorkers = await VerifiedWorker.find()

    const w_length = workers.length;
    const vw_length = VerifiedWorkers.length;

    const verificationRate = Math.floor((vw_length / w_length) * 100)


    const applicationAccepted = await ApplicationAccepted.find();

    const totalHours = applicationAccepted.reduce((sum, application) => {
      return (
        sum +
        (application.createdAt.getTime() - application.jobCreatedAt.getTime()) /
          (1000 * 60 * 60)
      );
    }, 0);

    const averageMatchTime =
      applicationAccepted.length
        ? totalHours / applicationAccepted.length
        : 0;




    const Responses = await ResponseModel.find();

    const totalMinutes = Responses.reduce((sum, response) => {
      return (
        sum +
        (response.createdAt.getTime() - response.jobCreated.getTime()) /
          (1000 * 60 * 60)
      );
    }, 0);

    const averageResponseTime =
      Responses.length
        ? totalMinutes / Responses.length
        : 0;




    const OK = await PlatformHealth.find({ status: 'OK' });
    const PlatformHealths = await PlatformHealth.find();

    const platformUptime = Math.floor((OK.length / PlatformHealths.length) * 100)


    return res.status(200).json({
      success: true,
      data: {
        verificationRate,
        averageMatchTime: Math.floor(averageMatchTime),
        averageResponseTime: Math.floor(averageResponseTime),
        platformUptime
      }
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};


export const getPlatformHealth = async (
  req: Request,
  res: Response
) => {
  try {
    // Check if platform is working
    let status: "OK" | "ERR" = "OK";

    try {
      // Example: test database connection
      await PlatformHealth.db.db?.command({
        ping: 1
      });
    } catch (error) {
      status = "ERR";
    }

    // Save health check
    await PlatformHealth.create({
      status
    });


    // Get health records
    const records = await PlatformHealth.find();


    const totalChecks = records.length;

    const okChecks = records.filter(
      (record) => record.status === "OK"
    ).length;


    const platformUptime =
      totalChecks === 0
        ? 0
        : (okChecks / totalChecks) * 100;


    res.status(200).json({
      status,
      platformUptime: Number(platformUptime.toFixed(2))
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to get platform health"
    });
  }
};