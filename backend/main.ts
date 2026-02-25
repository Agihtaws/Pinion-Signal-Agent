// main.ts

import dotenv from "dotenv";
dotenv.config();

import { spawn } from "child_process";
import path from "path";

const processes: ReturnType<typeof spawn>[] = [];

function startProcess(name: string, script: string): void {
  console.log(`[main] starting ${name}...`);

  const proc = spawn("npx", ["ts-node", script], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  proc.on("exit", (code) => {
    console.error(`[main] ${name} exited with code ${code}`);
    if (code !== 0) {
      console.error(`[main] ${name} crashed. restarting in 5 seconds...`);
      setTimeout(() => startProcess(name, script), 5000);
    }
  });

  processes.push(proc);
}

// start all three processes
startProcess("skill-server", "server/index.ts");
startProcess("signal-server", "server/signal-server.ts");
startProcess("agent", "agent/index.ts");

// shutdown
process.on("SIGINT", () => {
  console.log("\n[main] shutting down all processes...");
  processes.forEach((p) => p.kill());
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[main] shutting down all processes...");
  processes.forEach((p) => p.kill());
  process.exit(0);
});

console.log("[main] pinion-signal-agent starting all services...");