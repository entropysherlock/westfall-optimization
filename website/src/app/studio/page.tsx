import Studio from "@/components/studio/Studio";

export const metadata = {
  title: "Optimization Studio",
  description: "A browser workstation for weighted ordering problems: import or generate data, solve exactly or heuristically, analyse the ordering, verify optimality certificates independently, and compare solvers. Computation runs locally.",
};

export default function StudioPage() {
  return <Studio />;
}
