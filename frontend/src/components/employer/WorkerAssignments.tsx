import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, ClipboardList } from "lucide-react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Upload } from "lucide-react";
import CreateAssignmentModal from "./CreateAssignmentModal";
import { Button } from "../ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Worker {
  _id: string;
  name: string;
  email: string;
}

interface WorkerAssignment {
  _id: string;
  targetWorkers: {
    _id: string;
    name: string;
  }[];
  employerId: string;
  title?: string;
  description?: string;
  status?: string;
  createdAt: string;
}

interface SubmittedJob {
  _id: string;
  employerId: {
    _id: string;
    name?: string;
  };
  workerId: {
    _id: string;
    name: string;
  };
  workerAssignment: {
    _id: string;
    title?: string;
    targetWorkers: [{
      _id: string;
      name: string;
    }];
    description?: string;
    submitBefore?: string;
    createdAt: string;
  };
  workerUpload: {
    name: string;
  }[];
  workerDescription: string;
  submitted: boolean;
  isLate: boolean;
  status: string;
}

interface SubmittedAssignmentResponse {
  _id: string;
  employerId: {
    _id: string;
    name?: string;
  };
  workerId: {
    _id: string;
    name: string;
  };
  workerAssignment: {
    _id: string;
    title?: string;
    targetWorkers: [{
      _id: string;
      name: string;
    }];
    description?: string;
    submitBefore?: string;
    createdAt: string;
  };
  workerUpload: [
    {
      _id: string;
      name: string;
    }
  ];
  workerDescription: string;
  submitted: boolean;
  status: string;
  isLate: boolean;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
};

const WorkerAssignments = () => {
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [submittedJobs, setSubmittedJobs] = useState<SubmittedJob[]>([]);
  
  const [workerAssignment, setWorkerAssignment] = useState("")
  const [workerID, setWorkerID] = useState("")
  const [workerNAME, setWorkerNAME] = useState("")

  const [selectedAssignment, setSelectedAssignment] =
    useState<WorkerAssignment>();

  const [submittedAssignment, setSubmittedAssignment] =
    useState<SubmittedAssignmentResponse[]>([]);

  const [submittedModalOpen, setSubmittedModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("assignments")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [workStatus, setWorkerStatus] = useState("")

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8920/api/pro/worker-assignments",
        {
          withCredentials: true,
        }
      );

      setAssignments(res.data.workerAssignments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmittedJobs = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8920/api/pro/submitted/worker/assignments",
        {
          withCredentials: true,
        }
      );

      console.log(res.data.SubmittedJobs)
      setSubmittedJobs(res.data.SubmittedJobs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmittedAssignment = async (workerId: string, employerId: string, workerAssignment: string) => {
    try {
      const res = await axios.get(
        `http://localhost:8920/api/pro/worker/assignment/${workerId}/${employerId}/${workerAssignment}`,
        {
          withCredentials: true,
        }
      );

      setWorkerID(res.data.WorkerInfo._id)
      setWorkerNAME(res.data.WorkerInfo.name)
      setSelectedAssignment(res.data.WorkerAssignmentInfo)
      setSubmittedAssignment(res.data.SubmittedJobs);
    } catch (err: any) {
      console.error(err.response);
    }
  };

  const MarkAsCompletedRejected = async (
    workerAssignment: string,
    workerId: string,
    workerName: string,
    status: string
  ) => {
    try {
      const res = await axios.patch(
        "http://localhost:8920/api/pro/update/worker/job/employer",
        {
          workerAssignment,
          workerId,
          workerName,
          status
        },
        { withCredentials: true }
      )

      console.log(res.data)

      // Refetch the updated data
      await fetchSubmittedJobs();

      // Refetch the assignment data as well
      await fetchAssignments();

      // Close the modal
      setSubmittedModalOpen(false);

      setConfirmOpen(false);

      toast.success(`Successfully marked the job as ${workStatus}`)

    } catch (error) {
      console.log(workerAssignment)
    }
  }

  const submittedJobsFilter = submittedJobs.filter((submittedJob) => submittedJob.status !== "COMPLETED")
  const completedJobs = submittedJobs.filter((submittedJob) => submittedJob.status === "COMPLETED")

  useEffect(() => {
    fetchAssignments();
    fetchSubmittedJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <p className="text-muted-foreground">Loading assignments...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Worker Assignments</h1>
        <p className="mt-2 text-muted-foreground">
          Manage and monitor assignments for your workers.
        </p>
      </div>

      <Button onClick={() => setOpen(true)}>
        Create Assignment
      </Button>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="assignments" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>

          <TabsTrigger value="submitted" className="gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Submitted</span>
          </TabsTrigger>

          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Completed</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-semibold">No assignments yet</h3>
              <p className="mt-2 text-muted-foreground">
                Assignments will appear here once you create them.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment._id}
                  className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">
                      {assignment.title || "Untitled Assignment"}
                    </h3>

                    {assignment.status && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusColors[assignment.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {assignment.status}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {assignment.description || "No description provided."}
                  </p>

                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {assignment.targetWorkers.slice(0, 3).map((worker) => (
                        <span
                          key={worker._id}
                          className="rounded-full bg-muted px-2 py-1 text-sm"
                        >
                          {worker.name}
                        </span>
                      ))}

                      {assignment.targetWorkers.length > 3 && (
                        <span className="rounded-full bg-muted px-2 py-1 text-sm">
                          +{assignment.targetWorkers.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(assignment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
                
        <TabsContent value="submitted">
          {submittedJobsFilter.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-semibold">No submitted jobs yet</h3>
              <p className="mt-2 text-muted-foreground">
                Submitted jobs will appear here once workers submit them.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {submittedJobsFilter.map((job) => (
                <div
                  key={job._id}
                  className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold">
                        {job.workerId.name || "Unknown Worker"} Submitted a Job
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        job.isLate ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {job.isLate ? "Submitted Late" : "Submitted"}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-medium text-gray-700">
                      Worker Assignment: {job.workerAssignment.title || "Untitled Assignment"}
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Description: {job.workerDescription || "No description provided."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-6 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    onClick={
                      () => {
                        fetchSubmittedAssignment(job.workerId._id, job.employerId._id, job.workerAssignment._id)
                        setSubmittedModalOpen(true)
                      }
                    }
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-semibold">No submitted jobs yet</h3>
              <p className="mt-2 text-muted-foreground">
                Submitted jobs will appear here once workers submit them.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {completedJobs.map((job) => (
                <div
                  key={job._id}
                  className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold">
                        {job.workerId.name || "Unknown Worker"} Submitted a Job
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        job.isLate ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {job.isLate ? "Completed Late" : "Completed"}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-medium text-gray-700">
                      Worker Assignment: {job.workerAssignment.title || "Untitled Assignment"}
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Description: {job.workerDescription || "No description provided."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-6 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    onClick={
                      () => {
                        fetchSubmittedAssignment(job.workerId._id, job.employerId._id, job.workerAssignment._id)
                        setSubmittedModalOpen(true)
                      }
                    }
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent> {/* This needs to be showing the jobs where the status has been "COMPLETED" */}
      </Tabs>

      <CreateAssignmentModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          fetchAssignments();
          fetchSubmittedJobs();
          setOpen(false);
        }}
      />

      <Dialog
        open={submittedModalOpen}
        onOpenChange={setSubmittedModalOpen}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              onClick={() => {
                // MarkAsCompletedRejected(selectedAssignment._id, workerID, workerNAME, "completed")

                setConfirmOpen(true)
                setWorkerStatus("completed")

                setWorkerAssignment(selectedAssignment._id)
                setWorkerID(workerID)
                setWorkerNAME(workerNAME)
              }}
            >
              Mark as Completed
            </button>

            <button
              type="button"
              className="flex-1 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              onClick={() => {
                // MarkAsCompletedRejected(selectedAssignment._id, workerID, workerNAME, "rejected")

                setConfirmOpen(true)
                setWorkerStatus("rejected")

                setWorkerAssignment(selectedAssignment._id)
                setWorkerID(workerID)
                setWorkerNAME(workerNAME)
              }}
            >
              Mark as Rejected
            </button>
          </div>

          <div className="space-y-4">
            {submittedAssignment.map((submitted) => (
              <div>
                <strong className="block mb-1">{submitted.workerDescription}</strong>
                
                {submitted.workerUpload.map((workerUpload) => (
                  <a
                    href={`http://localhost:8920/uploads/workerJobsCompleted/${workerUpload.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-10 mb-1 min-w-0 flex-1 truncate rounded-md bg-gray-100 px-3 py-2 text-sm text-blue-600 underline transition-colors hover:bg-gray-200 hover:text-blue-800"
                  >
                    {workerUpload.name}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you wanted to mark as {workStatus}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button>Cancel</Button>
            <Button onClick={() => MarkAsCompletedRejected(workerAssignment, workerID, workerNAME, workStatus)}>Mark as {workStatus}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerAssignments;