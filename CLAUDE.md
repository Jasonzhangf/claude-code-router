# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Development Commands
- Build: `npm run build` (bundles TypeScript with esbuild and copies tiktoken WASM file)
- Release: `npm run release` (builds and publishes to npm)
- CLI Usage: `node dist/cli.js [command]` or via binary `ccr [command]`

## Architecture
- **CLI Router**: Main entry point at `src/cli.ts` with commands: start, stop, restart, status, code
- **Server Creation**: Uses `@musistudio/llms` library (see `src/server.ts`)
- **Request Routing**: Token-aware model routing in `src/utils/router.ts`
- **Configuration**: JSON-based config at `~/.claude-code-router/config.json`
- **Build Target**: Bundles with esbuild to single `dist/cli.js` file for distribution

## Core Components
- **Router Logic**: Automatically selects models based on token count (>60K uses longContext), model type (haiku uses background), thinking mode, and web search tools
- **Custom Routing**: Supports custom router scripts via `CUSTOM_ROUTER_PATH` config
- **Authentication**: Optional API key middleware in `src/middleware/auth.ts`
- **Process Management**: Background service with PID tracking and cleanup
- **Transformers**: Plugin system for adapting requests/responses to different model providers
- **Retry Logic**: Automatic retry with exponential backoff (1s-30s, max 10 attempts) for third-party API failures in `src/utils/retry.ts`

## Installation Scripts
- `install-local.sh` (Unix/Linux/macOS): Automated local build and installation
- `install-local.bat` (Windows): Windows batch script for local installation