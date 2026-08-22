import type { ReactNode } from "react";

type AnnotationNoteProps = {
  tone: "yellow" | "blue" | "green" | "peach";
  label: string;
  children: ReactNode;
};

export function AnnotationNote({ tone, label, children }: AnnotationNoteProps) {
  return (
    <aside className={`gs-note gs-note-${tone}`}>
      <p className="gs-label !mb-1 !text-[var(--gs-ink-soft)]">{label}</p>
      {children}
    </aside>
  );
}
