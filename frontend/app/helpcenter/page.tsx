import FaqsBlock from "@/components/faqs-block";
import StatsBlock from "@/components/stats-block";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { DottedMap } from "@/components/ui/dotted-map";

const COUNTRY_FLAGS = [
  "🇺🇸",
  "🇬🇧",
  "🇨🇦",
  "🇮🇳",
  "🇩🇪",
  "🇫🇷",
  "🇯🇵",
  "🇰🇷",
  "🇧🇷",
  "🇦🇺",
  "🇿🇦",
  "🇳🇬",
  "🇲🇽",
  "🇸🇦",
  "🇦🇪",
  "🇸🇬",
  "🇳🇱",
  "🇮🇹",
  "🇪🇸",
  "🇹🇷",
  "🇸🇪",
  "🇨🇭",
  "🇦🇹",
  "🇧🇪",
  "🇮🇪",
  "🇳🇿",
  "🇮🇱",
  "🇪🇬",
  "🇰🇪",
];

export default function HelpCenterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <section className="w-full bg-background py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-8 text-center">
          <h1 className="text-3xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">
            Global support across every timezone. Find answers below.
          </p>
          <AvatarCircles flags={COUNTRY_FLAGS} numPeople={125} />
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted In 150+ Countries
          </h2>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-muted-foreground">
              Built For A Worldwide Audience
            </p>
            <p className="mt-2 text-muted-foreground">
              Acme runs close to your users on every continent, so requests stay fast wherever they
              come from.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-white">
        <DottedMap
          width={1600}
          height={500}
          dotColor="#000000"
          markerColor="#000000"
          markers={[
            { lat: 40.7128, lng: -74.006, size: 0.5 },
            { lat: 51.5074, lng: -0.1278, size: 0.5 },
            { lat: 35.6762, lng: 139.6503, size: 0.5 },
          ]}
          className="w-full"
        />
      </section>

      <div className="w-full max-w-4xl">
        <StatsBlock />
      </div>

      <FaqsBlock />
    </main>
  );
}
