import { useEffect, useState } from "react";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

import { Button } from "../ui/button";

interface Worker {
  _id: string;
  name: string;
  email: string;
}

import { toast } from "sonner";

import { Input } from "../ui/input";

import { Textarea } from "../ui/textarea";

const CreateAssignmentModal = ({
  open,
  onOpenChange,
  onSuccess,
}: Props) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitBefore, setSubmitBefore] = useState("");

  const [rejectLate, setRejectLate] = useState(false);

  const fetchWorkers = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8920/api/pro/viewWorkers",
        {
          withCredentials: true,
        }
      );

      setWorkers(res.data.workers);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchWorkers();
    }
  }, [open]);

  const createAssignment = async () => {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }

    if (!submitBefore) {
      toast.error("Please select a submit before date.");
      return;
    }

    if (selectedWorkers.length === 0) {
      toast.error("Please select at least one worker.");
      return;
    }

    let workers = []

    for (let index = 0; index < selectedWorkers.length; index++) {
      workers.push({ _id: selectedWorkers[index] })
    }

    try {
      const res = await axios.post(
        "http://localhost:8920/api/pro/worker/assignment",
        {
          targetWorkers: workers,
          title,
          description,
          submitBefore,
          rejectLate
        },
        {
          withCredentials: true,
        }
      );

      toast.success(res.data.message);
      onSuccess();
    } catch (err: any) {
      alert(submitBefore)
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.info ||
        err.response?.data?.error ||
        "Something went wrong."
      );
    }
  };

  const filteredWorkers = workers.filter(
    (worker) =>
      worker.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedWorkers.includes(worker._id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Assignment Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder="Description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">
              Submit Before
            </label>

            <Input
              type="datetime-local"
              value={submitBefore}
              onChange={(e) => setSubmitBefore(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Assign Workers
            </label>

            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedWorkers.map((id) => {
                  const worker = workers.find((w) => w._id === id);

                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full bg-gray-200 px-3 py-1"
                    >
                      <span>{worker?.name}</span>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedWorkers((prev) =>
                            prev.filter((workerId) => workerId !== id)
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                <Input
                  placeholder="Search workers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {search && filteredWorkers.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded border">
                  {filteredWorkers.map((worker) => (
                    <button
                      key={worker._id}
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-gray-100"
                      onClick={() => {
                        setSelectedWorkers((prev) => [
                          ...prev,
                          worker._id,
                        ]);
                        setSearch("");
                      }}
                    >
                      <div>{worker.name}</div>
                      <div className="text-xs text-gray-500">
                        {worker.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rejectLate"
              checked={rejectLate}
              onChange={(e) => setRejectLate(e.target.checked)}
            />

            <label htmlFor="rejectLate" className="text-sm font-medium">
              Reject late submissions
            </label>
          </div>

          <button
            onClick={createAssignment}
            className="w-full rounded-md bg-black p-2 text-white"
          >
            Create Assignment
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAssignmentModal;