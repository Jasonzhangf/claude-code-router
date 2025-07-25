import fs from "node:fs/promises";
import readline from "node:readline";
import path from "node:path";
import {
  DEFAULT_CONFIG,
  HOME_DIR,
  PLUGINS_DIR,
} from "../constants";

const getConfigFile = () => {
  return process.env.NODE_ENV === 'development'
    ? path.join(HOME_DIR, "config-dev.json")
    : path.join(HOME_DIR, "config.json");
};

const ensureDir = async (dir_path: string) => {
  try {
    await fs.access(dir_path);
  } catch {
    await fs.mkdir(dir_path, { recursive: true });
  }
};

export const initDir = async () => {
  await ensureDir(HOME_DIR);
  await ensureDir(PLUGINS_DIR);
};

const createReadline = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
};

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    const rl = createReadline();
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const confirm = async (query: string): Promise<boolean> => {
  const answer = await question(query);
  return answer.toLowerCase() !== "n";
};

export const readConfigFile = async () => {
  const configFile = getConfigFile();
  try {
    const config = await fs.readFile(configFile, "utf-8");
    return JSON.parse(config);
  } catch {
    // Check if we're in development mode and config-dev.json exists
    if (process.env.NODE_ENV === 'development') {
      const devConfigFile = path.join(HOME_DIR, "config-dev.json");
      try {
        const devConfig = await fs.readFile(devConfigFile, "utf-8");
        console.log('✅ Using existing config-dev.json');
        return JSON.parse(devConfig);
      } catch {
        // Fall through to interactive setup
      }
    }
    
    // Check if production config.json exists
    const prodConfigFile = path.join(HOME_DIR, "config.json");
    try {
      const prodConfig = await fs.readFile(prodConfigFile, "utf-8");
      console.log('✅ Using existing config.json');
      return JSON.parse(prodConfig);
    } catch {
      // Fall through to interactive setup
    }
    
    console.log('⚠️ No configuration file found, starting interactive setup...');
    const name = await question("Enter Provider Name: ");
    const APIKEY = await question("Enter Provider API KEY: ");
    const baseUrl = await question("Enter Provider URL: ");
    const model = await question("Enter MODEL Name: ");
    const config = Object.assign({}, DEFAULT_CONFIG, {
      Providers: [
        {
          name,
          api_base_url: baseUrl,
          api_key: APIKEY,
          models: [model],
        },
      ],
      Router: {
        default: `${name},${model}`,
      },
    });
    await writeConfigFile(config);
    return config;
  }
};

export const writeConfigFile = async (config: any) => {
  const configFile = getConfigFile();
  await ensureDir(HOME_DIR);
  await fs.writeFile(configFile, JSON.stringify(config, null, 2));
};

export const initConfig = async () => {
  const config = await readConfigFile();
  Object.assign(process.env, config);
  return config;
};
