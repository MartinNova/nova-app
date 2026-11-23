import { CalendarDays } from "lucide-react";
import { GroupedList, InfoRow, ListRow } from "@/components/ui/GroupedList";
import { availabilityRows } from "@/lib/profile/availability";
import type { Profile } from "@/types/profile";

const ICON = "size-[18px]";

interface AvailabilityListProps {
  profile: Pick<Profile, "availability">;
  /** Your own profile: shows a shortcut to Settings when nothing is set yet. */
  isMe?: boolean;
}

/**
 * "Usually free": the time windows set in Settings, one row per day (days in a row with the
 * same times share a row), as an iOS grouped list.
 */
export function AvailabilityList({ profile, isMe = false }: AvailabilityListProps) {
  const rows = availabilityRows(profile.availability);

  if (rows.length === 0) {
    if (!isMe) return null;
    return (
      <GroupedList title="Usually free">
        <ListRow
          href="/settings"
          tone="sport"
          icon={<CalendarDays className={ICON} strokeWidth={2} aria-hidden />}
          title="Add when you're free"
          subtitle="Helps others plan a game or a run with you."
        />
      </GroupedList>
    );
  }

  return (
    <GroupedList title="Usually free">
      {rows.map((row) => (
        <InfoRow
          key={row.days}
          tone="sport"
          icon={<CalendarDays className={ICON} strokeWidth={2} aria-hidden />}
          title={row.days}
          detail={row.times}
        />
      ))}
    </GroupedList>
  );
}
