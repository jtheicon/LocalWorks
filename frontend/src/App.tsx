import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

const Index = lazy(() => import("./pages/Index"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Login = lazy(() => import("./pages/Login"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const FindJobs = lazy(() => import("./pages/FindJobs"));
const FindWorkers = lazy(() => import("./pages/FindWorkers"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Images = lazy(() => import("./pages/Images"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const EmployerProfile = lazy(() => import("./components/employer/EmployerProfile"));
const NumberEmployees = lazy(() => import("./pages/NumberEmployees"));
const OpenPositions = lazy(() => import("./pages/OpenPositions"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const ReactivationRequest = lazy(() => import("./pages/ReactivationRequest"));
const WorkerLayout = lazy(() => import("./components/worker/WorkerLayout"));
const EmployerLayout = lazy(() => import("./components/employer/EmployerLayout"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={null}>
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
            <Route path="/account/reactivation/request" element={<ReactivationRequest />} />
            <Route element={<WorkerLayout />}>
              <Route path="/worker-dashboard" element={<WorkerDashboard />} />
            </Route>
            <Route element={<AdminLayout />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;