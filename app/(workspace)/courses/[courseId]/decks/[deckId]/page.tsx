import { Suspense } from "react";

import { DeckWorkspace } from "@/app/(workspace)/courses/_components/deck-workspace";

export const metadata = { title: "Deck" };

// Deck data lives in IndexedDB (client-only), so this route is a thin shell:
// it resolves the dynamic params inside a Suspense boundary per the Next.js
// docs and hands the ids to a client component that fetches from Dexie.
export default function DeckPage({
  params,
}: {
  params: Promise<{ courseId: string; deckId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <DeckContent params={params} />
    </Suspense>
  );
}

async function DeckContent({
  params,
}: {
  params: Promise<{ courseId: string; deckId: string }>;
}) {
  const { courseId, deckId } = await params;
  return <DeckWorkspace courseId={courseId} deckId={deckId} />;
}
