"use client";

// Client-only boundary for the Dexie database. `db` is instantiated at module
// load in lib/db/index.ts and requires IndexedDB, which only exists in the
// browser. Only client components may import from this module; server
// components must never cross this boundary.
//
// The `window.__nonotes_db__` exposure is set in lib/db/index.ts so it
// applies to any module that imports the db instance.
export { db } from "@/lib/db/index";
