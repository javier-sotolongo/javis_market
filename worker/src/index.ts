import { createLogger, getAppEnvironment } from "@javis-market/api";
import { jobs } from "./jobs";

const logger = createLogger("worker");
const HEARTBEAT_MS = 60_000;

const controller = new AbortController();
const timers: NodeJS.Timeout[] = [];
const running = new Set<Promise<void>>();

function schedule(): void {
  for (const job of jobs) {
    const tick = () => {
      if (controller.signal.aborted) return;
      const execution = job
        .run(controller.signal)
        .catch((error: unknown) => {
          logger.error("job failed", { job: job.name, error: String(error) });
        })
        .finally(() => running.delete(execution));
      running.add(execution);
    };
    timers.push(setInterval(tick, job.intervalMs));
  }
  timers.push(setInterval(() => logger.debug("heartbeat", { jobs: jobs.length }), HEARTBEAT_MS));
}

async function shutdown(signal: string): Promise<void> {
  if (controller.signal.aborted) return;
  logger.info("shutting down", { signal });
  controller.abort();
  for (const timer of timers) clearInterval(timer);
  await Promise.allSettled(running);
  logger.info("stopped");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

logger.info("worker started", { environment: getAppEnvironment(), jobs: jobs.map((job) => job.name) });
schedule();
