/**
 * Student profile: data contract.
 * Created automatically on sign-up (see supabase/migrations), edited on /settings.
 * In demo mode it lives in localStorage.
 */

/** Nova SBE programmes (from novasbe.unl.pt, checked 17.11.2026). */
export const NOVA_PROGRAMS = {
  "Master's": [
    "Business Analytics",
    "CEMS MIM",
    "Economics",
    "Finance",
    "Impact Entrepreneurship & Innovation",
    "International Development & Public Policy",
    "International Master's in Finance",
    "International Master's in Management",
    "Law & Economics of the Sea",
    "Law & Management",
    "Management",
  ],
  "Bachelor's": ["Economics (Bachelor)", "Management (Bachelor)", "Ocean Studies (Bachelor)"],
  Other: ["The Lisbon MBA", "Ph.D.", "Other"],
} as const;

export const STUDY_STATUSES = {
  regular: "Regular student",
  exchange: "Exchange student",
  "double-degree": "Double degree",
} as const;
export type StudyStatus = keyof typeof STUDY_STATUSES | "";

export const SPORT_INTERESTS = [
  "Padel",
  "Surf",
  "Gym",
  "Yoga",
  "Running",
  "Football",
  "Beach volleyball",
  "Tennis",
] as const;

export const LANGUAGES = [
  "English",
  "Portuguese",
  "German",
  "Spanish",
  "French",
  "Italian",
  "Dutch",
  "Chinese",
  "Polish",
  "Swedish",
  "Turkish",
  "Arabic",
  "Hindi",
  "Russian",
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_TIMES = ["Morning", "Afternoon", "Evening"] as const;

export const VISIBILITIES = {
  everyone: "All students on the app",
  private: "Only me",
} as const;
export type Visibility = keyof typeof VISIBILITIES;

export interface Profile {
  /** Same id as the user (auth user id in Supabase). */
  userId: string;
  /** Read-only: comes from the login. Empty for demo accounts. */
  email: string;
  /**
   * Nova student number, e.g. "79109". Filled in from a Nova e-mail (79109@novasbe.pt),
   * editable in Settings. Shown on your profile to other students.
   */
  studentId: string;

  username: string;
  firstName: string;
  lastName: string;
  /** Public URL of the profile picture, or "" for initials. */
  avatarUrl: string;
  /** Short intro, max. BIO_MAX_LENGTH characters. */
  bio: string;
  /** ISO country code, e.g. "DE", or "". */
  country: string;
  languages: string[];
  /** Instagram handle without @. */
  instagram: string;
  /** Full LinkedIn profile URL. */
  linkedin: string;
  /**
   * Optional mobile number, e.g. "+351 912 345 678", or "". Saved cleaned up (normalizePhone).
   * Visible to signed-in students who can see your profile; never to logged-out visitors.
   */
  phone: string;

  /** Nova programme from NOVA_PROGRAMS, or "". */
  program: string;
  /** Month "YYYY-MM", or "". */
  studyStart: string;
  studyEnd: string;
  studyStatus: StudyStatus;

  sports: string[];
  /** Lower bound of a padel level band (see types/padel.ts), or null. */
  padelLevel: number | null;
  availabilityDays: string[];
  availabilityTimes: string[];

  visibility: Visibility;
  showInSuggestions: boolean;
}

/** Everything a student may change themselves. */
export type ProfileUpdate = Omit<Profile, "userId" | "email">;

export const BIO_MAX_LENGTH = 300;

export interface ProfileService {
  getProfile(userId: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  /** Everyone whose profile is visible to all students (the Friends directory). */
  listProfiles(): Promise<Profile[]>;
  updateProfile(userId: string, update: ProfileUpdate): Promise<Profile>;
  /** Uploads a (square, already resized) image and returns its public URL. */
  uploadAvatar(userId: string, image: Blob): Promise<string>;
}
