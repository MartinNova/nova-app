/** The fields "Find people" searches in. Profiles and users both have them. */
export interface Searchable {
  firstName: string;
  lastName: string;
  username?: string;
  studentId?: string;
}

/** A student-ID prefix needs at least this many digits before it can count. */
export const MIN_STUDENT_ID_PREFIX = 5;

/** Lower case without accents, so "joao" finds "João" and "ines" finds "Inês". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Name or username contains every word of the search, in any order ("silva jo" finds João Silva). */
function matchesText(p: Searchable, words: string[]): boolean {
  const haystack = normalizeSearch(`${p.firstName} ${p.lastName} ${p.username ?? ""}`);
  return words.every((w) => haystack.includes(w));
}

/**
 * Filters people by a search text: name (first and/or last, partial, ignoring case and
 * accents), @username, or student ID. A student ID only counts when typed in full, or when
 * the digits typed so far (at least MIN_STUDENT_ID_PREFIX) fit exactly one person — so a few
 * digits never list everyone whose number happens to start with them.
 */
export function searchPeople<T extends Searchable>(people: T[], text: string): T[] {
  const q = normalizeSearch(text).replace(/^@/, "");
  if (!q) return people;
  const words = q.split(" ");
  const byText = people.filter((p) => matchesText(p, words));

  if (!/^\d+$/.test(q)) return byText;
  const exact = people.filter((p) => p.studentId === q);
  const byId =
    exact.length > 0 || q.length < MIN_STUDENT_ID_PREFIX
      ? exact
      : people.filter((p) => p.studentId?.startsWith(q));
  const idHits = exact.length > 0 || byId.length === 1 ? byId : [];
  if (idHits.length === 0) return byText;
  // Keep the original order and don't list anyone twice.
  const hits = new Set([...byText, ...idHits]);
  return people.filter((p) => hits.has(p));
}
