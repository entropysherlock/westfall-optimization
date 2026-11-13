import Redirect from "@/components/Redirect";

export const metadata = { title: "Moved: Westfall Structural Optimization Theorem", robots: { index: false } };

export default function Moved() {
  return <Redirect to="/research/theorem/" label="the Westfall Structural Optimization Theorem" />;
}
