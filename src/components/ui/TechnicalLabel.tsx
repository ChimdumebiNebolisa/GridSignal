import type { ReactNode } from "react";

export function TechnicalLabel({ children }: { children: ReactNode }) {
  return <p className="gs-label">{children}</p>;
}
