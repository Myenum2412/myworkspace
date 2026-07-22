import { schedulerService } from "./scheduler.service.js";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";
import { SchedulerHealth } from "./types.js";

class SchedulerHealthService {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastHealth: SchedulerHealth | null = null;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  startMonitoring(intervalMs = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    logger.info({ intervalMs }, "Scheduler health monitoring started");
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info("Scheduler health monitoring stopped");
    }
  }

  private async performHealthCheck(): Promise<SchedulerHealth> {
    try {
      const health = await schedulerService.getHealth();
      this.lastHealth = health;

      metricsRegistry.setGauge("scheduler_health_status", {}, health.status === "healthy" ? 1 : 0);
      metricsRegistry.setGauge("scheduler_active_workers", {}, health.activeWorkers);
      metricsRegistry.setGauge("scheduler_total_jobs", {}, health.totalJobs);
      metricsRegistry.setGauge("scheduler_uptime_seconds", {}, health.uptimeSeconds);
      metricsRegistry.setGauge("scheduler_memory_mb", {}, health.memoryUsageMb);

      if (health.status === "healthy") {
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
        logger.warn({ health, consecutiveFailures: this.consecutiveFailures }, "Scheduler health degraded");
      }

      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        logger.error(
          { consecutiveFailures: this.consecutiveFailures, health },
          "Scheduler unhealthy - attempting recovery"
        );
        await this.attemptRecovery();
      }

      return health;
    } catch (err: any) {
      this.consecutiveFailures++;
      logger.error({ err, consecutiveFailures: this.consecutiveFailures }, "Health check failed");

      const degraded: SchedulerHealth = {
        status: "unhealthy",
        breeRunning: false,
        mongoConnected: false,
        totalJobs: 0,
        activeWorkers: 0,
        lastHeartbeat: null,
        uptimeSeconds: 0,
        memoryUsageMb: 0,
        errors: [err.message],
      };

      this.lastHealth = degraded;

      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        await this.attemptRecovery();
      }

      return degraded;
    }
  }

  private async attemptRecovery(): Promise<void> {
    try {
      logger.info("Attempting scheduler recovery");

      if (!schedulerService.isInitialized()) {
        await schedulerService.initialize();
        logger.info("Scheduler re-initialized during recovery");
      }

      this.consecutiveFailures = 0;
    } catch (err: any) {
      logger.error({ err }, "Scheduler recovery failed");
    }
  }

  getLastHealth(): SchedulerHealth | null {
    return this.lastHealth;
  }

  forceHealthCheck(): Promise<SchedulerHealth> {
    return this.performHealthCheck();
  }
}

export const schedulerHealthService = new SchedulerHealthService();
