const SESSION_LURE_KEY_PREFIX = "catchlogs:session-lure:";
const SESSION_BAIT_KEY_PREFIX = "catchlogs:session-bait:";
const SESSION_GEAR_VISIBLE_KEY_PREFIX = "catchlogs:session-gear-visible:";
const LEGACY_SESSION_TACKLE_KEY_PREFIX = "catchlogs:session-tackle:";
const LEGACY_SESSION_TACKLE_VISIBLE_KEY_PREFIX = "catchlogs:session-tackle-visible:";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function lureKeyForUser(userId: string) {
  return `${SESSION_LURE_KEY_PREFIX}${userId}`;
}

function baitKeyForUser(userId: string) {
  return `${SESSION_BAIT_KEY_PREFIX}${userId}`;
}

function visibilityKeyForUser(userId: string) {
  return `${SESSION_GEAR_VISIBLE_KEY_PREFIX}${userId}`;
}

export function loadSessionLure(userId: string): string {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(lureKeyForUser(userId)) ?? "";
}

export function saveSessionLure(userId: string, value: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(lureKeyForUser(userId), value);
}

export function loadSessionBait(userId: string): string {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(baitKeyForUser(userId)) ?? "";
}

export function saveSessionBait(userId: string, value: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(baitKeyForUser(userId), value);
}

export function loadSessionGearVisibility(userId: string): boolean {
  const storage = getStorage();
  if (!storage) return true;

  const current = storage.getItem(visibilityKeyForUser(userId));
  if (current !== null) {
    return current === "1";
  }

  const legacy = storage.getItem(`${LEGACY_SESSION_TACKLE_VISIBLE_KEY_PREFIX}${userId}`);
  if (legacy !== null) {
    return legacy === "1";
  }

  return true;
}

export function saveSessionGearVisibility(userId: string, visible: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(visibilityKeyForUser(userId), visible ? "1" : "0");
}

export function clearSessionGearStorage() {
  const storage = getStorage();
  if (!storage) return;

  const keysToClear: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (
      key.startsWith(SESSION_LURE_KEY_PREFIX) ||
      key.startsWith(SESSION_BAIT_KEY_PREFIX) ||
      key.startsWith(SESSION_GEAR_VISIBLE_KEY_PREFIX) ||
      key.startsWith(LEGACY_SESSION_TACKLE_KEY_PREFIX) ||
      key.startsWith(LEGACY_SESSION_TACKLE_VISIBLE_KEY_PREFIX)
    ) {
      keysToClear.push(key);
    }
  }

  keysToClear.forEach((key) => storage.removeItem(key));
}
