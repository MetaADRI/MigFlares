import { Clock3 } from "lucide-react";
import { ErrorPage } from "@/components/common/error-page";

export default function SessionExpiredPage() {
  return (
    <ErrorPage
      code="Expired"
      title="Session timed out"
      description="For your security, your session ended after a period of inactivity. Sign back in to continue where you left off."
      icon={Clock3}
      action={{ label: "Sign in again", to: "/login" }}
    />
  );
}
