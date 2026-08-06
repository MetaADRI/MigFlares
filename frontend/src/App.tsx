import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { PermissionProvider } from "@/context/permission-context";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <TooltipProvider delayDuration={250}>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
