@echo off
setlocal enabledelayedexpansion

echo 🚀 Claude Code Router Enhanced - Local Installation Script
echo =========================================================

REM Check if we're in the correct directory
if not exist "package.json" (
    echo [ERROR] This script must be run from the claude-code-router project root directory
    exit /b 1
)

if not exist "src\cli.ts" (
    echo [ERROR] This script must be run from the claude-code-router project root directory  
    exit /b 1
)

REM Check if node and npm are available
where node >nul 2>nul
if !errorlevel! neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

where npm >nul 2>nul
if !errorlevel! neq 0 (
    echo [ERROR] npm is not installed or not in PATH
    exit /b 1
)

echo [INFO] Node.js version:
node --version

echo [INFO] npm version:
npm --version

REM Check if official claude-code is installed
npm list -g @anthropic-ai/claude-code >nul 2>nul
if !errorlevel! equ 0 (
    echo [WARN] Official @anthropic-ai/claude-code is installed globally
    set CLAUDE_CODE_INSTALLED=true
) else (
    set CLAUDE_CODE_INSTALLED=false
)

REM Step 1: Install dependencies
echo [INFO] Installing dependencies...
npm install
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

REM Step 2: Build the project
echo [INFO] Building the project...
npm run build
if !errorlevel! neq 0 (
    echo [ERROR] Failed to build project
    exit /b 1
)

REM Step 3: Stop any running service
echo [INFO] Stopping any running claude-code-router service...
where ccr >nul 2>nul
if !errorlevel! equ 0 (
    ccr stop >nul 2>nul
)

REM Step 4: Uninstall official version if present
if "!CLAUDE_CODE_INSTALLED!"=="true" (
    echo [INFO] Uninstalling official @anthropic-ai/claude-code...
    npm uninstall -g @anthropic-ai/claude-code
    if !errorlevel! neq 0 (
        echo [WARN] Failed to uninstall @anthropic-ai/claude-code ^(may not be installed or permission issue^)
    )
)

REM Step 5: Check if local version is already installed
npm list -g @musistudio/claude-code-router >nul 2>nul
if !errorlevel! equ 0 (
    echo [INFO] Uninstalling previous local version...
    npm uninstall -g @musistudio/claude-code-router
    if !errorlevel! neq 0 (
        echo [WARN] Failed to uninstall previous local version
    )
)

REM Step 6: Install the local build globally
echo [INFO] Installing local build globally...
npm install -g .
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install local build globally
    echo [ERROR] This may require administrator privileges. Run as administrator.
    exit /b 1
)

REM Step 7: Verify installation
echo [INFO] Verifying installation...
where ccr >nul 2>nul
if !errorlevel! equ 0 (
    echo [INFO] ✅ Installation successful!
    
    for /f "delims=" %%i in ('ccr version 2^>nul') do set VERSION_OUTPUT=%%i
    echo [INFO] !VERSION_OUTPUT!
    
    for /f "delims=" %%i in ('where ccr') do set CCR_PATH=%%i
    echo [INFO] ccr command is available at: !CCR_PATH!
) else (
    echo [ERROR] Installation failed - ccr command not found
    exit /b 1
)

REM Step 8: Display usage information
echo.
echo 🎉 Installation completed successfully!
echo.
echo Available commands:
echo   ccr start    - Start the router service
echo   ccr stop     - Stop the router service  
echo   ccr status   - Check service status
echo   ccr code     - Run claude code with router
echo   ccr version  - Show version
echo   ccr help     - Show help
echo.
echo Configuration file: %USERPROFILE%\.claude-code-router\config.json
echo For configuration help, see: config.example.json
echo.

REM Step 9: Check if configuration exists
if not exist "%USERPROFILE%\.claude-code-router\config.json" (
    echo [WARN] Configuration file not found at %USERPROFILE%\.claude-code-router\config.json
    echo [WARN] Please create configuration before using. See config.example.json for reference.
    echo.
    echo Quick start:
    echo   mkdir "%USERPROFILE%\.claude-code-router"
    echo   copy config.example.json "%USERPROFILE%\.claude-code-router\config.json"
    echo   # Edit the config file with your API keys and preferences
)

echo [INFO] Local installation completed! 🚀
pause