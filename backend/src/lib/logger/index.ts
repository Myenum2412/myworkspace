import { env } from "../../config/env.js";

const isTest = env.NODE_ENV === "test";

type LogArg = string | Record<string, unknown>;

export interface Logger {
  level: string;
  info: (...args: LogArg[]) => void;
  warn: (...args: LogArg[]) => void;
  error: (...args: LogArg[]) => void;
  debug: (...args: LogArg[]) => void;
  fatal: (...args: LogArg[]) => void;
  trace: (...args: LogArg[]) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

function formatArgs(prefix: string, level: string, args: LogArg[]): [string, ...any[]] {
  if (args.length === 0) return [`[${level}] ${prefix}`];
  if (typeof args[0] === "string") {
    return [`[${level}] ${prefix} ${args[0]}`, ...args.slice(1)];
  }
  const { msg, ...rest } = args[0] as Record<string, unknown>;
  const message = typeof msg === "string" ? msg : JSON.stringify(args[0]);
  return [`[${level}] ${prefix} ${message}`, rest, ...args.slice(1)];
}

function createConsoleLogger(name?: string): Logger {
  const prefix = name ? `[${name}]` : "";
  const noop = () => {};
  if (isTest) {
    return {
      level: "silent",
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
      fatal: noop,
      trace: noop,
      child: () => createConsoleLogger(name),
    };
  }
  return {
    level: "debug",
    info: (...args: LogArg[]) => console.log(...formatArgs(prefix, "INFO", args)),
    warn: (...args: LogArg[]) => console.warn(...formatArgs(prefix, "WARN", args)),
    error: (...args: LogArg[]) => console.error(...formatArgs(prefix, "ERROR", args)),
    debug: (...args: LogArg[]) => console.debug(...formatArgs(prefix, "DEBUG", args)),
    fatal: (...args: LogArg[]) => console.error(...formatArgs(prefix, "FATAL", args)),
    trace: (...args: LogArg[]) => console.trace(...formatArgs(prefix, "TRACE", args)),
    child: (bindings: Record<string, unknown>) => createConsoleLogger((bindings.module as string) || name),
  };
}

export const logger = createConsoleLogger();
export const uploadLogger = createConsoleLogger("upload");
export const queueLogger = createConsoleLogger("queue");
export const storageLogger = createConsoleLogger("storage");
export const authLogger = createConsoleLogger("auth");
export const rbacLogger = createConsoleLogger("rbac");

export function createModuleLogger(module: string): Logger {
  return createConsoleLogger(module);
}

export function initializeLogger() {}
