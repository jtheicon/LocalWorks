import { Request, Response } from "express";
import * as z from "zod";
import { mainError } from "../errors/showErrors";
import { employerCredibility, workerCredibility } from "../services/credibility";

const CredibilityRequest = z.object({
  role: z.enum(["worker", "employer"], "Role must be worker or employer"),
  ids: z.array(z.string()).min(1, "ids must not be empty").max(200, "Too many ids"),
});

// POST /api/pro/credibility  { role, ids } -> { scores: { [id]: Credibility } }
// Batched so a page of cards needs a single request.
export const Credibility = async (req: Request, res: Response) => {
  const parsed = CredibilityRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });

  const { role, ids } = parsed.data;
  try {
    const scores = role === "worker" ? await workerCredibility(ids) : await employerCredibility(ids);
    return res.status(200).json({ success: true, scores });
  } catch (error) {
    mainError(error, res);
  }
};
