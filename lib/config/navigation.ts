import {
  CalendarDays,
  Dumbbell,
  Flower2,
  Footprints,
  GraduationCap,
  Home,
  ListChecks,
  Receipt,
  School,
  Trophy,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

/** "live" = usable, "soon" = placeholder page only. */
export type ModuleStatus = "live" | "soon";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  status: ModuleStatus;
  /** Other routes that should highlight this tab, e.g. "/canteen" for Campus. */
  alsoActiveFor?: string[];
}

export interface SubModule extends NavItem {
  description: string;
  /** Git branch where this module is being built (see CONTRIBUTING.md). */
  branch: string;
}

/**
 * Bottom navigation, left to right. Single source of truth: add a new module here
 * and it appears in the nav and on the home page. Home sits in the middle (see BottomNav),
 * and the app still opens on Home ("/", also the manifest's start_url).
 */
export const MAIN_NAV: NavItem[] = [
  // Campus bundles library, study rooms, map and Food Options (/canteen stays its own page).
  {
    href: "/campus",
    label: "Campus",
    icon: School,
    status: "live",
    alsoActiveFor: ["/canteen"],
  },
  // Study Hub bundles the timetable and the to-do lists (/timetable stays its own page).
  {
    href: "/study",
    label: "Study",
    icon: GraduationCap,
    status: "live",
    alsoActiveFor: ["/timetable"],
  },
  { href: "/", label: "Home", icon: Home, status: "live" },
  { href: "/sport", label: "Sport", icon: Trophy, status: "live" },
  { href: "/friends", label: "Friends", icon: Users, status: "live" },
];

/** Sub-modules of the Study Hub. */
export const STUDY_MODULES: SubModule[] = [
  {
    href: "/timetable",
    label: "Timetable",
    description: "Lectures, exams, deadlines and holidays.",
    icon: CalendarDays,
    status: "live",
    branch: "feature/timetable",
  },
  {
    href: "/study/todos",
    label: "To-dos",
    description: "Uni to-do lists as checklist, board or deadline calendar, with colour labels.",
    icon: ListChecks,
    status: "live",
    branch: "feature/study-hub",
  },
  {
    href: "/study/deadlines",
    label: "Deadlines & Payments",
    description: "Tuition instalments from netPA with countdowns and calendar reminders.",
    icon: Receipt,
    status: "live",
    branch: "feature/deadlines",
  },
];

/** Sub-modules of the Sport module. Flip `status` to "live" when a feature is merged. */
export const SPORT_MODULES: SubModule[] = [
  {
    href: "/sport/padel",
    label: "Padel",
    description: "Find players and join open padel matches.",
    icon: Trophy,
    status: "live",
    branch: "feature/padel",
  },
  {
    href: "/sport/surf",
    label: "Surf",
    description: "3-day forecast and surf schools near Lisbon.",
    icon: Waves,
    status: "live",
    branch: "feature/surf",
  },
  {
    href: "/sport/gym",
    label: "Gym",
    description: "Viva Gym on campus: opening hours and live occupancy (simulated).",
    icon: Dumbbell,
    status: "live",
    branch: "feature/gym",
  },
  {
    href: "/sport/yoga",
    label: "Yoga",
    description: "Yoga classes on campus by Nova MindSpace.",
    icon: Flower2,
    status: "live",
    branch: "feature/yoga",
  },
  {
    href: "/sport/running",
    label: "Running",
    description: "Join Lisbon run clubs or post your own run.",
    icon: Footprints,
    status: "live",
    branch: "feature/running",
  },
];

/** True if `pathname` belongs to the nav item (so /sport/surf highlights "Sport"). */
export function isActive(pathname: string, href: string, alsoActiveFor: string[] = []): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...alsoActiveFor].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Name of a page for "‹ Back" buttons, e.g. "/sport" -> "Sport". Falls back to "Back". */
export function labelForHref(href: string): string {
  const path = href.split("?")[0]; // "/friends/group?id=…" → "/friends/group"
  const all = [...MAIN_NAV, ...STUDY_MODULES, ...SPORT_MODULES];
  return all.find((item) => item.href === path)?.label ?? BACK_LABELS[path] ?? "Back";
}

/** Pages that are not in a nav list but are a "back" target. */
const BACK_LABELS: Record<string, string> = {
  "/canteen": "Food Options",
  "/campus/rooms": "Rooms & flats",
  "/profile": "Your area",
  "/friends/messages": "Messages",
  "/friends/group": "Chat",
};
