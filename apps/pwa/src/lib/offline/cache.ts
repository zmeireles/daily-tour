import { createStore, get, set, del } from "idb-keyval";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const idbStore = createStore("daily-tour-query-cache", "persisted-queries");

export const idbStorage = {
  getItem: (key: string): Promise<string | null> =>
    get<string>(key, idbStore).then((v) => v ?? null),
  setItem: (key: string, value: string): Promise<void> => set(key, value, idbStore),
  removeItem: (key: string): Promise<void> => del(key, idbStore),
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "DAILY_TOUR_QUERY_CACHE",
});
