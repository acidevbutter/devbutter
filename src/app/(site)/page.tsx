import Hero from "@/components/Hero/Hero";
import FeatureStrip from "@/components/FeatureStrip/FeatureStrip";
import AiRole from "@/components/AiRole/AiRole";
import Projects from "@/components/Projects/Projects";
import ClosingCta from "@/components/ClosingCta/ClosingCta";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureStrip />
      <AiRole />
      <Projects />
      <ClosingCta />
    </>
  );
}
