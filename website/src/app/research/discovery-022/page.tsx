import Redirect from "@/components/Redirect";

export const metadata = { title: "Moved: structural decomposition theorem", robots: { index: false } };

export default function Moved() {
  return <Redirect to="/research/theorem/" label="the structural decomposition theorem" />;
}
