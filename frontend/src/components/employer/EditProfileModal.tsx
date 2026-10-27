import { API_ORIGIN } from "@/lib/apiOrigin";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

axios.defaults.withCredentials = true

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileModal = ({ open, onOpenChange }: EditProfileModalProps) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    company: "",
    email: "",
    phone: "",
    industry: "",
    industryTitle: "No Industry Title Provided"
  });

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const ViewProfDetails = async () => {
    const result = await axios.get(
      `${API_ORIGIN}/api/pro/employer/information`,
      { withCredentials: true }
    );

    console.log("RAW RESPONSE", result.data);

    return result.data;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["ViewProfDetails"],
    queryFn: ViewProfDetails,
    enabled: open,
  });
    
  useEffect(() => {
    if (!data?.EmployerProf) return;

    const employer = data.EmployerProf;

    console.log("EmployerProf:", employer);
    console.log("Employer Industry:", employer.industry);
    console.log("Industries:", data.Industries);

    const industryExists = data.Industries?.find(
      (item: any) => item._id === employer.industry._id
    );

    console.log("Found Industry:", industryExists);

    if (industryExists && !industryExists.notAccepted) {
      setFormData({
        company: employer.company?.name ?? employer.company,
        email: employer.email,
        phone: employer.phone,
        industry: industryExists._id,
        industryTitle: "",
      });
    } else {
      setFormData({
        company: employer.company?.name ?? employer.company,
        email: employer.email,
        phone: employer.phone,
        industry: "others",
        industryTitle: employer.industry.title,
      });
    }
  }, [data]);

  const currentProfile = data?.EmployerProf?.profile;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (isLoading) return null;
  if (error) return null;

  const UpdateProf = async () => {
    try {
      // 1. upload photo if exists
      const updateForm = new FormData();

      updateForm.append("company", formData.company);
      updateForm.append("phone", formData.phone);

      if (formData.industry === "others") {
        updateForm.append("industry", "");
        updateForm.append("industryTitle", formData.industryTitle);
      } else {
        updateForm.append("industry", formData.industry);
      }

      if (profilePhoto) {
        updateForm.append("photo", profilePhoto);
      }

      if (permitFile) {
        updateForm.append("permit", permitFile);
      }

      const response = await axios.put(
        `${API_ORIGIN}/api/pro/update/employer`,
        updateForm,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await queryClient.invalidateQueries({
        queryKey: ["ViewProfDetails"]
      });

      await queryClient.invalidateQueries({
        queryKey: ["employer"]
      })

      toast.success(response.data.message, {
        description: "Your Profile has been successfully updated!",
      });

      onOpenChange(false);
    } catch (error: any) {
      if (error.response) {
        toast.info(error.response.data.info);
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    UpdateProf()
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information to help employers find you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="space-y-2">
            <Label htmlFor="photo">Profile Photo</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                if (preview) {
                  URL.revokeObjectURL(preview);
                }

                setProfilePhoto(file);
                setPreview(URL.createObjectURL(file));
              }}
            />

            {/* Existing photo from server */}
            {!preview && currentProfile && (
              <img
                src={`${API_ORIGIN}/uploads/profile/${currentProfile}`}
                className="w-24 h-24 rounded-full object-cover"
                alt=""
              />
            )}
            

            {/* New selected file preview */}
            {preview && (
              <img
                src={preview}
                className="w-24 h-24 rounded-full object-cover"
                alt="preview"
              />
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        industry: value,
                        industryTitle: "No Industry Title Provided"
                      }))
                    }
                  >
                    <SelectTrigger id="industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.Industries?.map((industry: any) => (
                        <SelectItem
                          key={industry._id}
                          value={industry._id}
                        >
                          {industry.title}
                        </SelectItem>
                      ))}

                      <SelectItem value="others">
                        Others
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.industry === "others" && (
                    <div className="space-y-2">
                      <Label>Industry Name</Label>
                      <Input
                        value={formData.industryTitle}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            industryTitle: e.target.value
                          }))
                        }
                        placeholder="Enter industry name"
                      />
                    </div>
                  )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="permit">Business Permit</Label>

              <Input
                id="permit"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setPermitFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          


          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;