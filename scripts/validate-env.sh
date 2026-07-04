#!/bin/bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ERRORS=0; WARNINGS=0

check_required() {
  if [ -z "${!1:-}" ]; then echo -e "${RED}✗ MISSING: $1${NC}"; ERRORS=$((ERRORS+1))
  else echo -e "${GREEN}✓ $1${NC}"; fi
}
check_optional() {
  if [ -z "${!1:-}" ]; then echo -e "${YELLOW}⚠ NOT SET: $1${NC}"; WARNINGS=$((WARNINGS+1))
  else echo -e "${GREEN}✓ $1${NC}"; fi
}

echo "=== MyWorkSpace Environment Validation ==="; echo ""
echo "--- Core ---"; check_required "NODE_ENV"; check_required "PORT"
echo "--- Database ---"; check_required "MONGODB_URI"
echo "--- Auth ---"; check_required "JWT_SECRET"; check_required "NEXTAUTH_SECRET"
echo "--- Redis ---"; check_optional "REDIS_URL"
echo "--- RabbitMQ ---"; check_optional "RABBITMQ_URL"
echo "--- Storage ---"; check_required "S3_ENDPOINT"; check_required "S3_BUCKET_NAME"; check_required "S3_ACCESS_KEY_ID"; check_required "S3_SECRET_ACCESS_KEY"
echo "--- Email ---"; check_optional "SES_REGION"; check_optional "SES_ACCESS_KEY_ID"; check_optional "SES_SECRET_ACCESS_KEY"; check_optional "MAIL_FROM"
echo "--- Stripe ---"; check_optional "STRIPE_SECRET_KEY"; check_optional "STRIPE_WEBHOOK_SECRET"
echo "--- Monitoring ---"; check_optional "SENTRY_DSN"
echo ""; echo "=== Summary ==="
echo -e "${RED}Errors: $ERRORS${NC}"; echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
[ "$ERRORS" -gt 0 ] && echo -e "${RED}❌ FAILED${NC}" && exit 1 || echo -e "${GREEN}✓ PASSED${NC}"
