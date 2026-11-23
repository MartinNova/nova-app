import { describe, expect, it } from "vitest";
import { normalizeSearch, searchPeople, type Searchable } from "./search";

const people: (Searchable & { id: string })[] = [
  { id: "a", firstName: "João", lastName: "Silva", username: "jsilva", studentId: "61234" },
  { id: "b", firstName: "Inês", lastName: "Carvalho", username: "ines.c", studentId: "61299" },
  { id: "c", firstName: "Marco", lastName: "Rossi", username: "marco.r", studentId: "70001" },
  { id: "d", firstName: "Ana", lastName: "Silva Costa", username: "anasc", studentId: "" },
];
const ids = (text: string) => searchPeople(people, text).map((p) => p.id);

describe("normalizeSearch", () => {
  it("drops accents, case and extra spaces", () => {
    expect(normalizeSearch("  JOÃO   Inês Chloé ")).toBe("joao ines chloe");
  });
});

describe("searchPeople", () => {
  it("returns everyone for an empty search", () => {
    expect(ids("   ")).toEqual(["a", "b", "c", "d"]);
  });

  it("finds first and last names, partly and ignoring case and accents", () => {
    expect(ids("joao")).toEqual(["a"]);
    expect(ids("INES")).toEqual(["b"]);
    expect(ids("carv")).toEqual(["b"]);
    expect(ids("silva")).toEqual(["a", "d"]);
  });

  it("matches full names in any order", () => {
    expect(ids("João Silva")).toEqual(["a"]);
    expect(ids("silva jo")).toEqual(["a"]);
    expect(ids("ana costa")).toEqual(["d"]);
  });

  it("finds usernames, with or without @", () => {
    expect(ids("@marco.r")).toEqual(["c"]);
    expect(ids("anasc")).toEqual(["d"]);
  });

  it("finds a complete student ID", () => {
    expect(ids("61234")).toEqual(["a"]);
    expect(ids(" 70001 ")).toEqual(["c"]);
  });

  it("finds a student-ID prefix only when it fits exactly one person", () => {
    expect(ids("7000")).toEqual([]); // too short
    expect(ids("6123")).toEqual([]); // too short
    expect(ids("612")).toEqual([]);
    expect(ids("6129")).toEqual([]); // too short, even though unique
  });

  it("does not list several people for an ambiguous prefix", () => {
    const more = [...people, { id: "e", firstName: "Eva", lastName: "Lima", studentId: "612345" }];
    expect(searchPeople(more, "61234").map((p) => p.id)).toEqual(["a"]); // exact wins
    expect(searchPeople(more, "6123").map((p) => p.id)).toEqual([]);
    const long = [
      { id: "x", firstName: "X", lastName: "Y", studentId: "1234567" },
      { id: "y", firstName: "Z", lastName: "W", studentId: "1234589" },
    ];
    expect(searchPeople(long, "12345").map((p) => p.id)).toEqual([]);
    expect(searchPeople(long, "123456").map((p) => p.id)).toEqual(["x"]);
  });

  it("never matches an empty student ID", () => {
    expect(ids("0")).toEqual([]);
  });

  it("still finds digits in usernames", () => {
    const withDigits = [{ id: "u", firstName: "Rui", lastName: "Melo", username: "rui2003" }];
    expect(searchPeople(withDigits, "2003").map((p) => p.id)).toEqual(["u"]);
  });
});
