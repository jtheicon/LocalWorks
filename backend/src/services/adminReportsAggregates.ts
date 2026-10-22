/** Shared Mongo pipelines for GET /api/admin/reports */
import type { PipelineStage } from "mongoose";

export const workerGrowthPipeline: PipelineStage[] = [
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
      newWorkers: { $sum: 1 },
      activeWorkers: {
        $sum: {
          $cond: [{ $eq: ["$status", "active"] }, 1, 0],
        },
      },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } as Record<string, 1 | -1> },
  {
    $project: {
      _id: 0,
      month: {
        $concat: [
          {
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              "$_id.month",
            ],
          },
          " ",
          { $toString: "$_id.year" },
        ],
      },
      newWorkers: 1,
      activeWorkers: 1,
    },
  },
];

export const jobsByIndustryPipeline: PipelineStage[] = [
  { $match: { category: { $ne: null } } },
  { $group: { _id: "$category", value: { $sum: 1 } } },
  { $project: { _id: 0, name: "$_id", value: 1 } },
  { $sort: { value: -1 } as Record<string, 1 | -1> },
];

export const jobPerformancePipeline: PipelineStage[] = [
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      },
      posted: { $sum: 1 },
      filled: {
        $sum: {
          $cond: [{ $lt: [{ $ifNull: ["$positions", 0] }, 1] }, 1, 0],
        },
      },
      expired: {
        $sum: {
          $cond: [{ $lt: [{ $toDate: "$applyBefore" }, "$$NOW"] }, 1, 0],
        },
      },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } as Record<string, 1 | -1> },
  {
    $project: {
      _id: 0,
      year: "$_id.year",
      month: {
        $arrayElemAt: [
          ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          "$_id.month",
        ],
      },
      posted: 1,
      filled: 1,
      expired: 1,
    },
  },
];

export const categoryTablePipeline: PipelineStage[] = [
  {
    $lookup: {
      from: "workers",
      localField: "category",
      foreignField: "industry",
      as: "workers",
    },
  },
  {
    $lookup: {
      from: "applications",
      localField: "_id",
      foreignField: "job",
      as: "applications",
    },
  },
  {
    $addFields: {
      applications: {
        $cond: [{ $isArray: "$applications" }, "$applications", []],
      },
    },
  },
  {
    $group: {
      _id: "$category",
      totalApplications: { $sum: { $size: "$applications" } },
      acceptedApplications: {
        $sum: {
          $size: {
            $filter: {
              input: "$applications",
              as: "a",
              cond: { $eq: ["$$a.status", "Accepted"] },
            },
          },
        },
      },
      activeJobs: {
        $sum: {
          $cond: [
            {
              $and: [
                { $gt: [{ $toDate: "$applyBefore" }, "$$NOW"] },
                { $not: { $in: ["$status", ["DELETED", "DECLINED", "PENDING"]] } },
              ],
            },
            1,
            0,
          ],
        },
      },
      totalJobs: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      name: "$_id",
      activeJobs: 1,
      totalApplications: 1,
      avgApplications: {
        $round: [
          {
            $cond: [
              { $eq: ["$totalJobs", 0] },
              0,
              { $divide: ["$totalApplications", "$totalJobs"] },
            ],
          },
          0,
        ],
      },
      acceptanceRate: {
        $round: [
          {
            $cond: [
              { $eq: ["$totalApplications", 0] },
              0,
              {
                $multiply: [{ $divide: ["$acceptedApplications", "$totalApplications"] }, 100],
              },
            ],
          },
          0,
        ],
      },
    },
  },
];
