import { Suspense } from "react";
import { PairForm } from "./PairForm";

export default function PairPage() {
  return (
    <div className="gdl-screen-root min-h-full py-12 px-4">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-panel)] p-8 text-center text-[var(--gdl-muted)]">
            Loading…
          </div>
        }
      >
        <PairForm />
      </Suspense>
    </div>
  );
}
