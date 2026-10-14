// ---------------------------------------------------------------------
//  This is the admin notifications payload:
// 
//  
//  The admin notifications utilizes the following controllers:
// - createJob
// - WorkerRegister
// - newApplication
// ---------------------------------------------------------------------

// Create Job Payload:
export const createJobPayload = ( industry: string, employer: string, date: Date
) => {
  return {
    type: "job_posted",
    title: `New job posted for ${industry} by ${employer}`,
    description: `A new ${industry} job has been posted by ${employer}.`,
    time: date.toISOString(),
    read: false,
    category: "job",
    details: `A new ${industry} job has been posted by ${employer}. Review the listing for requirements and approval.`,
  };
};

// Worker Register Payload:
export const WorkerRegisterPayload = ( worker: string, date: Date
) => {
  return {
    type: "verification",
    title: "Worker Account Pending Verification",
    description: `Worker Account Pending Verification for your Client ${worker}.`,
    time: date.toISOString(),
    read: false,
    category: "account",
    details: "A new worker account has been created and is pending verification. The worker has uploaded their CV/Resume for review. Please verify the documents and approve or reject the account.",
  };
};

// New Application Payload:
export const NewApplicationPayload = ( title: string, date: Date 
) => {
  return {
    type: "application",
    title: `Job Application Accepted for ${title}`,
    description: `Job Application Accepted for ${title} in mow accepted.`,
    time: date.toISOString(),
    read: false,
    category: "job",
    details: `The job application for the ${title} has been accepted by the employer. The worker has been notified and can now proceed with the onboarding process.`,
  }
}


// New Report Payload:
export const NewReportPayload = (
  from: string,
  to: string,
  title: string,
  category: string,
  date: Date
) => {
  return {
    type: "report",
    title: `New Report: ${title}`,
    description: `${from} has submitted a new report regarding "${title}" to ${to}.`,
    time: date,
    read: false,
    category: "report",
    details: `A new report has been submitted by the employer regarding "${title}". Please review the report and take any necessary action if required.`,
  };
};


