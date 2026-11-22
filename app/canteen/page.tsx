import type { Metadata } from "next";
import { HubHero } from "@/components/ui/HubHero";
import { VenueCard } from "@/components/canteen/VenueCard";
import { FOOD_VENUES } from "@/data/food-options";

export const metadata: Metadata = { title: "Food Options" };
export default function FoodOptionsPage() {
  return (
    <>
      <HubHero
        title="Food Options"
        tagline="What's cooking on campus."
        image={{
          src: "/images/nova-canteen.png",
          alt: "Lunch on a terrace overlooking the Nova SBE campus courtyard.",
        }}
        cropTop
        backHref="/campus"
      />
      <section aria-labelledby="food-venues" className="space-y-4">
        <h2 id="food-venues" className="text-xl font-semibold tracking-tight">
          Explore campus food
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FOOD_VENUES.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>
    </>
  );
}
