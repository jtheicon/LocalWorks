import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkerSignUpForm from "@/components/auth/WorkerSignUpForm";
import EmployerSignUpForm from "@/components/auth/EmployerSignUpForm";

const SignUp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Create Your Account</CardTitle>
            <CardDescription className="text-lg">
              Join LocalWorks as a Worker or Employer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="worker" className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="worker" className="gap-2">
                  <User className="h-4 w-4" />
                  Worker
                </TabsTrigger>
                <TabsTrigger value="employer" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="worker">
                <WorkerSignUpForm onClose={() => navigate("/", { replace: true })} />
              </TabsContent>

              <TabsContent value="employer">
                <EmployerSignUpForm onClose={() => navigate("/", { replace: true })} />
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
