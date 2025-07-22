#!/bin/bash

# Installation script to build, uninstall official version, and install local version globally
# Usage: ./install-local.sh

set -e

echo "🚀 Claude Code Router Enhanced - Local Installation Script"
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "src/cli.ts" ]; then
    print_error "This script must be run from the claude-code-router project root directory"
    exit 1
fi

# Check if node and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Check if official claude-code is installed
CLAUDE_CODE_INSTALLED=false
if npm list -g @anthropic-ai/claude-code &> /dev/null; then
    CLAUDE_CODE_INSTALLED=true
    print_status "Official @anthropic-ai/claude-code is installed globally ✅"
else
    print_warning "Official @anthropic-ai/claude-code is NOT installed"
    print_warning "Claude Code Router requires official Claude Code to work"
    print_status "Please install it manually:"
    print_status "  npm install -g @anthropic-ai/claude-code"
    print_status ""
    read -p "Continue installation anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Installation cancelled"
        exit 0
    fi
fi

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm install

# Step 2: Build the project
print_status "Building the project..."
npm run build

# Step 3: Stop any running service
print_status "Stopping any running claude-code-router service..."
if command -v ccr &> /dev/null; then
    ccr stop 2>/dev/null || true
fi

# Step 4: Keep official version (it's required as dependency)
print_status "Keeping official @anthropic-ai/claude-code (required as dependency)"

# Step 5: Check if local version is already installed
LOCAL_INSTALLED=false
if npm list -g @musistudio/claude-code-router &> /dev/null; then
    LOCAL_INSTALLED=true
    print_status "Uninstalling previous local version..."
    npm uninstall -g @musistudio/claude-code-router || {
        print_warning "Failed to uninstall previous local version"
    }
fi

# Step 6: Install the local build globally
print_status "Installing local build globally..."
npm install -g . || {
    print_error "Failed to install local build globally"
    print_error "This may require sudo privileges. Try: sudo ./install-local.sh"
    exit 1
}

# Step 7: Verify installation
print_status "Verifying installation..."
if command -v ccr &> /dev/null; then
    VERSION=$(ccr version 2>/dev/null | grep "version:" | cut -d':' -f2 | xargs || echo "unknown")
    print_status "✅ Installation successful! Version: $VERSION"
    print_status "ccr command is available at: $(which ccr)"
else
    print_error "Installation failed - ccr command not found"
    exit 1
fi

# Step 8: Display usage information
echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Available commands:"
echo "  ccr start    - Start the router service"
echo "  ccr stop     - Stop the router service"
echo "  ccr status   - Check service status"
echo "  ccr code     - Run claude code with router"
echo "  ccr version  - Show version"
echo "  ccr help     - Show help"
echo ""
echo "Configuration file: ~/.claude-code-router/config.json"
echo "For configuration help, see: config.example.json"
echo ""

# Step 9: Check if configuration exists
if [ ! -f "$HOME/.claude-code-router/config.json" ]; then
    print_warning "Configuration file not found at ~/.claude-code-router/config.json"
    print_warning "Please create configuration before using. See config.example.json for reference."
    echo ""
    echo "Quick start:"
    echo "  mkdir -p ~/.claude-code-router"
    echo "  cp config.example.json ~/.claude-code-router/config.json"
    echo "  # Edit the config file with your API keys and preferences"
fi

print_status "Local installation completed! 🚀"