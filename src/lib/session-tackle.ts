const SESSION_TACKLE_KEY_PREFIX = "catchlogs:session-tackle:";
const SESSION_TACKLE_VISIBLE_KEY_PREFIX = "catchlogs:session-tackle-visible:";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

function tackleKeyForUser(userId: string) {
  return `${SESSION_TACKLE_KEY_PREFIX}${userId}`;
}

function visibilityKeyForUser(userId: string) {
  return `${SESSION_TACKLE_VISIBLE_KEY_PREFIX}${userId}`;
}

export function loadSessionTackle(userId: string): string {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(tackleKeyForUser(userId)) ?? "";
}

export function saveSessionTackle(userId: string, value: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(tackleKeyForUser(userId), value);
}

export function loadSessionTackleVisibility(userId: string): boolean {
  const storage = getStorage();
  if (!storage) return true;
  const raw = storage.getItem(visibilityKeyForUser(userId));
  if (raw === null) return true;
  return raw === "1";
}

export function saveSessionTackleVisibility(userId: string, visible: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(visibilityKeyForUser(userId), visible ? "1" : "0");
}

export function clearSessionTackleStorage() {
  const storage = getStorage();
  if (!storage) return;

  const keysToClear: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (
      key.startsWith(SESSION_TACKLE_KEY_PREFIX) ||
      key.startsWith(SESSION_TACKLE_VISIBLE_KEY_PREFIX)
    ) {
      keysToClear.push(key);
    }
  }

  keysToClear.forEach((key) => storage.removeItem(key));
}
