// agent/index.ts
// autonomous scheduler — runs analysis every 30 minutes
// this is the heartbeat of the entire agent
// once started it runs forever with no human involvement

import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { runAnalysis } from "./analyzer";
import { storageHealthCheck, getLastAgentRun } from "./storage";

// ── Config ────────────────────────────────────────────────────────────────────

const INTERVAL_MINUTES = parseInt(
  process.env.AGENT_INTERVAL_MINUTES || "30",
  10
);

// cron expression for every 30 minutes
// "*/30 * * * *" = at minute 0 and 30 of every hour
const CRON_EXPRESSION = `*/${INTERVAL_MINUTES} * * * *`;

// ── Startup ───────────────────────────────────────────────────────────────────

async function startup(): Promise<void> {
  console.log("\n");
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     PINION SIGNAL AGENT STARTING UP      ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`[agent] interval:  every ${INTERVAL_MINUTES} minutes`);
  console.log(`[agent] schedule:  ${CRON_EXPRESSION}`);
  console.log(`[agent] network:   ${process.env.PINION_NETWORK || "base-sepolia"}`);
  console.log(`[agent] wallet:    ${process.env.SKILL_SERVER_PAY_TO || "not set"}`);
  console.log(`[agent] started:   ${new Date().toISOString()}`);
  console.log("──────────────────────────────────────────");

  // verify storage is healthy before starting
  const health = storageHealthCheck();
  if (!health.ok) {
    console.error("[agent] storage health check failed. exiting.");
    process.exit(1);
  }
  console.log("[agent] storage health: OK");

  // check last run
  const lastRun = getLastAgentRun();
  if (lastRun) {
    const lastRunTime = new Date(lastRun.timestamp);
    const minutesAgo = Math.round(
      (Date.now() - lastRunTime.getTime()) / 60000
    );
    console.log(
      `[agent] last run: ${minutesAgo} minutes ago — ` +
      `status: ${lastRun.status} — ` +
      `signals: ${lastRun.signalsGenerated}`
    );
  } else {
    console.log("[agent] no previous runs found — fresh start");
  }

  console.log("──────────────────────────────────────────\n");
}

// ── Run With Error Handling ───────────────────────────────────────────────────

async function safeRun(): Promise<void> {
  try {
    await runAnalysis();
  } catch (err: any) {
    console.error("[agent] unhandled error in analysis run:", err.message);
    console.error("[agent] agent will retry on next scheduled interval");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await startup();

  // run immediately on startup so we have data right away
  console.log("[agent] running initial analysis on startup...");
  await safeRun();

  // then schedule every 30 minutes
  console.log(
    `\n[agent] scheduling runs every ${INTERVAL_MINUTES} minutes...`
  );

  const job = cron.schedule(CRON_EXPRESSION, async () => {
    console.log(
      `\n[agent] scheduled run triggered at ${new Date().toISOString()}`
    );
    await safeRun();
  });

  console.log("[agent] scheduler active. agent is now autonomous.");
  console.log("[agent] press Ctrl+C to stop.\n");

  // graceful shutdown handler
  process.on("SIGINT", () => {
    console.log("\n[agent] received SIGINT. shutting down gracefully...");
    job.stop();
    console.log("[agent] scheduler stopped. goodbye.");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[agent] received SIGTERM. shutting down gracefully...");
    job.stop();
    console.log("[agent] scheduler stopped. goodbye.");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[agent] fatal startup error:", err.message);
  process.exit(1);
});