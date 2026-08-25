#!/bin/bash
# Database migration runner
# Usage: ./scripts/migrate.sh [migration-name]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_DIR/backend/src/migrations"

mkdir -p "$MIGRATIONS_DIR"

# Run TS files via tsx
run_ts() {
  local file="$1"
  echo "Running: $(basename "$file")"
  npx tsx --env-file="$PROJECT_DIR/backend/.env" "$file"
}

# Create new migration
if [ "${1:-}" = "create" ]; then
  NAME="${2:-}"
  if [ -z "$NAME" ]; then
    echo "Usage: $0 create <migration-name>"
    exit 1
  fi
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  FILE="$MIGRATIONS_DIR/${TIMESTAMP}_$NAME.ts"
  cat > "$FILE" << EOF
import { connectDb } from "../lib/db/index.js";

async function up(): Promise<void> {
  console.log("Running migration: $NAME");
  // Migration logic here
}

async function down(): Promise<void> {
  console.log("Rolling back migration: $NAME");
  // Rollback logic here
}

async function main() {
  await connectDb();
  const action = process.argv[2] || "up";
  if (action === "up") await up();
  else if (action === "down") await down();
  console.log("Migration complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
EOF
  echo "Created migration: $FILE"
  exit 0
fi

# Run available migrations
echo "Running pending migrations..."
for f in "$MIGRATIONS_DIR"/*.ts; do
  [ -f "$f" ] || continue
  MIG_NAME=$(basename "$f" .ts)
  # Check if already run
  if [ -f "$MIGRATIONS_DIR/.done_$MIG_NAME" ]; then
    echo "Skipping (already run): $MIG_NAME"
    continue
  fi
  echo "Running migration: $MIG_NAME"
  if run_ts "$f"; then
    touch "$MIGRATIONS_DIR/.done_$MIG_NAME"
    echo "Completed: $MIG_NAME"
  else
    echo "FAILED: $MIG_NAME"
    exit 1
  fi
done

echo "All migrations completed."
