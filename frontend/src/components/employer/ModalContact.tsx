import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase } from "lucide-react";

import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import axios from "axios";



interface PostJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: string;
}

const ModalContact = ({ open, onOpenChange, worker }: PostJobModalProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });

  const PostContact = async () => {
    await axios.post("http://localhost:8920/api/pro/contact", { ...formData, worker }, {
      withCredentials: true
    })
      .then(function (response) {
        if (response.data) {
          toast.success("Successfully Contacted Worker", {
            description: "Successfully Contacted Worker!"
          })
        }
      })
      .catch(function (error) {
        if (error.response) {
          toast.info(error.response.data.message)
        }
      })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title === "") {
      return toast.info("Please enter a title")
    }

    if (formData.description === "") {
      return toast.info("Please enter a description")
    }

    PostContact()
    onOpenChange(false)
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Contact Worker
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to contact worker.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Title *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={formData.title}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the job responsibilities and what you're looking for..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

          <Button onClick={handleSubmit}>Submit</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalContact