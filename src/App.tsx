import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CredentialAuthProvider } from "@/hooks/useCredentialAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import SingleValidation from "./pages/dashboard/SingleValidation";
import BulkValidation from "./pages/dashboard/BulkValidation";
import RecentValidations from "./pages/dashboard/RecentValidations";
import ProfilePage from "./pages/dashboard/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CredentialAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="validate" element={<SingleValidation />} />
              <Route path="bulk" element={<BulkValidation />} />
              <Route path="history" element={<RecentValidations />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CredentialAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
