// In-memory mock of the chrome.* APIs the extension uses. Installed fresh
// before every test (see the beforeEach at the bottom), so no test can see
// another's storage or listeners.
//
// Deliberately a small hand-written mock rather than a library: the surface
// used is small, and a mock whose behaviour is visible here is easier to
// trust than one whose semantics have to be looked up.
import { beforeEach, vi } from "vitest";

type AnyFn = (...args: any[]) => any;

export interface MockEvent<T extends AnyFn = AnyFn> {
  addListener(fn: T): void;
  removeListener(fn: T): void;
  hasListener(fn: T): boolean;
  listeners: Set<T>;
}

function createEvent<T extends AnyFn = AnyFn>(): MockEvent<T> {
  const listeners = new Set<T>();
  return {
    addListener: (fn) => void listeners.add(fn),
    removeListener: (fn) => void listeners.delete(fn),
    hasListener: (fn) => listeners.has(fn),
    listeners,
  };
}

const clone = <T>(value: T): T => (value === undefined ? value : structuredClone(value));

export function createChromeMock() {
  const store: Record<string, unknown> = {};
  const onChanged = createEvent<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>();

  function emit(changes: Record<string, chrome.storage.StorageChange>) {
    if (Object.keys(changes).length === 0) return;
    for (const fn of [...onChanged.listeners]) fn(changes, "local");
  }

  const local = {
    async get(keys?: string | string[] | Record<string, unknown> | null) {
      if (keys == null) return clone({ ...store });
      const out: Record<string, unknown> = {};
      if (typeof keys === "string") {
        if (keys in store) out[keys] = clone(store[keys]);
      } else if (Array.isArray(keys)) {
        for (const key of keys) if (key in store) out[key] = clone(store[key]);
      } else {
        for (const [key, fallback] of Object.entries(keys)) out[key] = key in store ? clone(store[key]) : fallback;
      }
      return out;
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: clone(store[key]), newValue: clone(value) };
        store[key] = clone(value);
      }
      emit(changes);
    },
    async remove(keys: string | string[]) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        if (!(key in store)) continue;
        changes[key] = { oldValue: clone(store[key]) };
        delete store[key];
      }
      emit(changes);
    },
    async clear() {
      await local.remove(Object.keys(store));
    },
  };

  const onMessage = createEvent<(message: any, sender: chrome.runtime.MessageSender, sendResponse: AnyFn) => any>();

  // Messages this context sent with runtime.sendMessage. In the real browser
  // they go to OTHER extension contexts, never back to this context's own
  // listeners, so they are only recorded here.
  const sentMessages: unknown[] = [];

  const runtime = {
    id: "test-extension-id",
    lastError: undefined as chrome.runtime.LastError | undefined,
    onMessage,
    onInstalled: createEvent(),
    getURL: (path: string) => `chrome-extension://test-extension-id/${path.replace(/^\//, "")}`,
    // The parts of the built manifest src/lib/tabs.ts reads, shaped like
    // @crxjs/vite-plugin's output: the LinkedIn entry is a loader, and the
    // module it imports is web-accessible to LinkedIn.
    getManifest: vi.fn(() => ({
      content_scripts: [
        { matches: ["https://carouselabs.com/extension-connect*"], js: ["assets/authRelay.js"] },
        { matches: ["https://www.linkedin.com/*"], js: ["assets/content-script.ts-loader.js"] },
      ],
      web_accessible_resources: [
        { matches: ["https://carouselabs.com/*"], resources: ["assets/authRelay.js"] },
        {
          matches: ["https://www.linkedin.com/*"],
          resources: ["assets/messageThread-abc.js", "assets/content-script.ts-abc123.js"],
        },
      ],
    })),
    sendMessage: vi.fn((message: unknown, callback?: AnyFn) => {
      sentMessages.push(message);
      if (callback) queueMicrotask(() => callback(undefined));
      return Promise.resolve(undefined);
    }),
  };

  const tabs = {
    query: vi.fn(async () => [] as chrome.tabs.Tab[]),
    sendMessage: vi.fn(async () => undefined as unknown),
    create: vi.fn(async (props: chrome.tabs.CreateProperties) => ({ id: 99, ...props }) as chrome.tabs.Tab),
    remove: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    onActivated: createEvent<(info: chrome.tabs.TabActiveInfo) => void>(),
    onUpdated: createEvent<(tabId: number, change: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void>(),
  };

  // The toolbar icon. Tab-specific badge text and title are kept per tab id,
  // like Chrome does, so tests can read what a tab shows.
  const badges = new Map<number, string>();
  const titles = new Map<number, string>();
  const action = {
    setBadgeText: vi.fn(async ({ tabId, text }: { tabId?: number; text: string }) => {
      if (tabId !== undefined) badges.set(tabId, text);
    }),
    setTitle: vi.fn(async ({ tabId, title }: { tabId?: number; title: string }) => {
      if (tabId !== undefined) titles.set(tabId, title);
    }),
    setBadgeBackgroundColor: vi.fn(async () => undefined),
    setBadgeTextColor: vi.fn(async () => undefined),
  };

  const commands = {
    onCommand: createEvent(),
    getAll: vi.fn(async () => [{ name: "generate-comment", shortcut: "Alt+Shift+G" }]),
  };

  const sidePanel = { setPanelBehavior: vi.fn(async () => undefined) };

  const scripting = { executeScript: vi.fn(async () => [] as unknown[]) };

  return {
    storage: { local, onChanged },
    runtime,
    tabs,
    commands,
    sidePanel,
    scripting,
    action,
    // Test-only handles, never present on the real chrome object.
    __store: store,
    __sentMessages: sentMessages,
    __badges: badges,
    __titles: titles,
  };
}

export type ChromeMock = ReturnType<typeof createChromeMock>;

// Delivers a message to every onMessage listener the code under test
// registered, the way chrome.tabs.sendMessage / runtime.sendMessage would from
// another context, and resolves with whatever sendResponse received. Handles
// both a synchronous sendResponse and the `return true` async form.
export function deliverMessage(mock: ChromeMock, message: unknown, sender: chrome.runtime.MessageSender = {}) {
  return new Promise<unknown>((resolve) => {
    let responded = false;
    let keptOpen = false;
    const sendResponse = (response: unknown) => {
      if (responded) return;
      responded = true;
      resolve(response);
    };
    for (const listener of [...mock.runtime.onMessage.listeners]) {
      if (listener(message, sender, sendResponse) === true) keptOpen = true;
    }
    if (!responded && !keptOpen) resolve(undefined);
  });
}

beforeEach(() => {
  (globalThis as unknown as { chrome: ChromeMock }).chrome = createChromeMock();
});

export function chromeMock(): ChromeMock {
  return (globalThis as unknown as { chrome: ChromeMock }).chrome;
}
