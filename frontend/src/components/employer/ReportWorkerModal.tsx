import { useState } from "react";
import axios from "axios";

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


interface ReportWorkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
}





export const EmployerReportModal = (val: { open: boolean, onOpenChange: (open: boolean) => void, reportId: string, reportType: string, description: string }) => {
  const [ReportType, SetReportType] = useState(null)
  const [Description, SetDescription] = useState(null)
  const [OnOpen, OnOpenChange] = useState(true)
  const [Reason, SetReason] = useState(null)

  const [submitEvidence, setEvidence] = useState(null)

  const handleSubmit = async () => {
    await axios.put("http://localhost:8920/api/pro/report", {
      reportId: val.reportId,
      reportType: Reason === null ? ReportType === null ? val.reportType : ReportType : Reason,
      description: Description === null ? val.description : Description
    })
  }

  return (
    <Dialog
      open={OnOpen ? val.open : false}
      onOpenChange={val.onOpenChange}
    >
      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            Report Worker
          </DialogTitle>
        </DialogHeader>


        <div className="space-y-4">

          <Select
            defaultValue={val.reportType !== "Fake Resume" && val.reportType !== "No Work" && val.reportType !== "Harassment" && val.reportType !== "Fraud" ? "Others" : val.reportType}
            onValueChange={SetReportType}
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

          {val.reportType !== "Fake Resume" && val.reportType !== "No Work" && val.reportType !== "Harassment" && val.reportType !== "Fraud" ? (
            <Input
              placeholder={"Enter Report"}
              defaultValue={val.reportType}
              onChange={(Event) => {
                SetReason(Event.target.value)
                SetReportType("Others")
              }}
              className={ReportType === null || ReportType === "Others" ? "display" : "hidden"}
            />
          ) : (
            <Input
              placeholder={"Enter Report"}
              defaultValue={val.reportType}
              onChange={(Event) => {
                SetReason(Event.target.value)
                SetReportType("Others")
              }}
              className={ReportType === null || ReportType !== "Others" ? "hidden" : "display"}
            />
          )}

          <Textarea
            placeholder="Explain the issue..."
            defaultValue={val.description}
            onChange={(Event) => SetDescription(Event.target.value)}
          />

          {/* https://phppot.com/react/multi-file-upload-in-react-js/ */}
          <Input 
            type="file"
            onChange={(Event) => setEvidence(Event.target.files)}
            multiple
          />


          <Button
            className="w-full"
            onClick={handleSubmit}
          >
            Submit Changes
          </Button>

        </div>

      </DialogContent>
    </Dialog>
  );
};


const ReportWorkerModal = ({
  open,
  onOpenChange,
  workerId
}: ReportWorkerModalProps) => {

  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [submitEvidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(false);

  const [otherReason, setOtherReason] = useState("");

  const handleSubmitReport = async () => {
    // Source: https://medium.com/@hassaanistic/image-handeling-using-multer-in-react-d7fea28e8dc6
    const formData = new FormData()
    const submittedExpected = submitEvidence.length;

    let fullStorage = false;
    let EvidenceArray = []

    for (let submitIndex = 0; submitIndex < submitEvidence.length; submitIndex++) {
      formData.append("submitEvidence", submitEvidence[submitIndex])

      EvidenceArray.push({
        fileName: submitEvidence[submitIndex].name,
        fileType: submitEvidence[submitIndex].type
      })
      
      if (submitEvidence[submitIndex].size > 1 * 1024 * 1024) {
        fullStorage = true
      }
    }

    if (fullStorage) {
      toast.error("Some of the files you were sending are too large.")
    } else {
      await axios.post("http://localhost:8920/api/pro/report/submit/evidence", formData, {
        withCredentials: true
      })
        .then(async function (response) {
          let SubmitEvidence = [];
          const submitEvidence = response.data.filename

          for (let submit = 0; submit < submitEvidence.length; submit++) {
            SubmitEvidence.push({
              fileName: submitEvidence[submit].filename,
              fileType: submitEvidence[submit].mimetype
            })
          }

          // Source: https://axios.rest/pages/advanced/error-handling:
          await axios.post("http://localhost:8920/api/pro/report/employer", {
            workerId,
            reportType: reportType === "Others" ? otherReason : reportType,
            description,
            submitEvidence: SubmitEvidence,
            reportCategory: "Default Category"
          }, { withCredentials: true })
                      .then(function (response) {
                        toast.success("Successfully reported employer.", {
                          description: "You have successfully reported the employer"
                        });
          
                        setReportType("");
                        setOtherReason("");
                        setDescription("");
                        setEvidence(null);
          
                        onOpenChange(false);
                      })
            .catch(function (error) {
              console.log(`An error occured`);
            });
        })
        .catch(function (error) {
          toast.error("This didn't work")
        })
    }
  }

  const submitReport = async () => {
    if (!reportType || !description) {
      toast.error("Complete all fields");
      return;
    }

    if (reportType === "Other" && !otherReason.trim()) {
      toast.error("Please specify the reason");
      return;
    }

    try {
      setLoading(true);

      handleSubmitReport()
    } catch (error) {
      toast.error("Failed to submit report");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            Report Worker
          </DialogTitle>
        </DialogHeader>


        <div className="space-y-4">

          <Select
            value={reportType}
            onValueChange={setReportType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="Fake Resume">
                Fake Resume
              </SelectItem>

              <SelectItem value="No Work">
                No Work
              </SelectItem>

              <SelectItem value="Harassment">
                Harassment
              </SelectItem>

              <SelectItem value="Fraud">
                Fraud
              </SelectItem>

              <SelectItem value="Other">
                Other
              </SelectItem>
            </SelectContent>
          </Select>

          {reportType === "Other" && (
            <Input
              placeholder="Enter the reason"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
            />
          )}


          <Textarea
            placeholder="Explain the issue..."
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          {/* https://phppot.com/react/multi-file-upload-in-react-js/ */}
          <Input 
            type="file"
            onChange={(Event) => setEvidence(Event.target.files)}
            multiple
          />
          


          <Button
            className="w-full"
            onClick={submitReport}
            disabled={loading}
          >
            {loading
              ? "Submitting..."
              : "Submit Report"}
          </Button>

        </div>

      </DialogContent>
    </Dialog>
  );
};


export default ReportWorkerModal;