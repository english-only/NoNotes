import { StudyPicker } from "@/app/(workspace)/study/_components/study-picker";

export const metadata = { title: "Study" };

export default function StudyPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Active recall
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
            Pick a deck to review.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Recall from memory first, then check the answer and rate how well
            you knew it.
          </p>
        </div>
      </section>

      <StudyPicker />
    </div>
  );
}
