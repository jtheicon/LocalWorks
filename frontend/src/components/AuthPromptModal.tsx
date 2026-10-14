import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LogIn, UserPlus } from "lucide-react";

interface AuthPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
  onSignUp: () => void;
  action?: "apply" | "hire";
}

const AuthPromptModal = ({ 
  open, 
  onOpenChange, 
  onLogin, 
  onSignUp,
  action = "apply"
}: AuthPromptModalProps) => {
  const isApply = action === "apply";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">
            {isApply ? "Ready to Apply?" : "Ready to Hire?"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isApply 
              ? "Create an account or log in to apply for this job"
              : "Create an account or log in to hire this worker"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            size="lg" 
            onClick={onSignUp}
            className="gap-2 py-6"
          >
            <UserPlus className="w-5 h-5" />
            Create an Account
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>
          
          <Button 
            size="lg" 
            variant="outline"
            onClick={onLogin}
            className="gap-2 py-6"
          >
            <LogIn className="w-5 h-5" />
            I Already Have an Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthPromptModal;
