import pino from "pino";
import { env } from "../../config/env.js";

const isTest = env.NODE_ENV === "test";
const isDev = env.NODE_ENV !== "production";

const pinoLogger = pino({
  level: isTest ? "silent" : (env.LOG_LEVEL || (isDev ? "debug" : "info")),
  transport: isDev ? {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss.l" },
  } : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "password", "secret", "token"],
    censor: "[REDACTED]",
  },
});

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

function createPinoLogger(name?: string): Logger {
  const instance = name ? pinoLogger.child({ module: name }) : pinoLogger;

  const adapt = (level: string, args: LogArg[]) => {
    const logFn = instance[level as keyof typeof instance] as unknown as (...a: unknown[]) => void;
    if (args.length === 0) return logFn("");
    if (typeof args[0] === "string") {
      logFn(args[0], ...args.slice(1));
    } else {
      const { msg, ...rest } = args[0] as Record<string, unknown>;
      logFn(rest, (msg as string) || "");
    }
  };

  return {
    level: instance.level,
    info: (...args: LogArg[]) => adapt("info", args),
    warn: (...args: LogArg[]) => adapt("warn", args),
    error: (...args: LogArg[]) => adapt("error", args),
    debug: (...args: LogArg[]) => adapt("debug", args),
    fatal: (...args: LogArg[]) => adapt("fatal", args),
    trace: (...args: LogArg[]) => adapt("trace", args),
    child: (bindings: Record<string, unknown>) => createPinoLogger((bindings.module as string) || name),
  };
}

export const logger = createPinoLogger();
export const uploadLogger = createPinoLogger("upload");
export const queueLogger = createPinoLogger("queue");
export const storageLogger = createPinoLogger("storage");
export const authLogger = createPinoLogger("auth");
export const rbacLogger = createPinoLogger("rbac");

export function createModuleLogger(module: string): Logger {
  return createPinoLogger(module);
}

export function initializeLogger() {}
