#!/bin/bash
set -euo pipefail

echo "=== Valkey Cluster Initialization ==="

VALKEY_NODES=(
  "valkey-cluster-0:6379"
  "valkey-cluster-1:6379"
  "valkey-cluster-2:6379"
  "valkey-cluster-3:6379"
  "valkey-cluster-4:6379"
  "valkey-cluster-5:6379"
)

echo "Waiting for nodes to be ready..."
for node in "${VALKEY_NODES[@]}"; do
  until valkey-cli -h "${node%:*}" -p "${node#*:}" -a "${VALKEY_PASSWORD}" ping 2>/dev/null; do
    echo "Waiting for $node..."
    sleep 2
  done
done

echo "Creating cluster..."
valkey-cli -a "${VALKEY_PASSWORD}" --cluster create \
  "${VALKEY_NODES[0]}" "${VALKEY_NODES[1]}" "${VALKEY_NODES[2]}" \
  "${VALKEY_NODES[3]}" "${VALKEY_NODES[4]}" "${VALKEY_NODES[5]}" \
  --cluster-replicas 1

echo "Cluster created. Checking status..."
valkey-cli -a "${VALKEY_PASSWORD}" --cluster check "${VALKEY_NODES[0]}"

echo "=== Valkey Cluster Initialized ==="
