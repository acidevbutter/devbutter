import Nav from "@/components/Nav/Nav";
import Hero from "@/components/Hero/Hero";
import FeatureStrip from "@/components/FeatureStrip/FeatureStrip";
import Projects from "@/components/Projects/Projects";
import Concierge from "@/components/Concierge/Concierge";
import DataDecision from "@/components/DataDecision/DataDecision";
import ChatSimulation from "@/components/ChatSimulation/ChatSimulation";
import ClosingCta from "@/components/ClosingCta/ClosingCta";
import Footer from "@/components/Footer/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FeatureStrip />
        <Projects />
        <Concierge />
        <DataDecision />
        <ChatSimulation />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
