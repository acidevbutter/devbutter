import Hero from "@/components/Hero/Hero";
import FeatureStrip from "@/components/FeatureStrip/FeatureStrip";
import AiRole from "@/components/AiRole/AiRole";
import CasesRail from "@/components/CasesRail/CasesRail";
import MethodSteps from "@/components/MethodSteps/MethodSteps";
import ClosingCta from "@/components/ClosingCta/ClosingCta";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureStrip />
      <AiRole />
      <CasesRail />
      <MethodSteps />
      <ClosingCta />
    </>
  );
}
