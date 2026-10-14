// ---------------------------------------------------------------------
//  This is the user notifications payload:
// 
//  
//  The user notifications utilizes the following controllers:
// - PostContact
// - NewMessage
// ---------------------------------------------------------------------
import { Types } from "mongoose";

// Post Contact Payload
export const PostContactPayload = (
  user: string,
  recipientId: string,
  date: Date
) => {
  return {
    type: "contact",
    title: `New contact request from ${user}`,
    description: `A new contact request has been sent by ${user}.`,
    time: date.toISOString(),
    read: false,
    category: "contact",
    details: `A new contact request has been initiated by ${user}. Review and respond accordingly.`,

    audience: "specific",
    targetUsers: [recipientId],
  };
};

// Job Post Payload:
export const JobPostPayload = (
  user: string,
  jobTitle: string,
  recipientIds: Types.ObjectId[],
  date: Date
) => {
  return {
    type: "job_posted",
    title: `New Job: ${jobTitle}`,
    description: `${user} posted a new job opening.`,
    time: date.toISOString(),
    read: false,
    category: "job",
    details: `${user} has posted "${jobTitle}". Check the job posting for full details.`,

    audience: "specific",
    targetUsers: recipientIds,
  };
};

// New Message Payload
export const NewMessagePayload = (
  user: string,
  recipientId: string,
  date: Date
) => {
  return {
    type: "contact",
    title: `New message from ${user}`,
    description: `You have received a new message from ${user}.`,
    time: date.toISOString(),
    read: false,
    category: "contact",
    details: `A new message has been received from ${user}. Please check the conversation for details.`,

    audience: "specific",
    targetUsers: [recipientId],
  };
};

// Update Application Payload:
export const UpdateApplicationPayload = (
  status: string,
  user: string,
  date: Date,
  recipientId: Types.ObjectId,
  jobTitle: string
) => {
  return {
    type: "application",

    title:
      status === "Accepted"
        ? `Your application for ${jobTitle} has been accepted`
        : status === "Not Selected"
        ? `Your application for ${jobTitle} was not selected`
        : `Interview scheduled for ${jobTitle}`,

    description:
      status === "Accepted"
        ? "Congratulations! Your application has been accepted."
        : status === "Not Selected"
        ? "Unfortunately, you were not selected for this position. Please go to My Applications > View Employer Responses to know why your application was denied."
        : "Your interview has been scheduled.",

    time: date.toISOString(),
    read: false,
    category: "job",

    details:
      status === "Accepted"
        ? `${user} accepted your application for ${jobTitle}.`
        : status === "Not Selected"
        ? `${user} marked your application as not selected for ${jobTitle}. Please go to My Applications > View Employer Responses to know why your application was denied.`
        : `${user} scheduled an interview for your ${jobTitle} application.`,

    audience: "specific",
    targetUsers: [recipientId],
  };
};

// Update Application Payload:
export const UpdateReportPayload = (
  status: string,
  user: string,
  date: Date,
  recipientId: string
) => {
  return {
    type: "report",

    title:
      status === "Under Review"
        ? "Your report is under review"
        : status === "Resolved"
        ? "Your report has been resolved"
        : "Your report has been rejected",

    description:
      status === "Under Review"
        ? "Our team is currently reviewing your report."
        : status === "Resolved"
        ? "Your report has been reviewed and resolved."
        : "Your report has been reviewed and rejected.",

    time: date.toISOString(),
    read: false,
    category: "report",

    details:
      status === "Under Review"
        ? `${user} is currently reviewing your report.`
        : status === "Resolved"
        ? `${user} marked your report as resolved.`
        : `${user} rejected your report.`,

    audience: "specific",
    targetUsers: [recipientId],
  };
};

// Worker Assignment Payload:
export const WorkerAssignmentPayload = (senderEmail: string, date: Date, recipientId: string) => {
  return {
    type: "worker_assignment",
    title: `${senderEmail} has posted a new assignment`,
    description: "Please read the worker assignments page to view more details.",
    time: date.toISOString(),
    read: false,
    category: "worker_assignment",
    details: "",
    audience: "specific",
    targetUsers: [recipientId],
  }
}

// Update the Worker Job Status by Worker:
export const UpdateWorkerJobWorker = (workerName: string, date: Date, recipientId: string) => {
  return {
    type: "worker_assignment",
    title: `${workerName} submitted an assignment`,
    description: "Please read the worker assignments page, specifically at the submitted assignments to view more details.",
    time: date.toISOString(),
    read: false,
    category: "worker_assignment",
    details: "",
    audience: "specific",
    targetUsers: [recipientId],
  }
}

// Update the Worker Job Status by Worker:
export const UpdateWorkerJobCompleted = (workerName: string, date: Date, recipientId: string) => {
  return {
    type: "worker_assignment",
    title: `${workerName} marked your assignment as completed`,
    description: "Please read the worker assignments page, specifically at the completed assignments to view more details.",
    time: date.toISOString(),
    read: false,
    category: "worker_assignment",
    details: "",
    audience: "specific",
    targetUsers: [recipientId],
  }
}

// Update the Worker Job Status by Worker:
export const UpdateWorkerJobRejected = (workerName: string, date: Date, recipientId: string) => {
  return {
    type: "worker_assignment",
    title: `${workerName} marked your assignment as rejected`,
    description: "Please read the worker assignments page, specifically at the submitted assignments to view more details.",
    time: date.toISOString(),
    read: false,
    category: "worker_assignment",
    details: "",
    audience: "specific",
    targetUsers: [recipientId],
  }
}

// ==================== Notify the Employers ======================
// =
// =
// ================================================================

export const NewApplicationPayloadEmployer = (
  applicantName: string,
  employerId: string,
  date: Date
) => {
  return {
    type: "application",
    title: `New application from ${applicantName}`,
    description: `${applicantName} submitted a new job application.`,

    time: date.toISOString(),
    read: false,
    category: "job",

    details: `A new application has been submitted by ${applicantName}. Review it in the employer dashboard.`,

    audience: "employers",
    targetUsers: [employerId],
  };
};

export const NewReportPayloadEmployer = (
  workerName: string,
  employerId: string,
  date: Date
) => {
  return {
    type: "report",
    title: "New report from " + workerName,
    description: `${workerName} submitted a new report.`,

    time: date.toISOString(),
    read: false,
    category: "report",

    details: `A new report has been submitted by ${workerName}. Review it in the employer dashboard.`,

    audience: "employers",
    targetUsers: [employerId],
  }
}

export const UploadWorkerJobPayload = (workerName: string, date: Date, recipientId: string) => {
  return {
    type: "worker_assignment",
    title: `${workerName} has submitted an assignment`,
    description: "Please read the submitted page to view more details.",
    time: date.toISOString(),
    read: false,
    category: "worker_assignment",
    details: "",
    audience: "specific",
    targetUsers: [recipientId],
  }
}

export const UploadReasonPayload = (NameEmail: string, date: Date, recipientId: string, sentBy: string, job: string, worker: string) => {
  return {
    type: "application",
    title: `${NameEmail} has submitted a response `,
    description: sentBy === "worker" ? `Go to Applications > View Conversations from ${worker}'s application from the job named ${job}` : `Please go to My Application > View Employer Conversations from ${job}`,
    time: date.toISOString(),
    read: false,
    category: "application",
    details: "",
    audience: "workers",
    targetUsers: [recipientId],
  }
}