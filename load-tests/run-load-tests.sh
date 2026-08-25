#!/bin/bash
# MyWorkSpace Load Test Runner
# Usage: ./run-load-tests.sh [environment] [scenario]

set -e

ENVIRONMENT=${1:-"staging"}
SCENARIO=${2:-"all"}
BASE_URL=${3:-"http://localhost:4000"}

echo "═══════════════════════════════════════"
echo "  MyWorkSpace Load Test Suite"
echo "  Environment: $ENVIRONMENT"
echo "  Scenario: $SCENARIO"
echo "  Target: $BASE_URL"
echo "═══════════════════════════════════════"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "k6 is not installed. Installing..."
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
fi

# Create results directory
mkdir -p load-tests/results/$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="load-tests/results/$(date +%Y%m%d_%H%M%S)"

# Run tests based on scenario
case $SCENARIO in
    "normal")
        echo "Running normal load test (100 users)..."
        k6 run --out json="$RESULTS_DIR/normal.json" \
            -e BASE_URL="$BASE_URL" \
            --vus 100 --duration 2m \
            load-tests/load-test.js 2>&1 | tee "$RESULTS_DIR/normal.log"
        ;;
    "peak")
        echo "Running peak load test (500 users)..."
        k6 run --out json="$RESULTS_DIR/peak.json" \
            -e BASE_URL="$BASE_URL" \
            --vus 500 --duration 3m \
            load-tests/load-test.js 2>&1 | tee "$RESULTS_DIR/peak.log"
        ;;
    "stress")
        echo "Running stress test (1000 users)..."
        k6 run --out json="$RESULTS_DIR/stress.json" \
            -e BASE_URL="$BASE_URL" \
            --vus 1000 --duration 5m \
            load-tests/load-test.js 2>&1 | tee "$RESULTS_DIR/stress.log"
        ;;
    "spike")
        echo "Running spike test (5000 users)..."
        k6 run --out json="$RESULTS_DIR/spike.json" \
            -e BASE_URL="$BASE_URL" \
            --vus 5000 --duration 1m \
            load-tests/load-test.js 2>&1 | tee "$RESULTS_DIR/spike.log"
        ;;
    "all")
        echo "Running all load test scenarios..."
        for scenario in normal peak stress spike; do
            echo ""
            echo "───────────────────────────────────────"
            echo "  Running $scenario scenario"
            echo "───────────────────────────────────────"
            ./run-load-tests.sh "$ENVIRONMENT" "$scenario" "$BASE_URL"
        done
        ;;
    *)
        echo "Unknown scenario: $SCENARIO"
        echo "Usage: ./run-load-tests.sh [environment] [normal|peak|stress|spike|all]"
        exit 1
        ;;
esac

echo ""
echo "═══════════════════════════════════════"
echo "  Load test complete!"
echo "  Results saved to: $RESULTS_DIR"
echo "═══════════════════════════════════════"
