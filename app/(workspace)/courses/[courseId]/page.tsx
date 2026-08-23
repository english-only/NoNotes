import { Suspense } from "react";

import { CourseWorkspace } from "@/app/(workspace)/courses/_components/course-workspace";

export const metadata = { title: "Course" };

// Course data lives in IndexedDB (client-only), so this route is a thin shell:
// it resolves the dynamic param inside a Suspense boundary per the Next.js docs
// and hands the id to a client component that fetches from Dexie.
export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <CourseContent params={params} />
    </Suspense>
  );
}

async function CourseContent({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseWorkspace courseId={courseId} />;
}
