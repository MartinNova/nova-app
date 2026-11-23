import { CalendarDays, Clock } from "lucide-react";
import { GroupedList, InfoRow, ListRow } from "@/components/ui/GroupedList";
import { formatAvailabilityDays, formatAvailabilityTimes } from "@/lib/profile/availability";
import type { Profile } from "@/types/profile";

const ICON = "size-[18px]";

interface AvailabilityListProps {
  profile: Pick<Profile, "availabilityDays" | "availabilityTimes">;
  /** Your own profile: shows a shortcut to Settings when nothing is set yet. */
  isMe?: boolean;
}

/** "Usually free": the days and times set in Settings, as an iOS grouped list. */
export function AvailabilityList({ profile, isMe = false }: AvailabilityListProps) {
  const days = formatAvailabilityDays(profile.availabilityDays);
  const times = formatAvailabilityTimes(profile.availabilityTimes);

  if (!days && !times) {
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
      {days && (
        <InfoRow
          tone="sport"
          icon={<CalendarDays className={ICON} strokeWidth={2} aria-hidden />}
          title="Days"
          detail={days}
        />
      )}
      {times && (
        <InfoRow
          tone="ocean"
          icon={<Clock className={ICON} strokeWidth={2} aria-hidden />}
          title="Time of day"
          detail={times}
        />
      )}
    </GroupedList>
  );
}
