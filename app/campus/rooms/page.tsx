import type { Metadata } from "next";
import { RoomsView } from "@/components/rooms/RoomsView";
import { HubHero } from "@/components/ui/HubHero";

export const metadata: Metadata = { title: "Rooms & flats" };

export default function RoomsPage() {
  return (
    <>
      <HubHero
        title="Rooms & flats"
        tagline="Find a room near campus or pass yours on when you leave."
        image={{
          src: "/images/nova-campus-rooms-bedroom.png",
          alt: "A sunlit bedroom with a laptop on the bed.",
        }}
        backHref="/campus"
      />
      <RoomsView />
    </>
  );
}
