import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WorkerSignUpForm from "./auth/WorkerSignUpForm";
import EmployerSignUpForm from "./auth/EmployerSignUpForm";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

const SignUpModal = ({ open, onOpenChange, onSwitchToLogin, onSuccess }: SignUpModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Join LocalWorks</DialogTitle>
          <DialogDescription className="text-base">
            Create your account to get started
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="worker" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="worker" className="gap-2">
              <User className="w-4 h-4" />
              Worker
            </TabsTrigger>
            <TabsTrigger value="employer" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Employer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="worker">
            <WorkerSignUpForm onClose={() => {
              onOpenChange(false);
              onSuccess?.();
            }} />
          </TabsContent>

          <TabsContent value="employer">
            <EmployerSignUpForm onClose={() => {
              onOpenChange(false);
              onSuccess?.();
            }} />
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-2">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary hover:underline font-medium"
          >
            Log in
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpModal;
