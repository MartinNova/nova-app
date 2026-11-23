import { toISODate } from "@/lib/padel/dates";
import type { RoomListing } from "@/types/rooms";

/** Fictional demo listings (demo mode only), dated relative to today. */
export function createMockListings(today: Date): RoomListing[] {
  const inDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  };
  const ago = (hours: number) => new Date(today.getTime() - hours * 3_600_000).toISOString();

  return [
    {
      id: "demo-room-1",
      kind: "offer",
      title: "Bright room 10 min from campus",
      roomType: "room",
      areas: ["Carcavelos", "Parede"],
      rent: 620,
      billsIncluded: true,
      availableFrom: inDays(45),
      availableUntil: inDays(220),
      description:
        "Leaving for exchange next semester. Flat with 3 other Nova students, big kitchen, balcony. Walk to campus and the beach.",
      photos: [],
      createdBy: "demo-1",
      createdAt: ago(3),
    },
    {
      id: "demo-room-2",
      kind: "offer",
      title: "Studio in Cascais, close to the train",
      roomType: "studio",
      areas: ["Cascais"],
      rent: 850,
      billsIncluded: false,
      availableFrom: inDays(10),
      availableUntil: "",
      description: "Small but fully furnished studio, 5 min walk to Cascais station.",
      photos: [],
      createdBy: "demo-2",
      createdAt: ago(30),
    },
    {
      id: "demo-room-3",
      kind: "wanted",
      title: "Looking for a room for spring semester",
      roomType: "room",
      areas: ["Lisbon – Santos / Estrela", "Lisbon – Cais do Sodré / Chiado"],
      rent: 650,
      billsIncluded: true,
      availableFrom: inDays(60),
      availableUntil: inDays(200),
      description: "Exchange student from Germany, tidy and quiet, happy to share with others.",
      photos: [],
      createdBy: "demo-3",
      createdAt: ago(8),
    },
  ];
}
