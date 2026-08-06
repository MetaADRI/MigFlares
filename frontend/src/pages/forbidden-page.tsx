import { ShieldX } from "lucide-react";
import { ErrorPage } from "@/components/common/error-page";

export default function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      description="You don't have permission to view this page. If you believe this is a mistake, ask your administrator to update your role."
      icon={ShieldX}
    />
  );
}
