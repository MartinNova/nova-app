import type { Metadata } from "next";
import { DeadlinesView } from "@/components/deadlines/DeadlinesView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Payment deadlines" };

export default function DeadlinesPage() {
  return (
    <>
      <PageHeader
        title="Payment deadlines"
        subtitle="Never miss a tuition instalment again."
        backHref="/study"
      />
      <DeadlinesView />
    </>
  );
}
