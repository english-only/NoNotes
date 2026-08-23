import { Suspense } from "react";

import { StudySession } from "@/app/(workspace)/study/_components/study-session";

export const metadata = { title: "Study" };

// Deck and card data live in IndexedDB (client-only), so this route is a thin
// shell: it resolves the dynamic param inside a Suspense boundary per the
// Next.js docs and hands the id to a client component that fetches from Dexie.
export default function StudyDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <StudyContent params={params} />
    </Suspense>
  );
}

async function StudyContent({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  return <StudySession deckId={deckId} />;
}
