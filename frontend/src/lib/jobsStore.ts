import { create } from 'zustand';

export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: {
    email: string;
  };
  description: string;
  tags: string[];
  requirements?: string[];
  benefits?: string[];
  schedule?: string;
  name: {
    worker: {
      name: string;
    }
  }
  contactEmail?: string;
  contactPhone?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "active" | "pending" | "not_active";
  createdAt?: string;
  skills?: string[];
}

interface JobsStore {
  jobs: Job[];
  addJob: (job: Omit<Job, '_id' | 'posted' | 'status'>) => void;
  removeJob: (id: string) => void;
  updateJobStatus: (id: string, status: "PENDING" | "ACCEPTED" | "DECLINED") => void;
}

export const useJobsStore = create<JobsStore>((set, get) => ({
  jobs: [],

  addJob: (jobData) => {
    const newJob: Job = {
      ...jobData,
      _id: crypto.randomUUID(),
      posted: { email: "" },
      status: "PENDING",
    };

    set({ jobs: [newJob, ...get().jobs] });
  },

  removeJob: (id) => {
    set({
      jobs: get().jobs.filter(job => job._id !== id)
    });
  },

  updateJobStatus: (id, status) => {
    set({
      jobs: get().jobs.map(job =>
        job._id === id ? { ...job, status } : job
      )
    });
  }
}));