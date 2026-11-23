import type { Metadata } from "next";
import { FriendsView } from "@/components/friends/FriendsView";
import { MessagesLink } from "@/components/messages/MessagesLink";
import { HubHero } from "@/components/ui/HubHero";

export const metadata: Metadata = { title: "Friends" };

export default function FriendsPage() {
  return (
    <>
      <HubHero
        title="Friends"
        tagline="Find other Nova students and get in touch."
        image={{
          src: "/images/nova-friends-graduation.png",
          alt: "A group of graduates celebrating together on the NOVA SBE campus.",
        }}
      />
      <MessagesLink />
      <FriendsView />
    </>
  );
}
