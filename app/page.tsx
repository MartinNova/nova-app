import Image from "next/image";
import studentsBanner from "@/public/images/nova-students-home-banner.png";
import { Greeting } from "@/components/home/Greeting";
import { HomeView } from "@/components/home/HomeView";

/** Home: what's on today. The modules themselves live in the tab bar. */
export default function HomePage() {
  return (
    <>
      {/* Up under the see-through top bar and out to the screen edges, like the hub photos.
          The artwork's own cream fills the space behind the bar, so the drawing stays fully visible. */}
      <div className="home-hero-art -mx-4 -mt-[calc(3.5rem+env(safe-area-inset-top))] mb-6 bg-[#fdf4ec] pt-[calc(3rem+env(safe-area-inset-top))]">
        <Image
          src={studentsBanner}
          alt="NOVA Students illustration with students, books, sports and campus life."
          sizes="(max-width: 768px) 100vw, 704px"
          preload
          className="h-auto w-full"
        />
      </div>
      <Greeting />
      <HomeView />
    </>
  );
}
