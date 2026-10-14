import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import WorkerDashboard from "./pages/WorkerDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import FindJobs from "./pages/FindJobs";
import FindWorkers from "./pages/FindWorkers";
import NotFound from "./pages/NotFound";
import Images from "./pages/Images";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import EmployerProfile from "./components/employer/EmployerProfile";
import NumberEmployees from "./pages/NumberEmployees";
import OpenPositions from "./pages/OpenPositions";
import AdminLayout from "./components/admin/AdminLayout";
import WorkerLayout from "./components/worker/WorkerLayout";
import EmployerLayout from "./components/employer/EmployerLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/find-jobs" element={<FindJobs />} />
          <Route path="/find-workers" element={<FindWorkers />} />
          <Route element={<EmployerLayout />}>
            <Route path="/employer-dashboard" element={<EmployerDashboard />} />
          </Route>
          <Route path="/employer-profile" element={<EmployerProfile />} />
          <Route path="/open-positions" element={<OpenPositions />} />
          <Route path="/total-applications" element={<NumberEmployees />} />
          <Route path="/images" element={<Images />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route element={<WorkerLayout />}>
            <Route path="/worker-dashboard" element={<WorkerDashboard />} />
          </Route>
          <Route element={<AdminLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;