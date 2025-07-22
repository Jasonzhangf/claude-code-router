import { spawn } from "child_process";
import {
  incrementReferenceCount,
  decrementReferenceCount,
} from "./processCheck";
import { closeService } from "./close";
import { readConfigFile } from ".";
import { log } from "./log";
import { displayServiceStatus } from "./banner";
import { version } from "../../package.json";

async function checkClaudeInstallation(): Promise<string | null> {
  return new Promise((resolve) => {
    // Use 'which' command to find claude
    const whichProcess = spawn('which', ['claude'], {
      stdio: 'pipe',
      shell: false,
    });

    let output = '';
    whichProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    whichProcess.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        // Fallback: try executing claude directly
        const testProcess = spawn('claude', ['--version'], {
          stdio: 'pipe',
          shell: true,
        });

        testProcess.on('close', (testCode) => {
          if (testCode === 0) {
            resolve('claude');
          } else {
            resolve(null);
          }
        });

        testProcess.on('error', () => {
          resolve(null);
        });
      }
    });

    whichProcess.on('error', () => {
      // Fallback: try executing claude directly
      const testProcess = spawn('claude', ['--version'], {
        stdio: 'pipe',
        shell: true,
      });

      testProcess.on('close', (testCode) => {
        if (testCode === 0) {
          resolve('claude');
        } else {
          resolve(null);
        }
      });

      testProcess.on('error', () => {
        resolve(null);
      });
    });
  });
}

export async function executeCodeCommand(args: string[] = []) {
  // Display enhanced version info
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 Claude Code Router Enhanced v${version.padEnd(10)} Active  ║
║  🔄 Auto-retry enabled • ⚡ Smart routing enabled      ║
║  🛡️  Enhanced error handling • 🔍 Smart detection     ║
╚════════════════════════════════════════════════════════╝

Starting Claude Code with enhanced routing...
`);

  // Check if claude command exists
  let claudePath = await checkClaudeInstallation();
  
  if (!claudePath) {
    console.log("❌ Claude Code is not installed or not accessible.");
    printInstallationHelp();
    process.exit(1);
  }

  log(`Found claude command at: ${claudePath}`);

  // Set environment variables
  const config = await readConfigFile();
  const env = {
    ...process.env,
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${config.PORT || 3456}`,
    API_TIMEOUT_MS: "600000",
  };

  // Clean up conflicting auth variables
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_API_KEY;

  // Set only one auth method
  if (config?.APIKEY) {
    env.ANTHROPIC_API_KEY = config.APIKEY;
  } else {
    env.ANTHROPIC_API_KEY = "ccr-proxy-key";
  }

  // Increment reference count when command starts
  incrementReferenceCount();

  log(`Executing claude command: ${claudePath} ${args.join(' ')}`);

  // Execute claude command
  const claudeProcess = spawn(claudePath, args, {
    env,
    stdio: "inherit",
    shell: true,
  });

  claudeProcess.on("error", (error) => {
    console.error("❌ Failed to start claude command:", error.message);
    decrementReferenceCount();
    process.exit(1);
  });

  claudeProcess.on("close", (code) => {
    decrementReferenceCount();
    closeService();
    process.exit(code || 0);
  });
}

function printInstallationHelp() {
  console.log("");
  console.log("📋 Claude Code is required but not found in PATH.");
  console.log("");
  console.log("To install Claude Code:");
  console.log("  npm install -g @anthropic-ai/claude-code");
  console.log("");
  console.log("After installation, try again:");
  console.log("  ccr code");
  console.log("");
  console.log("💡 Claude Code Router works as a proxy for the official Claude Code CLI.");
  console.log("   Make sure 'claude' command is accessible in your PATH.");
}
