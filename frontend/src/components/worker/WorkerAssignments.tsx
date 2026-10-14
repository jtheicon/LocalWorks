import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Calendar, ClipboardList } from "lucide-react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "../ui/button";

import { toast } from "sonner";

interface Assignment {
  workerAssignment: {
    _id: string;
    title?: string;
    description?: string;
    submitBefore?: string;
    rejectLate: boolean;
    employerId?: {
      _id: string;
      email: string;
    };
    createdAt: string;
  };
  submitted: Boolean;
  completed: Boolean;
  rejected: Boolean;
}

const statusColors: Record<"true" | "false", string> = {
  true: "bg-green-100 text-green-700",
  false: "bg-yellow-100 text-yellow-700",
};

const WorkerAssignment = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "late" | "notLate">("all");
  const [loading, setLoading] = useState(true);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [remarks, setRemarks] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState("assignments");

  const [search, setSearch] = useState("");
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [deletedFiles, setDeletedFiles] = useState([]);

  const [jobCompleted, setJobCompleted] = useState();

  const newFilesInputRef = useRef<HTMLInputElement>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [addingNewFiles, setAddingNewFiles] = useState(false);

  const [assignmentId, setAssignmentId] = useState(null);
  const [employerId, setEmployerId] = useState(null);
  const [employerEmail, setEmployerEmail] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const filteredAssignments = assignments.filter((assignment) =>
    assignment.workerAssignment.title?.toLowerCase().includes(search.toLowerCase()) ||
    assignment.workerAssignment.description?.toLowerCase().includes(search.toLowerCase()) ||
    assignment.workerAssignment.employerId?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredByLateStatus = filteredAssignments.filter((assignment) => {
    const submitBefore = assignment.workerAssignment.submitBefore;

    if (!submitBefore) {
      return assignmentFilter === "all";
    }

    const isLate = new Date(submitBefore).getTime() < Date.now();

    if (assignmentFilter === "late") {
      return isLate;
    }

    if (assignmentFilter === "notLate") {
      return !isLate;
    }

    return true;
  });

  const currentAssignments = filteredByLateStatus
    .filter(
      (assignment) => !assignment.completed && !assignment.submitted
    )
    .sort((a, b) => Number(b.rejected) - Number(a.rejected));

  const submittedAssignments = filteredByLateStatus.filter(
    (assignment) => assignment.submitted && !assignment.completed
  );

  const completedAssignments = filteredByLateStatus.filter(
    (assignment) => assignment.completed
  );

  const handleAddNewFilesClick = (submission) => {
    setJobCompleted(submission._id)
    newFilesInputRef.current?.click();
  };

  const handleAddNewFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
    jobCompleted: string
  ) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (submittedFiles.length === 0) {
      toast.error("No existing submission found.");
      return;
    }

    try {
      setAddingNewFiles(true);

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("workerUpload", file);
      });

      // Upload the actual files first
      const uploadRes = await axios.post(
        "http://localhost:8920/api/pro/upload/worker/jobFile",
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadedFiles = uploadRes.data.filename;

      for (const file of uploadedFiles) {
        await axios.post(
          "http://localhost:8920/api/pro/new/worker/job",
          {
            jobCompleted,
            name: file.filename,
          },
          {
            withCredentials: true,
          }
        );
      }

      // Get the updated files
      if (selectedAssignment) {
        await getSubmittedFiles(selectedAssignment.workerAssignment._id);
      }

      toast.success("New files successfully added!");

    } catch (err: any) {
      console.error("Add new files error:", err);

      if (err.response) {
        console.log("Status:", err.response.status);
        console.log("Response:", err.response.data);
      }

      toast.error("Failed to add new files.");
    } finally {
      setAddingNewFiles(false);

      if (newFilesInputRef.current) {
        newFilesInputRef.current.value = "";
      }
    }
  };

  // Handle the submit:
  const handleSubmit = async () => {
    if (!selectedAssignment) return;

    const submitBefore = selectedAssignment.workerAssignment.submitBefore;

    const isLate = submitBefore
      ? new Date(submitBefore).getTime() < Date.now()
      : false;

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("workerUpload", file);
      });

      if (isLate && selectedAssignment.workerAssignment.rejectLate) {
        toast.error("This doesn't accept late submissions.")
      } else {
        const uploadRes = await axios.post(
          "http://localhost:8920/api/pro/upload/worker/jobFile",
          formData,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const uploadedFiles = uploadRes.data.filename.map((file: any) => ({
          name: file.filename,
        }));

        // Create one JobsCompleted document per uploaded file
        await axios.post(
          `http://localhost:8920/api/pro/upload/worker/job/${selectedAssignment.workerAssignment.employerId._id}`,
          {
            workerAssignment: selectedAssignment.workerAssignment._id,
            workerUpload: uploadedFiles,
            workerDescription: remarks,
            isLate
          },
          {
            withCredentials: true,
          }
        );

        toast.success("Files successfully added!");

        setIsModalOpen(false);
        setRemarks("");
        setSelectedFiles([]);
      }
    } catch (err: any) {
      console.error("Upload error:", err);

      if (err.response) {
        console.log("Status:", err.response.status);
        console.log("Response:", err.response.data);
      } else if (err.request) {
        console.log("No response received:", err.request);
      } else {
        console.log("Error:", err.message);
      }

      toast.error("Failed to submit job.");
    }
  };
  

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

  const getSubmittedFiles = async (assignmentId: string) => {
    try {
      const res = await axios.get(
        `http://localhost:8920/api/pro/jobs/submitted/${assignmentId}`,
        {
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setSubmittedFiles(res.data.files);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setIsModalOpen(true);
    setDeletedFiles([]);

    await getSubmittedFiles(assignment.workerAssignment._id);
  };

  const removeFile = async (WorkerAssignment: string) => {
    try {
      await axios.delete(
        `http://localhost:8920/api/pro/worker/job/file/${WorkerAssignment}`,
        
        {
          withCredentials: true,
        }
      );

      // Refetch the latest files from the server
      if (selectedAssignment) {
        await getSubmittedFiles(selectedAssignment.workerAssignment._id);
      }
    } catch (err) {
      console.error(err.response);
      toast.error("Failed to delete file.");
    }
  };

  const removeFileFromJobCompleted = async (name: string, _id: string) => {
    try {
      await axios.delete(
        `http://localhost:8920/api/pro/worker/job/${name}/${_id}`,
        
        {
          withCredentials: true,
        }
      );

      // Refetch the latest files from the server
      if (selectedAssignment) {
        await getSubmittedFiles(selectedAssignment.workerAssignment._id);
      }
    } catch (err) {
      console.error(err.response);
      toast.error("Failed to delete file.");
    }
  };

  const handleAssignmentSubmit = async (workerAssignment: string, employerId: string, employerEmail: string) => {
    try {
      await axios.patch(
        "http://localhost:8920/api/pro/update/worker/job/worker",
        {
          workerAssignment,
          employerId,
          email: employerEmail,
          status: "submitted",
        },
        {
          withCredentials: true,
        }
      )
        .then(function (response) {
          fetchAssignments();
          toast.success("Successfully submitted the assignment.")

          setConfirmOpen(false);
        })
    } catch (err) {
      toast.error(err.response.data.message);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        Loading assignments...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="text-muted-foreground mt-2">
          View the tasks assigned to you.
        </p>
      </div>

      <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Worker Assignments</h1>
            <p className="text-muted-foreground mt-2">
              View your assignments and submitted work.
            </p>
          </div>

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

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Assignment status filter */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setAssignmentFilter("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  assignmentFilter === "all"
                    ? "bg-black text-white"
                    : "border bg-white text-black"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setAssignmentFilter("late")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  assignmentFilter === "late"
                    ? "bg-black text-white"
                    : "border bg-white text-black"
                }`}
              >
                Late
              </button>

              <button
                onClick={() => setAssignmentFilter("notLate")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  assignmentFilter === "notLate"
                    ? "bg-black text-white"
                    : "border bg-white text-black"
                }`}
              >
                Not Late
              </button>
            </div>

            <TabsContent value="assignments">

              {currentAssignments.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center">
                  <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-semibold">No assignments</h3>
                  <p className="mt-2 text-muted-foreground">
                    Your employer hasn't assigned any work yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {currentAssignments.map((assignment) => (
                    <div
                      key={assignment.workerAssignment._id}
                      className="rounded-xl border bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">
                          {assignment.workerAssignment.title || "Untitled Assignment"}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            assignment.rejected
                              ? "bg-red-100 text-red-700"
                              : assignment.submitted &&
                                assignment.workerAssignment.submitBefore &&
                                new Date(assignment.workerAssignment.submitBefore).getTime() <
                                  Date.now()
                              ? "bg-orange-100 text-orange-700"
                              : !assignment.submitted &&
                                assignment.workerAssignment.submitBefore &&
                                new Date(assignment.workerAssignment.submitBefore).getTime() <
                                  Date.now()
                              ? "bg-red-100 text-red-700"
                              : assignment.submitted
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {assignment.rejected
                            ? "Rejected"
                            : assignment.submitted &&
                              assignment.workerAssignment.submitBefore &&
                              new Date(assignment.workerAssignment.submitBefore).getTime() <
                                Date.now()
                            ? "Submitted Late"
                            : !assignment.submitted &&
                              assignment.workerAssignment.submitBefore &&
                              new Date(assignment.workerAssignment.submitBefore).getTime() <
                                Date.now()
                            ? "Late"
                            : assignment.submitted
                            ? "Submitted"
                            : "Not Submitted"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {assignment.workerAssignment.description || "No description provided."}
                      </p>

                      <div className="mt-6 space-y-3 text-sm">
                        {assignment.workerAssignment.employerId && (
                          <div>
                            <span className="font-medium">Assigned by:</span>{" "}
                            {assignment.workerAssignment.employerId.email}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Created:{" "}
                            {new Date(
                              assignment.workerAssignment.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Submit Before:{" "}
                            {assignment.workerAssignment.submitBefore
                              ? new Date(
                                  assignment.workerAssignment.submitBefore
                                ).toLocaleString()
                              : "No deadline"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setRemarks("");
                          setSelectedFiles(null);
                          setIsModalOpen(true);
                          openModal(assignment);
                        }}
                        className="mt-6 w-full rounded-lg bg-black py-2 text-white"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => {
                          // handleAssignmentSubmit(assignment.workerAssignment._id, assignment.workerAssignment.employerId._id, assignment.workerAssignment.employerId.email)
                          setAssignmentId(assignment.workerAssignment._id)
                          setEmployerId(assignment.workerAssignment.employerId._id)
                          setEmployerEmail(assignment.workerAssignment.employerId.email)

                          setConfirmOpen(true)
                        }}
                        className="mt-2 w-full rounded-lg bg-black py-2 text-white transition hover:bg-neutral-800"
                      >
                        Submit Assignment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="submitted">
              {/* Submitted cards */}
              {submittedAssignments.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center">
                  <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-semibold">No submitted assignments</h3>
                  <p className="mt-2 text-muted-foreground">
                    You haven't submitted any assignments yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {submittedAssignments.map((assignment) => (
                    <div
                      key={assignment.workerAssignment._id}
                      className="rounded-xl border bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">
                          {assignment.workerAssignment.title || "Untitled Assignment"}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            assignment.rejected
                              ? "bg-red-100 text-red-700"
                              : assignment.submitted &&
                                assignment.workerAssignment.submitBefore &&
                                new Date(assignment.workerAssignment.submitBefore).getTime() <
                                  Date.now()
                              ? "bg-orange-100 text-orange-700"
                              : !assignment.submitted &&
                                assignment.workerAssignment.submitBefore &&
                                new Date(assignment.workerAssignment.submitBefore).getTime() <
                                  Date.now()
                              ? "bg-red-100 text-red-700"
                              : assignment.submitted
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {assignment.rejected
                            ? "Rejected"
                            : assignment.submitted &&
                              assignment.workerAssignment.submitBefore &&
                              new Date(assignment.workerAssignment.submitBefore).getTime() <
                                Date.now()
                            ? "Submitted Late"
                            : !assignment.submitted &&
                              assignment.workerAssignment.submitBefore &&
                              new Date(assignment.workerAssignment.submitBefore).getTime() <
                                Date.now()
                            ? "Late"
                            : assignment.submitted
                            ? "Submitted"
                            : "Not Submitted"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {assignment.workerAssignment.description || "No description provided."}
                      </p>

                      <div className="mt-6 space-y-3 text-sm">
                        {assignment.workerAssignment.employerId && (
                          <div>
                            <span className="font-medium">Assigned by:</span>{" "}
                            {assignment.workerAssignment.employerId.email}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(assignment.workerAssignment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setRemarks("");
                          setSelectedFiles(null);
                          setIsModalOpen(true);
                          openModal(assignment);
                        }}
                        className="mt-6 w-full rounded-lg bg-black py-2 text-white"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {/* Completed cards */}
              {completedAssignments.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center">
                  <ClipboardList className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-semibold">No submitted assignments</h3>
                  <p className="mt-2 text-muted-foreground">
                    You haven't submitted any assignments yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {completedAssignments.map((assignment) => (
                    <div
                      key={assignment.workerAssignment._id}
                      className="rounded-xl border bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">
                          {assignment.workerAssignment.title || "Untitled Assignment"}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            assignment.rejected // If Rejected
                              ? "bg-red-100 text-red-700"
                              : assignment.completed // If Completed
                              ? "bg-blue-100 text-blue-700"
                              : assignment.submitted && assignment.workerAssignment.submitBefore && // If Submitted but Late
                                  new Date(assignment.workerAssignment.submitBefore).getTime() <
                                    Date.now()
                              ? "bg-orange-100 text-orange-700"
                              : !assignment.submitted && assignment.workerAssignment.submitBefore && // If not submitted and late
                                  new Date(assignment.workerAssignment.submitBefore).getTime() <
                                    Date.now()
                              ? "bg-red-100 text-red-700"
                              : assignment.submitted // If Submitted
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {assignment.rejected // If Rejected
                            ? "Rejected"
                            : assignment.completed // If Completed
                            ? "Completed"
                            : assignment.submitted && assignment.workerAssignment.submitBefore && // If Submitted but Late
                                new Date(assignment.workerAssignment.submitBefore).getTime() <
                                  Date.now()
                            ? "Submitted Late"
                            : !assignment.submitted && assignment.workerAssignment.submitBefore && // If not submitted but late
                                new Date(assignment.workerAssignment.submitBefore).getTime() <
                                  Date.now()
                            ? "Late"
                            : assignment.submitted // If Submitted
                            ? "Submitted"
                            : "Not Submitted"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {assignment.workerAssignment.description || "No description provided."}
                      </p>

                      <div className="mt-6 space-y-3 text-sm">
                        {assignment.workerAssignment.employerId && (
                          <div>
                            <span className="font-medium">Assigned by:</span>{" "}
                            {assignment.workerAssignment.employerId.email}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(assignment.workerAssignment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setRemarks("");
                          setSelectedFiles(null);
                          setIsModalOpen(true);
                          openModal(assignment);
                        }}
                        className="mt-6 w-full rounded-lg bg-black py-2 text-white"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

      {isModalOpen && selectedAssignment && (
        // Source: https://stackoverflow.com/questions/450903/how-can-i-make-a-div-not-larger-than-its-contents
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="inline-block">
            <DialogHeader>
              <DialogTitle>
                <h2 className="text-xl font-bold">
                  {selectedAssignment.workerAssignment.title}
                </h2>
              </DialogTitle>
            </DialogHeader>

            <p className="mt-2 text-sm text-gray-600">
              {selectedAssignment.workerAssignment.description}
            </p>

            {activeTab === "assignments" ? (
              <div>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">
                    Remarks
                  </label>

                  <Textarea
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">
                    Upload File
                  </label>

                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setSelectedFiles(Array.from(e.target.files ?? []))
                    }
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancel
                  </button>

                  {activeTab === "assignments" ? (
                    <button
                      onClick={handleSubmit}
                      className="rounded-lg bg-black px-4 py-2 text-white"
                    >
                      Add files
                    </button>
                  ) : <div></div>}
                </div>
              </div>
            ) : (
              <div></div>
            )}

            {submittedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 font-semibold">Previous Submissions</h3>

                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  {submittedFiles.map((submitted) => (
                    <div
                      key={submitted._id}
                      className="border-b p-3 last:border-b-0"
                    >
                      <div className="flex justify-between items-start"> 
                        <p className="text-sm">
                          <strong>Remarks:</strong> {submitted.workerDescription}
                        </p>

                        {activeTab === "assignments" ? <button onClick={() => removeFile(submitted._id)}>
                          X
                        </button> : <div></div>}
                      </div>

                      <br />
                      <strong>Links:</strong>

                      {activeTab === "assignments" ? (
                        <button
                          type="button"
                          onClick={() => handleAddNewFilesClick(submitted)}
                          disabled={addingNewFiles}
                          className="rounded-md bg-black px-3 py-2 ml-2 text-sm text-white transition hover:bg-neutral-800 disabled:opacity-50"
                        >
                          {addingNewFiles ? "Adding..." : "Add New Files"}
                        </button>
                      ) : <div></div>}

                      {submitted.workerUpload.map((workerUpload) => (
                        <div
                          key={workerUpload.name}
                          className="mt-2 flex items-center gap-2"
                        >
                          <a
                            href={`http://localhost:8920/uploads/workerJobsCompleted/${workerUpload.name}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block h-10 min-w-0 flex-1 truncate rounded-md bg-gray-100 px-3 py-2 text-sm text-blue-600 underline transition-colors hover:bg-gray-200 hover:text-blue-800"
                          >
                            {workerUpload.name}
                          </a>

                          {activeTab === "assignments" ? (
                            <button
                              type="button"
                              onClick={() => removeFileFromJobCompleted(workerUpload.name, submitted._id)}
                              className="h-10 w-10 rounded-md bg-red-100 text-red-600 transition-colors hover:bg-red-200 hover:text-red-800"
                            >
                              X
                            </button>
                          ) : <div />}
                        </div>
                      ))}

                      <input
                        ref={newFilesInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(Event) => handleAddNewFiles(Event, jobCompleted)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to submit the assignment?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => handleAssignmentSubmit(assignmentId, employerId, employerEmail)}>Submit Assignment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* {isModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold">
              {selectedAssignment.workerAssignment.title}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {selectedAssignment.workerAssignment.description}
            </p>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium">
                Remarks
              </label>

              <textarea
                className="w-full rounded-lg border p-3"
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium">
                Upload File
              </label>

              <input
                type="file"
                multiple
                onChange={(e) =>
                  setSelectedFiles(Array.from(e.target.files ?? []))
                }
              />
            </div>

            {submittedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 font-semibold">Previous Submissions</h3>

                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  {submittedFiles.map((submission) => (
                    <div
                      key={submission._id}
                      className="border-b p-3 last:border-b-0"
                    >
                      <div className="flex justify-between items-start"> 
                        <p className="text-sm">
                          <strong>Remarks:</strong> {submission.workerDescription}
                        </p>

                        {activeTab === "assignments" ? <button onClick={() => removeFile(submission._id)}>
                          X
                        </button> : <div></div>}
                      </div>

                      <br />
                      <strong>Links:</strong>

                      {activeTab === "assignments" ? (
                        <button
                          type="button"
                          onClick={() => handleAddNewFilesClick(submission)}
                          disabled={addingNewFiles}
                          className="rounded-md bg-black px-3 py-2 ml-2 text-sm text-white transition hover:bg-neutral-800 disabled:opacity-50"
                        >
                          {addingNewFiles ? "Adding..." : "Add New Files"}
                        </button>
                      ) : <div></div>}
                      

                      <input
                        ref={newFilesInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(Event) => handleAddNewFiles(Event, jobCompleted)}
                      />

                      {submission.workerUpload.map((workerUpload) => (
                        <div
                          key={workerUpload.name}
                          className="mt-2 flex items-center gap-2"
                        >
                          <a
                            href={`http://localhost:8920/uploads/workerJobsCompleted/${workerUpload.name}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block h-10 min-w-0 flex-1 truncate rounded-md bg-gray-100 px-3 py-2 text-sm text-blue-600 underline transition-colors hover:bg-gray-200 hover:text-blue-800"
                          >
                            {workerUpload.name}
                          </a>

                          {activeTab === "assignments" ? (
                            <button
                              type="button"
                              onClick={() => removeFileFromJobCompleted(workerUpload.name, submission._id)}
                              className="h-10 w-10 rounded-md bg-red-100 text-red-600 transition-colors hover:bg-red-200 hover:text-red-800"
                            >
                              X
                            </button>
                          ) : <div />}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border px-4 py-2"
              >
                Cancel
              </button>

              {activeTab === "assignments" ? (
                <button
                  onClick={handleSubmit}
                  className="rounded-lg bg-black px-4 py-2 text-white"
                >
                  Add files
                </button>
              ) : <div></div>}
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default WorkerAssignment;