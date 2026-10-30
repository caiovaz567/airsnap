const ROOT = "airsnap.";
let scope = "";

export function setStorageScope(userId: string | null): void {
  scope = userId ? `${userId}.` : "";
}

function full(key: string): string {
  return ROOT + scope + key;
}

export const storage = {
  get<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(full(key)) ?? "null") as T | null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(full(key), JSON.stringify(value));
    } catch {
      return;
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(full(key));
    } catch {
      return;
    }
  },
  clearAll(): void {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(ROOT))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      return;
    }
  },
};
