#!/bin/sh
set -e

RUNTIME_DIR=/tmp/valkey-runtime
mkdir -p "$RUNTIME_DIR"

# Copy configs with env var substitution
for conf in /etc/valkey/*.conf; do
  [ -f "$conf" ] || continue
  target="$RUNTIME_DIR/$(basename "$conf")"
  sed "s/\${VALKEY_PASSWORD}/${VALKEY_PASSWORD:-}/g; s/\${SESSION_CACHE_PASSWORD}/${SESSION_CACHE_PASSWORD:-}/g; s/\${API_CACHE_PASSWORD}/${API_CACHE_PASSWORD:-}/g; s/\${READONLY_PASSWORD}/${READONLY_PASSWORD:-}/g; s/\${MONITORING_PASSWORD}/${MONITORING_PASSWORD:-}/g" "$conf" > "$target"
done

# Build new arg list with runtime config paths
new_args=""
for arg in "$@"; do
  case "$arg" in
    /etc/valkey/*)
      base=$(basename "$arg")
      new_args="$new_args $RUNTIME_DIR/$base"
      ;;
    *)
      new_args="$new_args $arg"
      ;;
  esac
done

exec $new_args
