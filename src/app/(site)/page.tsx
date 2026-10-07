import Hero from "@/components/Hero/Hero";
import FeatureStrip from "@/components/FeatureStrip/FeatureStrip";
import Projects from "@/components/Projects/Projects";
import Concierge from "@/components/Concierge/Concierge";
import DataDecision from "@/components/DataDecision/DataDecision";
import ChatSimulation from "@/components/ChatSimulation/ChatSimulation";
import ClosingCta from "@/components/ClosingCta/ClosingCta";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureStrip />
      <Projects />
      <Concierge />
      <DataDecision />
      <ChatSimulation />
      <ClosingCta />
    </>
  );
}
