import VerifiedWorker from "../model/VerifiedWorker";
import Worker from "../model/Worker";
import ApplicationAccepted from "../model/ApplicationAccepted";
import { ResponseModel } from "../model/Response";
import PlatformHealth from "../model/PlatformHealth";

export type ApplicationHealthMetrics = {
  verificationRate: number;
  averageMatchTime: number;
  averageResponseTime: number;
  platformUptime: number;
};

export async function getApplicationHealthMetrics(): Promise<ApplicationHealthMetrics> {
  const [workerCount, verifiedCount, applicationAccepted, responses, platformRecords] =
    await Promise.all([
      Worker.countDocuments(),
      VerifiedWorker.countDocuments(),
      ApplicationAccepted.find().select("createdAt jobCreatedAt").lean(),
      ResponseModel.find().select("createdAt jobCreated").lean(),
      PlatformHealth.find().select("status").lean(),
    ]);

  const verificationRate =
    workerCount > 0 ? Math.floor((verifiedCount / workerCount) * 100) : 0;

  const totalMatchHours = applicationAccepted.reduce((sum, application) => {
    const createdAt = application.createdAt ? new Date(application.createdAt) : null;
    const jobCreatedAt = application.jobCreatedAt ? new Date(application.jobCreatedAt) : null;
    if (!createdAt || !jobCreatedAt) return sum;
    return sum + (createdAt.getTime() - jobCreatedAt.getTime()) / (1000 * 60 * 60);
  }, 0);

  const averageMatchTime = applicationAccepted.length
    ? totalMatchHours / applicationAccepted.length
    : 0;

  const totalResponseMinutes = responses.reduce((sum, response) => {
    const createdAt = response.createdAt ? new Date(response.createdAt) : null;
    const jobCreated = response.jobCreated ? new Date(response.jobCreated) : null;
    if (!createdAt || !jobCreated) return sum;
    return sum + (createdAt.getTime() - jobCreated.getTime()) / (1000 * 60 * 60);
  }, 0);

  const averageResponseTime = responses.length ? totalResponseMinutes / responses.length : 0;

  const okChecks = platformRecords.filter((r) => r.status === "OK").length;
  const platformUptime =
    platformRecords.length > 0 ? Math.floor((okChecks / platformRecords.length) * 100) : 0;

  return {
    verificationRate,
    averageMatchTime: Math.floor(averageMatchTime),
    averageResponseTime: Math.floor(averageResponseTime),
    platformUptime,
  };
}
