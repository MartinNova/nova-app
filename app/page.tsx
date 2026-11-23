import Image from "next/image";
import studentsBanner from "@/public/images/nova-students-home-banner.png";
import { Greeting } from "@/components/home/Greeting";
import { HomeView } from "@/components/home/HomeView";

/** Home: what's on today. The modules themselves live in the tab bar. */
export default function HomePage() {
  return (
    <>
      <Image
        src={studentsBanner}
        alt="NOVA Students illustration with students, books, sports and campus life."
        sizes="(max-width: 768px) 100vw, 672px"
        preload
        className="hub-hero-photo mb-6 h-auto w-full rounded-3xl"
      />
      <Greeting />
      <HomeView />
    </>
  );
}
