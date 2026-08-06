import { Wrench } from "lucide-react";
import { ErrorPage } from "@/components/common/error-page";

export default function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      title="Something went wrong"
      description="An unexpected error occurred on our side. Your data is safe — please try again, or contact support if the problem persists."
      icon={Wrench}
    />
  );
}
