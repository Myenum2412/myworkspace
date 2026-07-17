import { EventEmitter } from "events";

export class MockRedisClient extends EventEmitter {
  private store = new Map<string, string>();
  public status = "ready";
  private _connected = true;

  connect() {
    this._connected = true;
    this.status = "ready";
    this.emit("connect");
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  setex(key: string, _ttl: number, value: string): Promise<"OK"> {
    this.store.set(key, value);
    return Promise.resolve("OK");
  }

  set(key: string, value: string): Promise<"OK"> {
    this.store.set(key, value);
    return Promise.resolve("OK");
  }

  del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return Promise.resolve(count);
  }

  keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Promise.resolve(Array.from(this.store.keys()).filter((k) => regex.test(k)));
  }

  flushall(): Promise<"OK"> {
    this.store.clear();
    return Promise.resolve("OK");
  }

  quit(): Promise<"OK"> {
    this._connected = false;
    this.status = "end";
    this.emit("close");
    return Promise.resolve("OK");
  }

  duplicate(): MockRedisClient {
    const clone = new MockRedisClient();
    clone.store = this.store;
    return clone;
  }

  call(...args: string[]) {
    if (args[0] === "SET") {
      this.store.set(args[1], args[2] ?? "");
      if (args[3] === "EX" && args[4]) {
        // TTL handling is simplified
      }
      return Promise.resolve("OK");
    }
    return Promise.resolve(null);
  }

  get isMock() {
    return true;
  }
}
