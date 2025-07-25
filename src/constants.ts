import path from "node:path";
import os from "node:os";

export const HOME_DIR = path.join(os.homedir(), ".claude-code-router");

export const CONFIG_FILE = process.env.NODE_ENV === 'development'
  ? path.join(HOME_DIR, "config-dev.json")
  : path.join(HOME_DIR, "config.json");

export const PLUGINS_DIR = path.join(HOME_DIR, "plugins");

export function getPidFile(isDev?: boolean): string {
  const isDevelopment = isDev ?? process.env.NODE_ENV === 'development';
  return isDevelopment
    ? path.join(HOME_DIR, ".claude-code-router-dev.pid")
    : path.join(HOME_DIR, ".claude-code-router.pid");
}

export const REFERENCE_COUNT_FILE = path.join(os.tmpdir(), "claude-code-reference-count.txt");


export const DEFAULT_CONFIG = {
  LOG: false,
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "",
  OPENAI_MODEL: "",
};
