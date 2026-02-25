// main.ts
// single entry point for Render deployment
// starts combined server + agent scheduler together

import dotenv from "dotenv";
dotenv.config();

import { spawn } from "child_process";

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
      console.error(`[main] ${name} crashed — restarting in 5s...`);
      setTimeout(() => startProcess(name, script), 5000);
    }
  });

  processes.push(proc);
}

// start combined server (free + paid on one port)
startProcess("server", "server/index.ts");

// start autonomous agent scheduler
startProcess("agent", "agent/index.ts");

process.on("SIGINT", () => {
  console.log("\n[main] shutting down...");
  processes.forEach((p) => p.kill());
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[main] shutting down...");
  processes.forEach((p) => p.kill());
  process.exit(0);
});

console.log("[main] pinion-signal-agent starting...");
