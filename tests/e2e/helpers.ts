import type { Page } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Database connection helpers                                        */
/* ------------------------------------------------------------------ */

/**
 * Check whether the app's Dexie instance is available on `window`.
 * Returns true when `window.__nonotes_db__` exists and is open.
 */
async function hasDexieGlobal(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (window as any).__nonotes_db__;
    return !!(db && typeof db.isOpen === "function" && db.isOpen());
  });
}

/**
 * Wait until the app's Dexie instance is available on `window`.
 * Falls back to waiting for basic IndexedDB readiness after a short grace
 * period (for pages like /settings that never load Dexie).
 */
async function waitForDB(page: Page): Promise<void> {
  // First, give the app a chance to mount Dexie (most workspace pages).
  try {
    await page.waitForFunction(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        return db && typeof db.isOpen === "function" && db.isOpen();
      },
      { timeout: 8_000 },
    );
    return;
  } catch {
    // Dexie global never appeared — this page doesn't load Dexie
    // (e.g. /settings). Fall back to raw IndexedDB readiness check.
  }

  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          req.result.close();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      }),
    { timeout: 10_000 },
  );
}

/* ------------------------------------------------------------------ */
/*  Database lifecycle                                                 */
/* ------------------------------------------------------------------ */

/**
 * Clear every object store.
 *
 * Strategy:
 * 1. If the app's Dexie instance is available, use it (no connection conflict).
 * 2. Otherwise, use a raw IDB handle (safe when no Dexie connection exists,
 *    e.g. on the /settings page).
 */
export async function clearDatabase(page: Page): Promise<void> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (window as any).__nonotes_db__;
      await Promise.all(
        db.tables.map((t: { clear: () => Promise<unknown> }) => t.clear()),
      );
    });
    return;
  }

  // Raw-IDB path — safe because no Dexie connection is open on this page.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const names = Array.from(db.objectStoreNames);
          if (names.length === 0) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(names, "readwrite");
          for (const name of names) {
            tx.objectStore(name).clear();
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        };
        req.onerror = () => resolve();
      }),
  );
}

/**
 * Navigate to a page, wait for DB readiness, clear data, and reload so the
 * app re-reads a clean database.
 */
export async function gotoAndClear(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForDB(page);
  await clearDatabase(page);
  await page.reload();
  await waitForDB(page);
}

/* ------------------------------------------------------------------ */
/*  Seed helpers                                                       */
/*                                                                     */
/*  Try the app's Dexie instance first (no connection conflicts).       */
/*  Fall back to raw IDB when Dexie is not loaded (settings page).      */
/* ------------------------------------------------------------------ */

/** Seed a course. Returns the new course ID. */
export async function seedCourse(
  page: Page,
  title: string,
  description?: string,
): Promise<string> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    return page.evaluate(
      ({ title, description }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        const now = Date.now();
        const id = crypto.randomUUID();
        return db.courses
          .add({
            id,
            title,
            description: description ?? "",
            createdAt: now,
            updatedAt: now,
          })
          .then(() => id);
      },
      { title, description },
    );
  }

  return page.evaluate(
    ({ title, description }) =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("courses", "readwrite");
          const id = crypto.randomUUID();
          const now = Date.now();
          tx.objectStore("courses").add({
            id,
            title,
            description: description ?? "",
            createdAt: now,
            updatedAt: now,
          });
          tx.oncomplete = () => {
            db.close();
            resolve(id);
          };
        };
      }),
    { title, description },
  );
}

/** Seed a deck. Returns the new deck ID. */
export async function seedDeck(
  page: Page,
  courseId: string,
  title: string,
  topicId?: string,
): Promise<string> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    return page.evaluate(
      ({ courseId, title, topicId }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        const now = Date.now();
        const id = crypto.randomUUID();
        const record: Record<string, unknown> = {
          id,
          courseId,
          title,
          createdAt: now,
          updatedAt: now,
        };
        if (topicId) record.topicId = topicId;
        return db.decks.add(record).then(() => id);
      },
      { courseId, title, topicId },
    );
  }

  return page.evaluate(
    ({ courseId, title, topicId }) =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("decks", "readwrite");
          const id = crypto.randomUUID();
          const now = Date.now();
          const record: Record<string, unknown> = {
            id,
            courseId,
            title,
            createdAt: now,
            updatedAt: now,
          };
          if (topicId) record.topicId = topicId;
          tx.objectStore("decks").add(record);
          tx.oncomplete = () => {
            db.close();
            resolve(id);
          };
        };
      }),
    { courseId, title, topicId },
  );
}

/** Seed a topic. Returns the new topic ID. */
export async function seedTopic(
  page: Page,
  courseId: string,
  title: string,
): Promise<string> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    return page.evaluate(
      ({ courseId, title }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        const now = Date.now();
        const id = crypto.randomUUID();
        return db.topics
          .add({ id, courseId, title, createdAt: now, updatedAt: now })
          .then(() => id);
      },
      { courseId, title },
    );
  }

  return page.evaluate(
    ({ courseId, title }) =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("topics", "readwrite");
          const id = crypto.randomUUID();
          const now = Date.now();
          tx.objectStore("topics").add({
            id,
            courseId,
            title,
            createdAt: now,
            updatedAt: now,
          });
          tx.oncomplete = () => {
            db.close();
            resolve(id);
          };
        };
      }),
    { courseId, title },
  );
}

/** Seed a flashcard with default FSRS state. Returns the new card ID. */
export async function seedFlashcard(
  page: Page,
  deckId: string,
  prompt: string,
  answer: string,
  dueAt?: number,
): Promise<string> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    return page.evaluate(
      ({ deckId, prompt, answer, dueAt }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        const now = Date.now();
        const due = dueAt ?? now;
        const id = crypto.randomUUID();
        return db.flashcards
          .add({
            id,
            deckId,
            prompt,
            answer,
            sourceChunkIds: [],
            dueAt: due,
            createdAt: now,
            updatedAt: now,
            fsrs: {
              version: 1,
              due,
              stability: 0,
              difficulty: 0,
              elapsed_days: 0,
              scheduled_days: 0,
              reps: 0,
              lapses: 0,
              learning_steps: 0,
              state: 0,
              last_review: null,
            },
          })
          .then(() => id);
      },
      { deckId, prompt, answer, dueAt },
    );
  }

  return page.evaluate(
    ({ deckId, prompt, answer, dueAt }) =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("flashcards", "readwrite");
          const id = crypto.randomUUID();
          const now = Date.now();
          const due = dueAt ?? now;
          tx.objectStore("flashcards").add({
            id,
            deckId,
            prompt,
            answer,
            sourceChunkIds: [],
            dueAt: due,
            createdAt: now,
            updatedAt: now,
            fsrs: {
              version: 1,
              due,
              stability: 0,
              difficulty: 0,
              elapsed_days: 0,
              scheduled_days: 0,
              reps: 0,
              lapses: 0,
              learning_steps: 0,
              state: 0,
              last_review: null,
            },
          });
          tx.oncomplete = () => {
            db.close();
            resolve(id);
          };
        };
      }),
    { deckId, prompt, answer, dueAt },
  );
}

/** Seed a source with a single chunk. Returns { sourceId, chunkIds }. */
export async function seedSource(
  page: Page,
  courseId: string,
  title: string,
  content: string,
): Promise<{ sourceId: string; chunkIds: string[] }> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    return page.evaluate(
      ({ courseId, title, content }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        const now = Date.now();
        const sourceId = crypto.randomUUID();
        const chunkId = crypto.randomUUID();
        return Promise.all([
          db.sources.add({
            id: sourceId,
            courseId,
            title,
            type: "text",
            rawContent: content,
            processedContent: content,
            createdAt: now,
            updatedAt: now,
          }),
          db.chunks.add({
            id: chunkId,
            sourceId,
            ordinal: 0,
            content,
            createdAt: now,
          }),
        ]).then(() => ({ sourceId, chunkIds: [chunkId] }));
      },
      { courseId, title, content },
    );
  }

  return page.evaluate(
    ({ courseId, title, content }) =>
      new Promise<{ sourceId: string; chunkIds: string[] }>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(["sources", "chunks"], "readwrite");
          const sourceId = crypto.randomUUID();
          const chunkId = crypto.randomUUID();
          const now = Date.now();

          tx.objectStore("sources").add({
            id: sourceId,
            courseId,
            title,
            type: "text",
            rawContent: content,
            processedContent: content,
            createdAt: now,
            updatedAt: now,
          });

          tx.objectStore("chunks").add({
            id: chunkId,
            sourceId,
            ordinal: 0,
            content,
            createdAt: now,
          });

          tx.oncomplete = () => {
            db.close();
            resolve({ sourceId, chunkIds: [chunkId] });
          };
        };
      }),
    { courseId, title, content },
  );
}

/* ------------------------------------------------------------------ */
/*  Query helpers                                                      */
/* ------------------------------------------------------------------ */

/** Count records in a specific IndexedDB table. */
export async function countRecords(
  page: Page,
  storeName: string,
): Promise<number> {
  const dexie = await hasDexieGlobal(page);
  if (dexie) {
    return page.evaluate(
      (storeName) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (window as any).__nonotes_db__;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (db as any)[storeName].count();
      },
      storeName,
    );
  }

  return page.evaluate(
    (storeName) =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("nonotes");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(storeName, "readonly");
          const countReq = tx.objectStore(storeName).count();
          countReq.onsuccess = () => {
            db.close();
            resolve(countReq.result);
          };
        };
      }),
    storeName,
  );
}

/** Wait for the database to be ready. */
export { waitForDB };
