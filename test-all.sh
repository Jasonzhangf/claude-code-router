#!/bin/bash

set -e

echo "🔄 Claude Code Router Enhanced - Full Test Suite"
echo "==============================================="

# Function to run a test step
run_test() {
  local step_name=$1
  local script_name=$2
  local env=${3:-production}

  echo ""
  echo "🧪 Running Test: $step_name"
  echo "-------------------------------------"
  
  if [ "$env" == "development" ]; then
    export NODE_ENV=development
    echo "(Running in Development Mode)"
  else
    export NODE_ENV=production
    echo "(Running in Production Mode)"
  fi
  
  if node "test/$script_name"; then
    echo "✅ PASSED: $step_name"
  else
    echo "❌ FAILED: $step_name"
    exit 1
  fi
  
  # Unset NODE_ENV for subsequent steps
  unset NODE_ENV
}

# Ensure service is running for tests that need it
start_service_if_needed() {
    local env=${1:-production}
    if ! (export NODE_ENV=$env && node dist/cli.js status > /dev/null 2>&1); then
        echo "🚀 Service not running, starting for $env mode..."
        export NODE_ENV=$env && ./start-dev.sh
        sleep 5
    fi
}

# --- Development Environment Tests ---
echo "=========================================="
echo "    DEVELOPMENT ENVIRONMENT TESTS"
echo "=========================================="
start_service_if_needed development
run_test "Server Reception (Dev)" "test-step1-server-reception.js" development
run_test "Config Loading (Dev)" "test-step2-config-loading.js" development
run_test "Routing Logic (Dev)" "test-step3-routing-logic.js" development
run_test "Transformer Invocation (Dev)" "test-step4-transformer-invocation.js" development
node dist/cli.js stop > /dev/null 2>&1

# --- Production Environment Tests ---
echo ""
echo "=========================================="
echo "    PRODUCTION ENVIRONMENT TESTS"
echo "=========================================="
start_service_if_needed production
run_test "Server Reception (Prod)" "test-step1-server-reception.js" production
run_test "Config Loading (Prod)" "test-step2-config-loading.js" production
run_test "Routing Logic (Prod)" "test-step3-routing-logic.js" production
run_test "Non-Interference (Prod)" "test-step5-non-interference.js" production
node dist/cli.js stop > /dev/null 2>&1

echo ""
echo "🎉 All pipeline tests completed successfully!"
