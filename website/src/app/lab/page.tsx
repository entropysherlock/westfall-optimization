import Redirect from "@/components/Redirect";

export const metadata = { title: "Moved to the Optimization Studio", robots: { index: false } };

export default function Lab() {
  return <Redirect to="/studio/" label="the Optimization Studio" />;
}
