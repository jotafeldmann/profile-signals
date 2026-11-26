// The few extension APIs the tests call inside the service worker. @types/chrome would add a dependency for this.
declare const chrome: {
  runtime: {getURL(path: string): string};
  storage: {local: {get(key: string | null): Promise<Record<string, any>>; set(items: Record<string, unknown>): Promise<void>}};
};
