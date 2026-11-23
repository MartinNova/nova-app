import type { Metadata } from "next";
import { TimetableView } from "@/components/timetable/TimetableView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Timetable" };

export default function TimetablePage() {
  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle="Lectures, exams, deadlines and holidays."
        backHref="/study"
      />
      <TimetableView />
    </>
  );
}
