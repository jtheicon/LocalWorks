import { Model } from "mongoose";
import Worker from "../model/Worker";
import Employer from "../model/Employer";

/** Worker vs Employer model pick — single cast avoids Mongoose union typing errors under ts-node. */
export const userModelByRole = (role: "worker" | "employer"): Model<any> =>
  (role === "worker" ? Worker : Employer) as Model<any>;
