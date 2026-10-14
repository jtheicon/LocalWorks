import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Briefcase, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [workerCredentials, setWorkerCredentials] = useState({ email: "", password: "" });
  const [employerCredentials, setEmployerCredentials] = useState({ email: "", password: "" });

  const handleWorkerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Worker login:", workerCredentials);
    navigate("/worker-dashboard");
  };

  const handleEmployerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Employer login:", employerCredentials);
    navigate("/employer-dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-lg">
              Log in to your LocalWorks account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="worker" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="worker" className="gap-2">
                  <User className="w-4 h-4" />
                  Worker
                </TabsTrigger>
                <TabsTrigger value="employer" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employer
                </TabsTrigger>
              </TabsList>

              {/* Worker Login */}
              <TabsContent value="worker">
                <form onSubmit={handleWorkerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="worker-email">Email</Label>
                    <Input
                      id="worker-email"
                      type="email"
                      placeholder="john@example.com"
                      value={workerCredentials.email}
                      onChange={(e) => setWorkerCredentials(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-password">Password</Label>
                    <Input
                      id="worker-password"
                      type="password"
                      placeholder="••••••••"
                      value={workerCredentials.password}
                      onChange={(e) => setWorkerCredentials(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Login as Worker
                  </Button>
                </form>
              </TabsContent>

              {/* Employer Login */}
              <TabsContent value="employer">
                <form onSubmit={handleEmployerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer-email">Email</Label>
                    <Input
                      id="employer-email"
                      type="email"
                      placeholder="jane@company.com"
                      value={employerCredentials.email}
                      onChange={(e) => setEmployerCredentials(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employer-password">Password</Label>
                    <Input
                      id="employer-password"
                      type="password"
                      placeholder="••••••••"
                      value={employerCredentials.password}
                      onChange={(e) => setEmployerCredentials(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    Login as Employer
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
