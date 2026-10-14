import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EmployerReportModal } from "./ReportWorkerModal";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";

const Reports = () => {
  const queryClient = useQueryClient();

  const updateStatus = async ({
    report,
    status,
    recipientId,
  }: {
    report: string;
    status: string;
    recipientId: string;
  }) => {
    const res = await axios.patch(
      "http://localhost:8920/api/pro/employer/report",
      {
        report,
        status,
        recipientId,
      },
      {
        withCredentials: true,
      }
    );

    return res.data;
  };

  const deleteReport = async ({
    _id,
    type,
  }: {
    _id?: string;
    type: "deleteAll" | "deleteById";
  }) => {
    const res = await axios.delete(
      "http://localhost:8920/api/pro/delete/report",
      {
        data: {
          _id,
          type,
        },
        withCredentials: true,
      }
    );

    return res.data;
  };

  const updateStatusMutation = useMutation({
    mutationFn: updateStatus,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employerReports"],
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: deleteReport,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employerReports"],
      });
    },
  });

  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  
  const [reportOpen, setReportOpen] = useState(false);
  const [reportId, setReportId] = useState("");
  const [reportType, setReportType] = useState("");

  const [description, setDescription] = useState("");
  const [submitEvidence, setEvidence] = useState(null);
  const [Evidences, SetEvidences] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [DeleteContent, setDeleteContent] = useState("")
  const [Id, setId] = useState("No ID specified")



  const fetchReports = async () => {
    const res = await axios.get(
      "http://localhost:8920/api/pro/reports",
      { withCredentials: true }
    );

    return res.data;
  };

  const {
    data,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["employerReports"],
    queryFn: fetchReports,
  });

  if (error) {
    return <p>Failed to load reports.</p>;
  }

  if (isLoading) {
    return <p>Loading reports...</p>;
  }

  const Refetch = refetch()

  const filteredReports = data.reports.filter((report) => {
    const statusMatch =
      statusFilter === "All" ||
      report.status === statusFilter;

    const typeMatch =
      typeFilter === "All" ||
      report.reportType === typeFilter;

    return statusMatch && typeMatch;
  });


  const updateReport = async (reportId: string, reportType: string, description: string, evidences: []) => {
    setReportOpen(true)
    setReportId(reportId)
    setReportType(reportType)
    setDescription(description)
    SetEvidences(evidences)
  }

  const handleSubmit = async (reportId: string, reportType: string, description: string) => {

    await axios.put("http://localhost:8920/api/pro/report", { reportId, reportType, description }, {
      withCredentials: true
    })
      .then(function (response) {
        toast.success("Successfully updated the report.")
        setReportOpen(false)
        refetch()
      })
      .catch(function (error) {
        toast.error("An error has occured.")
      })
  }

  // Only will work if the files were updated from the uploads and the MongoDB:
  const handleEvidences = async (reportId: string, submitEvidence) => {
    let ArraySubmit = []
    for (let SubmitIndex = 0; SubmitIndex < submitEvidence.length; SubmitIndex++) {
      ArraySubmit.push({
        fileName: submitEvidence[SubmitIndex].filename,
        fileType: submitEvidence[SubmitIndex].mimetype
      })
    }
    await axios.put("http://localhost:8920/api/pro/update/evidences", {
      reportId,
      submitEvidence: ArraySubmit
    }, { withCredentials: true })
      .then(function (response) {
        SetEvidences(response.data.ArraySubmit)
        toast.success("Successfully reported worker.", {
          description: "You have successfully reported the worker"
        })

        setEvidence(null);
      })
      .catch(function (error) {
        toast.error(error.response.data.info)
      })
  }

  const handleSubmitReport = async (reportId, SubmitEvidence) => {
    // Source: https://medium.com/@hassaanistic/image-handeling-using-multer-in-react-d7fea28e8dc6
    const formData = new FormData()
    const submittedExpected = SubmitEvidence.length;

    let fullStorage = false;
    let EvidenceArray = []

    for (let submitIndex = 0; submitIndex < SubmitEvidence.length; submitIndex++) {
      formData.append("submitEvidence", SubmitEvidence[submitIndex])

      EvidenceArray.push({
        fileName: SubmitEvidence[submitIndex].filename,
        fileType: SubmitEvidence[submitIndex].mimetype
      })
      
      if (SubmitEvidence[submitIndex].size > 1 * 1024 * 1024) {
        fullStorage = true
      }
    }

    if (fullStorage) {
      toast.error("Some of the files you were sending are too large.")
    } else {

      // Source: https://axios.rest/pages/advanced/error-handling:
      await axios.post("http://localhost:8920/api/pro/report/submit/evidence", formData, {
        withCredentials: true
      })
        .then(function (response) {
          handleEvidences(reportId, response.data.filename)
        })
        .catch(function (error) {
          alert(`Error has occured`)
        })
    }
  }


  // Delete the evidence:
  const DeleteReportX = async (reportId, fileName, fileID) => {
    await axios.delete(`http://localhost:8920/api/pro/delete/report/x/${reportId}/${fileName}/${fileID}`, {
      withCredentials: true
    })
      .then(function (response) {
        let Delete = []

        for (let deleteIndex = 0; deleteIndex < response.data.submitEvidence.length; deleteIndex++) {
          Delete.push({
            _id: response.data.submitEvidence[deleteIndex]._id,
            fileName: response.data.submitEvidence[deleteIndex].fileName,
            fileType: response.data.submitEvidence[deleteIndex].fileType
          })
        }
        SetEvidences(Delete)
        toast.success(response.data.info)
      }).catch(function (error) {
        toast.error(error.response.data.info)
      })
  }

  // Delete Reports:
  const DeleteReports = async () => {
    await axios.delete("http://localhost:8920/api/pro/delete/reports", { withCredentials: true })
      .then(function (response) {
        Refetch
        toast.success(response.data.info)
      })
      .catch(function (error) {
        toast.error("Failed to Delete all Reports")
      })
  }

  // Delete Report:
  const DeleteReport = async (reportId) => {
    await axios.delete(`http://localhost:8920/api/pro/delete/report/${reportId}`, { withCredentials: true })
      .then(function (response) {
        Refetch
        toast.success(response.data.info)
      })
      .catch(function (error) {
        toast.error(error.response.data.info)
      })
  }

  // Confirmation about deleting the reports:
  const DeleteConfirm = async (confirm: boolean, type: string, reportId: string) => {
    if (confirm) {
      if (type === "Delete Report") {
        DeleteReport(reportId)
      } else {
        DeleteReports()
      }

      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-4">

      <div className="flex gap-4 mb-4">

        <select
          className="
            border rounded-md 
            px-3 pr-10 py-2
            bg-background
            cursor-pointer
            appearance-none
            bg-no-repeat
          "
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">
            Under Review
          </option>
          <option value="Resolved">
            Resolved
          </option>
          <option value="Rejected">
            Rejected
          </option>
        </select>


        <select
          className="
            border rounded-md 
            px-3 pr-10 py-2
            bg-background
            cursor-pointer
            appearance-none
            bg-no-repeat
          "
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Fake Resume">
            Fake Resume
          </option>
          <option value="No Work">
            No Work
          </option>
          <option value="Harassment">
            Harassment
          </option>
          <option value="Fraud">
            Fraud
          </option>
          <option value="Other">
            Other
          </option>
        </select>

      </div>


      <button
        onClick={() => {
          setConfirmOpen(true)
          setDeleteContent("Delete All Reports")
        }}
        className="border rounded-md px-4 py-2"
      >
        Delete All Reports
      </button>



      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            No reports submitted.
          </CardContent>
        </Card>
      ) : (
        filteredReports.map((report: any) => (
          <Card key={report._id}>
            <CardHeader>
              <CardTitle>
                {report.reportType}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p>
                <strong>Status: </strong>
                {report.status}
              </p>


              <p className="mb-2">
                <strong>Description: </strong>
                {report.description}
              </p>

              <div>
                <Button className="border rounded-md px-3 py-1 mt-4" onClick={() => updateReport(report._id, report.reportType, report.description, report.submitEvidence)}>Update Report</Button>
                <Button className="border rounded-md px-3 py-1 mt-4 ml-1" onClick={() => {
                  setDeleteContent("Delete Report")
                  setConfirmOpen(true)
                  setId(report._id)
                }}>Delete Report</Button>
              </div>

            </CardContent>
          </Card>
        ))
      )}

      <Dialog
        open={reportOpen}
        onOpenChange={setReportOpen}
          >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      
              <DialogHeader>
                <DialogTitle>
                  Report Employer
                </DialogTitle>
              </DialogHeader>
      
      
              <div className="space-y-4">
      
                <Select
                  defaultValue={reportType !== "Fake Resume" && reportType !== "No Work" && reportType !== "Harassment" && reportType !== "Fraud" ? "Others" : reportType}
                  onValueChange={setReportType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
      
                  <SelectContent>
                    <SelectItem value="Fake Resume">Fake Resume</SelectItem>
                    <SelectItem value="No Work">No Work</SelectItem>
                    <SelectItem value="Harassment">Harassment</SelectItem>
                    <SelectItem value="Fraud">Fraud</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
      
                {reportType !== "Fake Resume" && reportType !== "No Work" && reportType !== "Harassment" && reportType !== "Fraud" ? (
                  <Input
                    placeholder={"Enter Report"}
                    defaultValue={reportType === "Others" ? "" : reportType}
                    onChange={(Event) => setReportType(Event.target.value)}
                  />
                ) : (
                  <div></div>
                )}
      
                <Textarea
                  placeholder="Explain the issue..."
                  defaultValue={description}
                  onChange={(Event) => setDescription(Event.target.value)}
                />

                {/* https://phppot.com/react/multi-file-upload-in-react-js/ */}

                {/** // Source - https://stackoverflow.com/a/67325576 */}
                {/* // Posted by buzatto
// Retrieved 2026-09-28, License - CC BY-SA 4.0 */}
                <Input 
                  type="file"
                  onChange={(Event) => {
                    setEvidence(Event.target.files)
                    handleSubmitReport(reportId, Event.target.files)
                  }}
                  multiple
                />


                {/** Sa line na ito, ang nangyayari is parang if marami kang nagsusubmit ng file, eh di, ang result is yung list ay nagtatake over ng buong screen */}
                {Evidences !== null ? Evidences.map((evidence) => {
                  return (
                    <div
                      key={evidence.name}
                      className="mt-2 flex items-center gap-2"
                    >
                      <a
                        href={`http://localhost:8920/uploads/reports/${evidence.fileName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-10 min-w-0 flex-1 truncate rounded-md bg-gray-100 px-3 py-2 text-sm text-blue-600 underline transition-colors hover:bg-gray-200 hover:text-blue-800"
                      >
                        {evidence.fileName.split("_x24-0025-30-0000x41")[1]}
                      </a>

                      {/** Wala pa ang delete function, ibig sabihin pag napindot mo ito, hindi siya magdedelete, kaya dapat meron siyang attribute na onClick={deleteReport(evidence.fileName)} */}
                      <button
                        type="button"
                        className="h-10 w-10 rounded-md bg-red-100 text-red-600 transition-colors hover:bg-red-200 hover:text-red-800"
                        onClick={() => DeleteReportX(reportId, evidence.fileName, evidence._id)}
                      >
                        X
                      </button>
                    </div>
                  )
                }) : <div>No evidences</div>}
      
      
                <Button
                  className="w-full"
                  onClick={() => handleSubmit(reportId, reportType, description)}
                >
                  Submit Changes
                </Button>
      
              </div>
      
            </DialogContent>
          </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to proceed with this action?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => DeleteConfirm(true, DeleteContent, Id)}>{DeleteContent}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;