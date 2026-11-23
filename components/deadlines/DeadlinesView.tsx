"use client";

import { BellRing, CalendarPlus, ExternalLink } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { NETPA_FINANCE_URL, PAYMENT_DEADLINES } from "@/data/deadlines";
import {
  daysUntil,
  deadlinesToIcs,
  relativeDay,
  splitDeadlines,
  urgency,
  type Urgency,
} from "@/lib/deadlines/deadlines";
import { formatDay, todayInLisbon } from "@/lib/timetable/dates";
import type { Deadline } from "@/types/deadlines";

const TONE: Record<Urgency, "bad" | "medium" | "neutral"> = {
  past: "neutral",
  urgent: "bad",
  soon: "medium",
  later: "neutral",
};

const linkClass =
  "border-border bg-surface hover:border-brand inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium";

const noSubscription = () => () => {};

/** 3650 -> "€3,650". */
const formatEur = (amount: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);

/** Downloads an .ics file; phones offer to add the events (with reminders) to the calendar. */
function downloadIcs(deadlines: Deadline[], fileName: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const blob = new Blob([deadlinesToIcs(deadlines, stamp, NETPA_FINANCE_URL)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DeadlineRow({ deadline, today }: { deadline: Deadline; today: string }) {
  const level = urgency(deadline.date, today);
  return (
    <li className="border-border flex items-center gap-3 border-b py-3 last:border-0">
      <div className="bg-brand/10 text-brand flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 leading-tight">
        <span className="text-lg font-bold">{formatDay(deadline.date, { day: "numeric" })}</span>
        <span className="text-xs uppercase">{formatDay(deadline.date, { month: "short" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${level === "past" ? "text-muted" : ""}`}>{deadline.title}</p>
        {deadline.amountEur !== undefined && level !== "past" && (
          <p className="text-sm font-medium">{formatEur(deadline.amountEur)}</p>
        )}
        <p className="text-muted truncate text-sm">
          {[deadline.note, formatDay(deadline.date, { year: "numeric" })]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {level === "past" ? (
        <Badge>Past</Badge>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={TONE[level]}>{relativeDay(deadline.date, today)}</Badge>
          <button
            type="button"
            onClick={() => downloadIcs([deadline], `${deadline.id}.ics`)}
            className="text-muted hover:text-brand rounded-lg p-2"
            aria-label={`Add ${deadline.title} to calendar`}
            title="Add to calendar"
          >
            <CalendarPlus className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}

/** Tuition instalments and fees from netPA with countdowns and calendar reminders. */
export function DeadlinesView() {
  // Today is only known in the browser: the page is prerendered at build time.
  const today = useSyncExternalStore(noSubscription, todayInLisbon, () => null);
  const [showPast, setShowPast] = useState(false);

  if (!today) return <div className="bg-border h-64 animate-pulse rounded-2xl" />;

  const { upcoming, past } = splitDeadlines(PAYMENT_DEADLINES, today);
  const next = upcoming[0];

  return (
    <div className="grid grid-cols-1 gap-4">
      {next ? (
        <Card className="border-brand/40 bg-brand/5">
          <p className="text-muted flex items-center gap-1.5 text-sm font-medium">
            <BellRing className="text-brand size-4" aria-hidden /> Next payment
          </p>
          <p className="mt-1 text-xl font-bold">{next.title}</p>
          {daysUntil(next.date, today) > 1 && (
            <p className="text-brand mt-2 text-5xl leading-none font-bold tracking-tight">
              <CountUp value={daysUntil(next.date, today)} />
              <span className="text-muted ml-2 text-lg font-semibold tracking-normal">
                days to go
              </span>
            </p>
          )}
          <p className="mt-2">
            Due {formatDay(next.date, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            <span className="font-semibold">{relativeDay(next.date, today)}</span>
          </p>
          {next.amountEur !== undefined && (
            <p className="mt-1">
              Amount: <span className="font-semibold">{formatEur(next.amountEur)}</span>
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={() => downloadIcs(upcoming, "nova-payment-deadlines.ics")}>
              <CalendarPlus className="size-4" aria-hidden /> Add all reminders to calendar
            </Button>
            <a href={NETPA_FINANCE_URL} target="_blank" rel="noreferrer" className={linkClass}>
              <ExternalLink className="size-4" aria-hidden /> Check &amp; pay in netPA
            </a>
          </div>
          <p className="text-muted mt-3 text-xs">
            Your calendar reminds you a week before and the day before each due date.
          </p>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="font-semibold">No upcoming payments</p>
          <p className="text-muted mt-1 text-sm">All known due dates are in the past.</p>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card>
          <h2 className="font-semibold">Upcoming</h2>
          <ul>
            {upcoming.map((d) => (
              <DeadlineRow key={d.id} deadline={d} today={today} />
            ))}
          </ul>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="text-muted hover:text-foreground w-full text-left text-sm font-medium"
            aria-expanded={showPast}
          >
            {showPast ? "Hide" : "Show"} past due dates ({past.length})
          </button>
          {showPast && (
            <ul className="mt-1">
              {past.map((d) => (
                <DeadlineRow key={d.id} deadline={d} today={today} />
              ))}
            </ul>
          )}
        </Card>
      )}

      <p className="text-muted text-xs">
        Due dates from netPA (Masters, 2026/27). Amounts may differ per student, so check yours in
        netPA. Nothing about your payments is stored in this app.
      </p>
    </div>
  );
}
