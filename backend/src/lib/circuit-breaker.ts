import { logger } from "./logger/index.js";
import { metricsRegistry } from "./monitoring/index.js";

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  name: string;
  halfOpenMaxRequests?: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  halfOpenRequests: number;
}

const circuits = new Map<string, CircuitBreakerState>();

export function createCircuitBreaker(options: CircuitBreakerOptions) {
  const {
    failureThreshold = 5,
    successThreshold = 2,
    timeoutMs = 30000,
    name = "unknown",
    halfOpenMaxRequests = 3,
  } = options;

  const getState = (): CircuitBreakerState => {
    let state = circuits.get(name);
    if (!state) {
      state = { state: "closed", failures: 0, successes: 0, lastFailureTime: 0, halfOpenRequests: 0 };
      circuits.set(name, state);
    }
    if (state.state === "open" && Date.now() - state.lastFailureTime >= timeoutMs) {
      state.state = "half-open";
      state.halfOpenRequests = 0;
      logger.info({ circuit: name }, "Circuit breaker transitioning to half-open");
    }
    return state;
  };

  return {
    async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
      const state = getState();

      if (state.state === "open") {
        metricsRegistry.incrementCounter("circuit_breaker_open", { circuit: name });
        if (fallback) return fallback();
        throw new Error(`Circuit breaker ${name} is open`);
      }

      if (state.state === "half-open") {
        if (state.halfOpenRequests >= halfOpenMaxRequests) {
          if (fallback) return fallback();
          throw new Error(`Circuit breaker ${name} is half-open (max requests reached)`);
        }
        state.halfOpenRequests++;
      }

      try {
        const result = await fn();
        state.successes++;
        state.failures = 0;

        if (state.state === "half-open" && state.successes >= successThreshold) {
          state.state = "closed";
          state.successes = 0;
          logger.info({ circuit: name }, "Circuit breaker reset to closed");
        }
        return result;
      } catch (err) {
        state.failures++;
        state.successes = 0;
        state.lastFailureTime = Date.now();

        if (state.state === "half-open" || state.failures >= failureThreshold) {
          state.state = "open";
          state.failures = 0;
          logger.warn({ circuit: name, error: (err as Error).message }, "Circuit breaker opened");
          metricsRegistry.incrementCounter("circuit_breaker_opened", { circuit: name });
        }

        if (fallback) return fallback();
        throw err;
      }
    },

    getState(): CircuitState {
      return getState().state;
    },

    reset(): void {
      circuits.set(name, { state: "closed", failures: 0, successes: 0, lastFailureTime: 0, halfOpenRequests: 0 });
      logger.info({ circuit: name }, "Circuit breaker manually reset");
    },
  };
}

export function getCircuitBreakerState(name: string): CircuitState {
  return circuits.get(name)?.state || "closed";
}

export function getAllCircuitBreakerStates(): Record<string, CircuitState> {
  const result: Record<string, CircuitState> = {};
  for (const [name, state] of circuits) {
    result[name] = state.state;
  }
  return result;
}
