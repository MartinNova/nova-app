import type { Metadata } from "next";
import { NewAtNova } from "@/components/study/NewAtNova";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "New at Nova" };

export default function NewAtNovaPage() {
  return (
    <>
      <PageHeader
        title="New at Nova"
        subtitle="Links, contacts and clubs for your first weeks."
        backHref="/study"
      />
      <NewAtNova />
    </>
  );
}
