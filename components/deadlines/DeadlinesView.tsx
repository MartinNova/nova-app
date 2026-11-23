"use client";

import {
  BellRing,
  CalendarPlus,
  CircleCheck,
  ExternalLink,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { useToast } from "@/components/ui/Toast";
import { NETPA_FINANCE_URL } from "@/data/deadlines";
import {
  daysUntil,
  deadlinesToIcs,
  relativeDay,
  splitDeadlines,
  urgency,
  type Urgency,
} from "@/lib/deadlines/deadlines";
import { planFromRows, totalPaid } from "@/lib/deadlines/netpa";
import { readCsvRows, readXlsxRows } from "@/lib/deadlines/xlsx";
import { paymentService } from "@/lib/services/payments.service";
import { formatDay, todayInLisbon } from "@/lib/timetable/dates";
import type { Deadline, PaymentPlan } from "@/types/deadlines";

const TONE: Record<Urgency, "bad" | "medium" | "neutral"> = {
  past: "neutral",
  urgent: "bad",
  soon: "medium",
  later: "neutral",
};

const linkClass =
  "border-border bg-surface hover:border-brand inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium";

const noSubscription = () => () => {};

/** 3650 -> "€3,650", 1.5 -> "€1.50". */
const formatEur = (amount: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
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
  const amount = deadline.amountEur;
  const paid = deadline.paidEur ?? 0;
  const done = amount !== undefined && paid >= amount;
  const overdue = level === "past" && !done;
  return (
    <li className="border-border flex items-center gap-3 border-b py-3 last:border-0">
      <div className="bg-brand/10 text-brand flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 leading-tight">
        <span className="text-lg font-bold">{formatDay(deadline.date, { day: "numeric" })}</span>
        <span className="text-xs">{formatDay(deadline.date, { month: "short" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done && level === "past" ? "text-muted" : ""}`}>
          {deadline.title}
        </p>
        {amount !== undefined &&
          (done ? (
            // What you paid, and when the payment came in.
            <p className="flex items-center gap-1 text-sm font-medium text-[#248a3d] dark:text-[#30d158]">
              <CircleCheck className="size-4 shrink-0" aria-hidden />
              Paid {formatEur(amount)}
              {deadline.paidOn && (
                <span className="text-muted font-normal">
                  {" "}
                  ·{" "}
                  {formatDay(deadline.paidOn, { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm font-medium">
              {formatEur(amount - paid)}
              {paid > 0 && (
                <span className="text-muted font-normal"> left · {formatEur(paid)} paid</span>
              )}
            </p>
          ))}
        <p className="text-muted truncate text-sm">
          {[deadline.note, formatDay(deadline.date, { year: "numeric" })]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {level === "past" ? (
        overdue ? (
          <Badge tone="bad">Overdue</Badge>
        ) : (
          <Badge>Past</Badge>
        )
      ) : done ? (
        <Badge tone="good">Paid</Badge>
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

/** Reads the picked file (Excel or CSV export from netPA) into a payment plan. */
async function planFromFile(file: File): Promise<PaymentPlan> {
  const rows = /\.csv$/i.test(file.name)
    ? readCsvRows(await file.text())
    : await readXlsxRows(await file.arrayBuffer());
  return planFromRows(rows, file.name, new Date());
}

/**
 * Your tuition instalments and fees with countdowns and calendar reminders. Payment plans
 * differ per student, so everyone imports their own netPA export (like calendars in the
 * timetable); payments in it show which due dates are paid.
 */
export function DeadlinesView() {
  // Today is only known in the browser: the page is prerendered at build time.
  const today = useSyncExternalStore(noSubscription, todayInLisbon, () => null);
  const { user, ready } = useCurrentUser();
  const toast = useToast();
  const [showPast, setShowPast] = useState(false);
  const [loaded, setLoaded] = useState<{ userId: string; plan: PaymentPlan | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const userKey = user?.id ?? "guest";

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    paymentService
      .load()
      .catch(() => null)
      .then((plan) => !cancelled && setLoaded({ userId: userKey, plan }));
    return () => {
      cancelled = true;
    };
  }, [ready, userKey]);

  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const plan = await paymentService.save(await planFromFile(file));
      setLoaded({ userId: userKey, plan });
      toast(`Imported ${plan!.deadlines.length} due dates`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  async function removePlan() {
    if (!window.confirm("Remove your imported payment plan from the app?")) return;
    setBusy(true);
    try {
      await paymentService.save(null);
      setLoaded({ userId: userKey, plan: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove it.");
    } finally {
      setBusy(false);
    }
  }

  const plan = loaded?.userId === userKey ? loaded.plan : undefined;
  if (!today || plan === undefined) {
    return <div className="bg-border h-64 animate-pulse rounded-2xl" />;
  }

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
      className="sr-only"
      onChange={(e) => {
        void importFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
  const errorLine = error && (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      {error}
    </p>
  );

  if (!plan) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <p className="flex items-center gap-1.5 font-semibold">
            <FileSpreadsheet className="text-brand size-5" aria-hidden /> Import your payment plan
          </p>
          <p className="text-muted mt-1 text-sm">
            Payment plans differ per student, so the app uses yours. Due dates become your countdown
            and reminders, and your payments show what is already paid.
          </p>
          <p className="mt-3 text-sm font-medium">Get the file from netPA</p>
          <ol className="text-muted mt-1 list-decimal space-y-1 pl-5 text-sm">
            <li>
              Open <strong>Bursary</strong> in the top bar
            </li>
            <li>
              Choose <strong>Payment Plans</strong>
            </li>
            <li>
              Click <strong>Financial Transactions</strong> on the left
            </li>
            <li>
              Click <strong>Export</strong> (.XLS) and import that file here
            </li>
          </ol>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload className="size-4" aria-hidden /> {busy ? "Importing…" : "Import Excel file"}
            </Button>
            <a href={NETPA_FINANCE_URL} target="_blank" rel="noreferrer" className={linkClass}>
              <ExternalLink className="size-4" aria-hidden /> Open netPA
            </a>
          </div>
          {picker}
        </Card>
        {errorLine}
        <p className="text-muted text-xs">
          Only you can see your payment plan. Excel (.xlsx) and CSV work.
        </p>
      </div>
    );
  }

  const { upcoming, past } = splitDeadlines(plan.deadlines, today);
  const open = upcoming.filter(
    (d) => !(d.amountEur !== undefined && (d.paidEur ?? 0) >= d.amountEur),
  );
  const next = open[0];
  const nextLeft = next?.amountEur !== undefined ? next.amountEur - (next.paidEur ?? 0) : undefined;
  const paidTotal = totalPaid(plan.payments);

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
          {nextLeft !== undefined && (
            <p className="mt-1">
              Amount: <span className="font-semibold">{formatEur(nextLeft)}</span>
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={() => downloadIcs(open, "nova-payment-deadlines.ics")}>
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
          <p className="font-semibold">Nothing left to pay</p>
          <p className="text-muted mt-1 text-sm">Every due date in your plan is paid.</p>
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
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => setShowPast((v) => !v)}
              className="text-muted hover:text-foreground text-left text-sm font-medium"
              aria-expanded={showPast}
            >
              {showPast ? "Hide" : "Show"} past due dates ({past.length})
            </button>
            {paidTotal > 0 && (
              <span className="text-sm whitespace-nowrap">
                <span className="text-muted">Paid so far </span>
                <span className="font-semibold tabular-nums">{formatEur(paidTotal)}</span>
              </span>
            )}
          </div>
          {showPast && (
            <ul className="mt-1">
              {past.map((d) => (
                <DeadlineRow key={d.id} deadline={d} today={today} />
              ))}
            </ul>
          )}
        </Card>
      )}

      {errorLine}
      <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          From {plan.fileName}, imported{" "}
          {formatDay(plan.importedAt.slice(0, 10), {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          . Only you can see it.
        </span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="text-brand font-medium"
        >
          {busy ? "Importing…" : "Import newer file"}
        </button>
        <button
          type="button"
          onClick={() => void removePlan()}
          disabled={busy}
          className="font-medium text-red-700 dark:text-red-400"
        >
          Remove
        </button>
        {picker}
      </div>
    </div>
  );
}
