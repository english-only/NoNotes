import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { Dexie } from "dexie";

// Point Dexie at the in-memory IndexedDB so repository tests run against
// real Dexie/IndexedDB semantics in the Node test environment.
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;
