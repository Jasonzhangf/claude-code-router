#!/usr/bin/env node
import { run } from "./index";
import { showStatus } from "./utils/status";
import { executeCodeCommand } from "./utils/codeCommand";
import { cleanupPidFile, isServiceRunning } from "./utils/processCheck";
import { version } from "../package.json";
import { displayServiceStatus } from "./utils/banner";
import { spawn } from "child_process";
import { getPidFile, REFERENCE_COUNT_FILE } from "./constants";
import fs, { existsSync, readFileSync } from "fs";
import {join} from "path";
import TokenUtils from "./utils/tokenUtils";

// Parse command line arguments
const args = process.argv.slice(2);
const isDev = args.includes('--dev');

// Set NODE_ENV immediately based on the --dev flag
if (isDev) {
  process.env.NODE_ENV = 'development';
  console.log('🔧 Running in development mode');
}

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
  token refresh     Manually refresh all tokens
  token status      Show current token status
  token reset       Reset token refresh check
  -v, version       Show version information
  -h, help          Show help information

Options:
  --retry N         Set retry attempts for API failures (default: 3)
  --dev             Use development configuration (config-dev.json)

Features:
  🔄 Auto-retry with exponential backoff (configurable)
  ⚡ Intelligent model routing
  🛡️  Enhanced error handling
  🔍 Smart Claude Code detection
  🧪 Development mode with K2CC transformer
  🔑 Automatic token refresh before each request

Examples:
  ccr start --retry 5
  ccr code "Write a Hello World"
  ccr code --dev "Test with K2CC transformer"
  ccr start --dev    # Start with development config
  ccr start --retry 0    # Disable retry
  ccr token refresh   # Manually refresh tokens
  ccr token status    # Check token status

Note: Requires @anthropic-ai/claude-code to be installed globally
`;

async function waitForService(
  isDev: boolean,
  timeout = 10000,
  initialDelay = 1000
): Promise<boolean> {
  // Wait for an initial period to let the service initialize
  await new Promise((resolve) => setTimeout(resolve, initialDelay));

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (isServiceRunning(isDev)) {
      // Wait for an additional short period to ensure service is fully ready
      await new Promise((resolve) => setTimeout(resolve, 500));
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function handleTokenCommand(tokenCommand: string) {
  switch (tokenCommand) {
    case "refresh":
      try {
        await TokenUtils.refreshTokens();
      } catch (error) {
        console.error("Failed to refresh tokens:", error);
        process.exit(1);
      }
      break;
    case "status":
      try {
        const status = await TokenUtils.getTokenStatus();
        console.log("🔑 Token Status:");
        console.log(JSON.stringify(status, null, 2));
      } catch (error) {
        console.error("Failed to get token status:", error);
        process.exit(1);
      }
      break;
    case "reset":
      TokenUtils.resetTokenCheck();
      break;
    default:
      console.log("Unknown token command. Available commands: refresh, status, reset");
      process.exit(1);
  }
}

async function main() {
  switch (command) {
    case "start":
      // Pass retry attempts to the server
      process.env.RETRY_ATTEMPTS = retryAttempts.toString();
      await run();
      break;
    case "token":
      const tokenCommand = args[1];
      await handleTokenCommand(tokenCommand);
      break;
        case "stop":
      try {
        const pidFile = getPidFile(isDev);
        const pid = parseInt(readFileSync(pidFile, "utf-8"));
        process.kill(pid);
        cleanupPidFile(isDev);
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
        cleanupPidFile(isDev);
      }
      break;
    case "status":
      await showStatus();
      break;
    case "code":
            const hasDevFlag = isDev;
      if (hasDevFlag && process.env.NODE_ENV !== 'development') {
        process.env.NODE_ENV = 'development';
        console.log('🔧 Code command running in development mode');
      }
      
      if (!isServiceRunning(hasDevFlag)) {
        console.log("Service not running, starting service...");
        const cliPath = join(__dirname, "cli.js");
        const startArgs = ["start"];
        if (hasDevFlag) {
          startArgs.push("--dev");
        }
        if (retryAttempts !== 3) { // Only pass if different from default
          startArgs.push("--retry", retryAttempts.toString());
        }
        const startProcess = spawn(process.execPath, [cliPath, ...startArgs], {
          detached: true,
          stdio: "ignore",
        });

        startProcess.on("error", (error) => {
          console.error("Failed to start service:", error);
          process.exit(1);
        });

        startProcess.unref();

        if (await waitForService(hasDevFlag)) {
          // Remove --retry and --dev args from the arguments passed to code command
          const codeArgs = process.argv.slice(3).filter((arg, index, arr) => {
            if (arg === '--retry') return false;
            if (arr[index - 1] === '--retry') return false;
            if (arg === '--dev') return false;
            return true;
          });
          executeCodeCommand(codeArgs, hasDevFlag);
        } else {
          console.error(
            "Service startup timeout, please manually run `ccr start` to start the service"
          );
          process.exit(1);
        }
      } else {
        // Remove --retry and --dev args from the arguments passed to code command
        const codeArgs = process.argv.slice(3).filter((arg, index, arr) => {
          if (arg === '--retry') return false;
          if (arr[index - 1] === '--retry') return false;
          if (arg === '--dev') return false;
          return true;
        });
        executeCodeCommand(codeArgs, hasDevFlag);
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
