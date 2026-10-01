import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings";
import type { IdentifyResult } from "@/lib/scan-types";

export type HistoryItem = {
  id: string;
  createdAt: string;
  result: IdentifyResult;
  // The scanned frame, saved as a file (AsyncStorage can't hold images).
  thumbUri?: string | null;
  saved?: boolean;
};

const keyFor = (uid: string) => `@videofy/history:${uid}`;
const legacyKeyFor = (uid: string) => `@shazam_history:${uid}`;
const THUMB_DIR = `${FileSystem.documentDirectory}scans/`;
const MAX_ITEMS = 300;

type HistoryContextValue = {
  items: HistoryItem[];
  loaded: boolean;
  add: (result: IdentifyResult, frameBase64?: string | null) => Promise<HistoryItem>;
  get: (id: string) => HistoryItem | undefined;
  remove: (ids: string[]) => HistoryItem[];
  restore: (items: HistoryItem[]) => void;
  clear: () => Promise<void>;
  toggleSaved: (id: string) => void;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

async function deleteThumbs(items: HistoryItem[]) {
  await Promise.all(
    items.map((i) => (i.thumbUri ? FileSystem.deleteAsync(i.thumbUri, { idempotent: true }).catch(() => {}) : null)),
  );
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const uid = user?.uid ?? null;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef<HistoryItem[]>([]);
  // Deleted items are kept here briefly so "Undo" can bring them back; their
  // frames are only removed from disk once the undo window has passed.
  const pendingDelete = useRef<{ items: HistoryItem[]; timer: ReturnType<typeof setTimeout> } | null>(null);

  const persist = useCallback(
    (next: HistoryItem[]) => {
      itemsRef.current = next;
      setItems(next);
      if (uid) AsyncStorage.setItem(keyFor(uid), JSON.stringify(next)).catch(() => {});
    },
    [uid],
  );

  useEffect(() => {
    setLoaded(false);
    setItems([]);
    itemsRef.current = [];
    if (!uid) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(keyFor(uid));
        let list: HistoryItem[] = raw ? JSON.parse(raw) : [];
        if (!raw) {
          // One-time migration from the previous app's history format.
          const legacy = await AsyncStorage.getItem(legacyKeyFor(uid));
          if (legacy) {
            const old = JSON.parse(legacy) as { id: string; createdAt: string; resultData: string }[];
            list = old
              .map((o) => {
                try { return { id: o.id, createdAt: o.createdAt, result: JSON.parse(o.resultData) as IdentifyResult }; }
                catch { return null; }
              })
              .filter((x): x is HistoryItem => x !== null);
            await AsyncStorage.setItem(keyFor(uid), JSON.stringify(list));
            await AsyncStorage.removeItem(legacyKeyFor(uid));
          }
        }
        itemsRef.current = list;
        setItems(list);
      } catch {
        /* start empty */
      } finally {
        setLoaded(true);
      }
    })();
  }, [uid]);

  const add = useCallback(
    async (result: IdentifyResult, frameBase64?: string | null) => {
      const id = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      let thumbUri: string | null = null;
      if (frameBase64 && settings.keepThumbnails) {
        try {
          await FileSystem.makeDirectoryAsync(THUMB_DIR, { intermediates: true }).catch(() => {});
          thumbUri = `${THUMB_DIR}${id}.jpg`;
          await FileSystem.writeAsStringAsync(thumbUri, frameBase64, { encoding: FileSystem.EncodingType.Base64 });
        } catch {
          thumbUri = null;
        }
      }
      const item: HistoryItem = { id, createdAt: new Date().toISOString(), result, thumbUri };
      const next = [item, ...itemsRef.current];
      const overflow = next.splice(MAX_ITEMS);
      deleteThumbs(overflow);
      persist(next);
      return item;
    },
    [persist, settings.keepThumbnails],
  );

  const get = useCallback((id: string) => itemsRef.current.find((i) => i.id === id), []);

  const flushPendingDelete = () => {
    if (pendingDelete.current) {
      clearTimeout(pendingDelete.current.timer);
      deleteThumbs(pendingDelete.current.items);
      pendingDelete.current = null;
    }
  };

  const remove = useCallback(
    (ids: string[]) => {
      flushPendingDelete();
      const removed = itemsRef.current.filter((i) => ids.includes(i.id));
      persist(itemsRef.current.filter((i) => !ids.includes(i.id)));
      pendingDelete.current = { items: removed, timer: setTimeout(flushPendingDelete, 6000) };
      return removed;
    },
    [persist],
  );

  const restore = useCallback(
    (back: HistoryItem[]) => {
      if (pendingDelete.current) {
        clearTimeout(pendingDelete.current.timer);
        pendingDelete.current = null;
      }
      const merged = [...back, ...itemsRef.current].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      persist(merged);
    },
    [persist],
  );

  const clear = useCallback(async () => {
    flushPendingDelete();
    await deleteThumbs(itemsRef.current);
    persist([]);
  }, [persist]);

  const toggleSaved = useCallback(
    (id: string) => persist(itemsRef.current.map((i) => (i.id === id ? { ...i, saved: !i.saved } : i))),
    [persist],
  );

  return (
    <HistoryContext.Provider value={{ items, loaded, add, get, remove, restore, clear, toggleSaved }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}

// Removes every local trace of the signed-in user's scans (used on account deletion).
export async function wipeLocalHistory(uid: string) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    if (raw) await deleteThumbs(JSON.parse(raw));
    await AsyncStorage.multiRemove([keyFor(uid), legacyKeyFor(uid)]);
  } catch {
    /* best effort */
  }
}
