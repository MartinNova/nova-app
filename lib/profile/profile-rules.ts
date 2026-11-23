/**
 * Pure profile helpers (no storage, no browser APIs), unit tested.
 */
import { validateAvailability } from "@/lib/profile/availability";
import { BIO_MAX_LENGTH, type ProfileUpdate } from "@/types/profile";

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

/** "  Till.F " -> "till.f" (usernames are stored lowercase). */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, "");
}

/** Error message, or null if the username is allowed (same rule as the database). */
export function validateUsername(username: string): string | null {
  if (username.length < 3) return "At least 3 characters.";
  if (username.length > 20) return "At most 20 characters.";
  if (!USERNAME_PATTERN.test(username)) return "Only letters, numbers, _ and .";
  return null;
}

export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  return password.length < PASSWORD_MIN_LENGTH
    ? `Use at least ${PASSWORD_MIN_LENGTH} characters.`
    : null;
}

/** Returns an error message, or null if the profile can be saved. */
/** Nova student numbers are digits only, e.g. "12345". Empty is fine (not everyone has one yet). */
export function validateStudentId(studentId: string): string | null {
  if (!studentId) return null;
  return /^\d{4,10}$/.test(studentId) ? null : "Student ID: numbers only, e.g. 12345.";
}

/**
 * Tidies a typed mobile number: "0049 (151) 234-567" -> "+49 151 234 567".
 * Keeps digits, a leading + and single spaces; "00" at the start becomes "+".
 */
export function normalizePhone(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[()\-./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const international = cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;
  return international.replace(/^\+\s+/, "+");
}

/** Error message, or null if the (normalized) number is fine. Empty is fine: it's optional. */
export function validatePhone(phone: string): string | null {
  if (!phone) return null;
  if (!/^\+?\d[\d ]*$/.test(phone))
    return "Mobile number: digits only, optionally starting with +, e.g. +351 912 345 678.";
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 6) return "Mobile number: that looks too short.";
  if (digits > 15) return "Mobile number: that looks too long.";
  return null;
}

/** Link that starts a call: "+351 912 345 678" -> "tel:+351912345678". */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function validateProfileUpdate(update: ProfileUpdate): string | null {
  const usernameError = validateUsername(update.username);
  if (usernameError) return `Username: ${usernameError}`;
  if (!update.firstName.trim()) return "Please enter your first name.";
  const studentIdError = validateStudentId(update.studentId);
  if (studentIdError) return studentIdError;
  if (update.bio.length > BIO_MAX_LENGTH)
    return `Keep your intro under ${BIO_MAX_LENGTH} characters.`;
  if (update.studyStart && update.studyEnd && update.studyEnd < update.studyStart)
    return "Your programme can't end before it starts.";
  if (update.linkedin && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(update.linkedin))
    return "LinkedIn: paste the full link, e.g. https://www.linkedin.com/in/your-name";
  if (update.instagram && !/^[A-Za-z0-9_.]{1,30}$/.test(update.instagram))
    return "Instagram: only your handle, without @.";
  const phoneError = validatePhone(update.phone);
  if (phoneError) return phoneError;
  const availabilityError = validateAvailability(update.availability);
  if (availabilityError) return `Usually free: ${availabilityError}`;
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" -> "Sep 2026". */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return year && m ? `${MONTHS[m - 1]} ${year}` : "";
}

/**
 * Where someone is in their programme, e.g. "1st year", "Final year", "Graduated".
 * `today` is "YYYY-MM". Years count from the start month.
 */
export function studyProgress(start: string, end: string, today: string): string {
  if (!start) return "";
  if (today < start) return `Starts ${formatMonth(start)}`;
  if (end && today > end) return "Graduated";
  const [sy, sm] = start.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  const year = Math.floor((ty * 12 + tm - (sy * 12 + sm)) / 12) + 1;
  if (end) {
    const [ey, em] = end.split("-").map(Number);
    const lastYear = Math.floor((ey * 12 + em - (sy * 12 + sm)) / 12) + 1;
    if (year >= lastYear) return "Final year";
  }
  return `${year}${["st", "nd", "rd"][year - 1] ?? "th"} year`;
}

/** ISO code -> flag emoji, e.g. "PT" -> 🇵🇹. */
export function flagEmoji(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) return "";
  return String.fromCodePoint(...[...countryCode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** ISO code -> English country name, e.g. "DE" -> "Germany". */
export function countryName(countryCode: string): string {
  if (!countryCode) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

/** All ISO 3166 country codes, sorted by English name (for the country picker). */
export const COUNTRY_CODES = (
  "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH " +
  "CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN " +
  "GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB " +
  "LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL " +
  "NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR " +
  "SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW"
)
  .split(" ")
  .sort((a, b) => countryName(a).localeCompare(countryName(b)));

/** Initials for the avatar fallback: "Till Fassbender" -> "TF", "till.f" -> "TI". */
export function initials(firstName: string, lastName: string, username = ""): string {
  const fromName = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`;
  return (fromName || username.slice(0, 2)).toUpperCase();
}
