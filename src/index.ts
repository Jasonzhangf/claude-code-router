import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { initConfig, initDir } from "./utils";
import { createServer } from "./server";
import { router } from "./utils/router";
import { apiKeyAuth } from "./middleware/auth";
import k2ccTransformer from "./transformers/k2cc";
import requestLoggerTransformer from "./transformers/request-logger";
import {
  cleanupPidFile,
  isServiceRunning,
  savePid,
} from "./utils/processCheck";
import { CONFIG_FILE } from "./constants";
import { displayStartupBanner, displayServiceStatus } from "./utils/banner";
import { initializeTokens, setupPeriodicTokenRefresh, cleanupTokens } from "./utils/startup";

async function initializeClaudeConfig() {
  const homeDir = homedir();
  const configPath = join(homeDir, ".claude.json");
  if (!existsSync(configPath)) {
    const userID = Array.from(
      { length: 64 },
      () => Math.random().toString(16)[2]
    ).join("");
    const configContent = {
      numStartups: 184,
      autoUpdaterStatus: "enabled",
      userID,
      hasCompletedOnboarding: true,
      lastOnboardingVersion: "1.0.17",
      projects: {},
    };
    await writeFile(configPath, JSON.stringify(configContent, null, 2));
  }
}

interface RunOptions {
  port?: number;
}

async function run(options: RunOptions = {}) {
  // Display startup banner
  displayStartupBanner();
  
  // Check if service is already running
  if (isServiceRunning()) {
    displayServiceStatus('running');
    return;
  }
  
  displayServiceStatus('starting');

  // Initialize token system first
  await initializeTokens();

  await initializeClaudeConfig();
  await initDir();
  const config = await initConfig();
  let HOST = config.HOST;

  if (config.HOST && !config.APIKEY) {
    HOST = "127.0.0.1";
    console.warn(
      "⚠️ API key is not set. HOST is forced to 127.0.0.1."
    );
  }

  const port = options.port || config.PORT || config.Server?.port || 3456;

  // Save the PID of the background process
  savePid(process.pid);

  // Handle SIGINT (Ctrl+C) to clean up PID file
  process.on("SIGINT", () => {
    console.log("Received SIGINT, cleaning up...");
    cleanupTokens();
    cleanupPidFile();
    process.exit(0);
  });

  // Handle SIGTERM to clean up PID file
  process.on("SIGTERM", () => {
    cleanupTokens();
    cleanupPidFile();
    process.exit(0);
  });
  console.log(HOST)

  // Use port from environment variable if set (for background process)
  const servicePort = process.env.SERVICE_PORT
    ? parseInt(process.env.SERVICE_PORT)
    : port;
  const server = createServer({
    jsonPath: CONFIG_FILE,
    initialConfig: {
      // ...config,
      providers: config.Providers || config.providers,
      HOST: HOST,
      PORT: servicePort || port,
      LOG_FILE: join(
        homedir(),
        ".claude-code-router",
        "claude-code-router.log"
      ),
    },
  });
  // Register k2cc transformer manually since it's not in @musistudio/llms package
  if (server.transformerService) {
    server.transformerService.registerTransformer('k2cc', k2ccTransformer);
    console.log('✅ K2cc transformer registered successfully');
  } else {
    console.warn('⚠️ TransformerService not available - k2cc transformer not registered');
  }

  server.addHook("preHandler", apiKeyAuth(config));
  server.addHook("preHandler", async (req, reply) =>
    router(req, reply, config)
  );

  // Health check endpoint already provided by @musistudio/llms
  
  // Setup periodic token refresh
  setupPeriodicTokenRefresh();

  // Start server and display status
  console.log(`[DEBUG] Starting server on port: ${servicePort || port}`);
  await server.start();
  displayServiceStatus('running', servicePort);
}

export { run };
// run();
