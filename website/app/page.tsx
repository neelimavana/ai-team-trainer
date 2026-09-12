import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { Objectives } from "@/components/objectives";
import { Literature } from "@/components/literature";
import { Methodology } from "@/components/methodology";
import { ArchitectureExplorer } from "@/components/architecture-explorer";
import { Results } from "@/components/results";
import { Structure } from "@/components/structure";
import { Conclusion } from "@/components/conclusion";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <Hero />
        <Objectives />
        <Literature />
        <Methodology />
        <ArchitectureExplorer />
        <Results />
        <Structure />
        <Conclusion />
      </main>
      <Footer />
    </div>
  );
}