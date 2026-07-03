#!/bin/bash
set -euo pipefail

varnishd -F -f /etc/varnish/default.vcl \
  -a :80 \
  -T :6082 \
  -s malloc,${VARNISH_MEMORY:-2g} \
  -p thread_pool_min=${THREAD_POOL_MIN:-50} \
  -p thread_pool_max=${THREAD_POOL_MAX:-1000} \
  -p thread_pool_timeout=${THREAD_POOL_TIMEOUT:-300} \
  -p feature=+http2 \
  -p default_ttl=${DEFAULT_TTL:-120} \
  -p default_grace=${DEFAULT_GRACE:-3600} \
  -p workspace_client=${WORKSPACE_CLIENT:-256k} \
  -p workspace_backend=${WORKSPACE_BACKEND:-256k} \
  -p gzip_level=${GZIP_LEVEL:-6} \
  -p nuke_limit=${NUKE_LIMIT:-50} \
  -p max_restarts=${MAX_RESTARTS:-4} \
  -p max_retries=${MAX_RETRIES:-3}
