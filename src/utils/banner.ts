import { version } from "../../package.json";

/**
 * Display startup banner with version information
 */
export function displayStartupBanner(): void {
  const banner = `
╔═══════════════════════════════════════════════════════╗
║              Claude Code Router Enhanced              ║
║                                                       ║
║  🚀 Version: ${version.padEnd(30)} ║
║  🔄 Auto-retry with exponential backoff              ║
║  ⚡ Intelligent model routing                        ║
║  🛡️  Enhanced error handling                          ║
║                                                       ║
║  Repo: github.com/musistudio/claude-code-router      ║
╚═══════════════════════════════════════════════════════╝
`;

  console.log(banner);
}

/**
 * Display service status with version
 */
export function displayServiceStatus(status: 'starting' | 'running' | 'stopped', port?: number): void {
  const statusEmoji = {
    starting: '🔄',
    running: '✅',
    stopped: '⏹️'
  };

  const statusText = {
    starting: 'Starting',
    running: 'Running',
    stopped: 'Stopped'
  };

  console.log(`${statusEmoji[status]} Claude Code Router Enhanced v${version} - ${statusText[status]}${port ? ` on port ${port}` : ''}`);
}