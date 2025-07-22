#!/usr/bin/env node
import { run } from "./index";
import { showStatus } from "./utils/status";
import { executeCodeCommand } from "./utils/codeCommand";
import { cleanupPidFile, isServiceRunning } from "./utils/processCheck";
import { version } from "../package.json";
import { displayServiceStatus } from "./utils/banner";
import { spawn } from "child_process";
import { PID_FILE, REFERENCE_COUNT_FILE } from "./constants";
import fs, { existsSync, readFileSync } from "fs";
import {join} from "path";

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Parse --retry option
let retryAttempts = 3; // Default value
const retryIndex = args.findIndex(arg => arg === '--retry');
if (retryIndex !== -1 && args[retryIndex + 1]) {
  const retryValue = parseInt(args[retryIndex + 1]);
  if (!isNaN(retryValue) && retryValue >= 0) {
    retryAttempts = retryValue;
    // Remove --retry and its value from args
    args.splice(retryIndex, 2);
  }
}

const HELP_TEXT = `
╔════════════════════════════════════════════════════════╗
║           Claude Code Router Enhanced v${version.padEnd(10)} ║
╚════════════════════════════════════════════════════════╝

Usage: ccr [command] [options]

Commands:
  start [--retry N] Start server with retry configuration
  stop              Stop server
  restart           Restart server
  status            Show server status
  code [args...]    Execute claude command
  -v, version       Show version information
  -h, help          Show help information

Options:
  --retry N         Set retry attempts for API failures (default: 3)

Features:
  🔄 Auto-retry with exponential backoff (configurable)
  ⚡ Intelligent model routing
  🛡️  Enhanced error handling
  🔍 Smart Claude Code detection

Examples:
  ccr start --retry 5
  ccr code "Write a Hello World"
  ccr start --retry 0    # Disable retry

Note: Requires @anthropic-ai/claude-code to be installed globally
`;

async function waitForService(
  timeout = 10000,
  initialDelay = 1000
): Promise<boolean> {
  // Wait for an initial period to let the service initialize
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (isServiceRunning()) {
      // Wait for an additional short period to ensure service is fully ready
      await new Promise((resolve) => setTimeout(resolve, 500));
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function main() {
  switch (command) {
    case "start":
      // Pass retry attempts to the server
      process.env.RETRY_ATTEMPTS = retryAttempts.toString();
      run();
      break;
    case "stop":
      try {
        const pid = parseInt(readFileSync(PID_FILE, "utf-8"));
        process.kill(pid);
        cleanupPidFile();
        if (existsSync(REFERENCE_COUNT_FILE)) {
          try {
            fs.unlinkSync(REFERENCE_COUNT_FILE);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        displayServiceStatus('stopped');
      } catch (e) {
        console.log(
          "Failed to stop the service. It may have already been stopped."
        );
        cleanupPidFile();
      }
      break;
    case "status":
      await showStatus();
      break;
    case "code":
      if (!isServiceRunning()) {
        console.log("Service not running, starting service...");
        const cliPath = join(__dirname, "cli.js");
        const startArgs = ["start"];
        if (retryAttempts !== 3) { // Only pass if different from default
          startArgs.push("--retry", retryAttempts.toString());
        }
        const startProcess = spawn("node", [cliPath, ...startArgs], {
          detached: true,
          stdio: "ignore",
        });

        startProcess.on("error", (error) => {
          console.error("Failed to start service:", error);
          process.exit(1);
        });

        startProcess.unref();

        if (await waitForService()) {
          // Remove --retry args from the arguments passed to code command
          const codeArgs = process.argv.slice(3).filter((arg, index, arr) => {
            if (arg === '--retry') return false;
            if (arr[index - 1] === '--retry') return false;
            return true;
          });
          executeCodeCommand(codeArgs);
        } else {
          console.error(
            "Service startup timeout, please manually run `ccr start` to start the service"
          );
          process.exit(1);
        }
      } else {
        // Remove --retry args from the arguments passed to code command
        const codeArgs = process.argv.slice(3).filter((arg, index, arr) => {
          if (arg === '--retry') return false;
          if (arr[index - 1] === '--retry') return false;
          return true;
        });
        executeCodeCommand(codeArgs);
      }
      break;
    case "-v":
    case "version":
      console.log(`
╔════════════════════════════════════════════════════════╗
║           Claude Code Router Enhanced                  ║
║                                                        ║
║  🚀 Version: ${version.padEnd(30)} ║
║  📦 Package: @musistudio/claude-code-router            ║
║  🔄 Auto-retry: ✅ Enabled                            ║
║  ⚡ Smart routing: ✅ Enabled                         ║
║                                                        ║
║  Repo: github.com/musistudio/claude-code-router       ║
╚════════════════════════════════════════════════════════╝`);
      break;
    case "-h":
    case "help":
      console.log(HELP_TEXT);
      break;
    default:
      console.log(HELP_TEXT);
      process.exit(1);
  }
}

main().catch(console.error);
