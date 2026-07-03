#!/bin/bash
set -euo pipefail

# ============================================================
# Kubernetes Cache Deployment Script - MyWorkSpace
# Deploys the full multi-layer cache stack to Kubernetes
# Supports: namespaces, secrets, ConfigMaps, rolling updates
# ============================================================

SCRIPT_NAME=$(basename "$0")
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
NAMESPACE="${NAMESPACE:-cache-system}"
K8S_DIR="${K8S_DIR:-/root/myworkspace/cache/kubernetes}"
SECRET_FILE="${SECRET_FILE:-}"
DRY_RUN=false
TIMEOUT="${TIMEOUT:-300}"
LOG_FILE="${LOG_FILE:-}"

DEPLOY_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log()    { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${GREEN}[$ts] [INFO]${NC} $*" | tee -a "${LOG_FILE:-/dev/null}"; }
warn()   { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${YELLOW}[$ts] [WARN]${NC} $*" | tee -a "${LOG_FILE:-/dev/null}"; }
error()  { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${RED}[$ts] [ERROR]${NC} $*" | tee -a "${LOG_FILE:-/dev/null}"; exit 1; }
ok()     { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${CYAN}[$ts] [OK]${NC} $*" | tee -a "${LOG_FILE:-/dev/null}"; }
header() { echo -e "\n${BLUE}══ $* ══${NC}\n" | tee -a "${LOG_FILE:-/dev/null}"; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Kubernetes Cache Deployment Script v${VERSION}

Usage: $SCRIPT_NAME [options]

Options:
  --namespace <name>    Kubernetes namespace (default: cache-system).
  --k8s-dir <path>      Kubernetes manifests directory (default: ./cache/kubernetes).
  --secret-file <path>  Path to .env file for creating secrets.
  --timeout <seconds>   Timeout for resource readiness (default: 300).
  --log-file <path>     Log output to file.
  --dry-run             Show kubectl commands without executing.
  --help                Show this help.

The script will:
  1. Validate kubectl context and connectivity
  2. Create namespace if not exists
  3. Create secrets from environment or file
  4. Apply ConfigMaps for all layers
  5. Deploy Valkey standalone + cluster
  6. Wait for cluster init job completion
  7. Deploy Varnish, Nginx, TrafficServer
  8. Verify all deployments
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --k8s-dir) K8S_DIR="$2"; shift 2 ;;
    --secret-file) SECRET_FILE="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --log-file) LOG_FILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) usage ;;
    *) error "Unknown option: $1. Use --help for usage." ;;
  esac
done

# ---------------------------------------------------------------------------
# kubectl wrapper
# ---------------------------------------------------------------------------
kubectl_cmd() {
  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] kubectl $*"
    return 0
  fi
  kubectl "$@"
}

kubectl_apply() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    warn "  Manifest not found: $file"
    return 1
  fi
  log "  Applying $(basename "$file")..."
  kubectl_cmd apply -f "$file" -n "$NAMESPACE" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || {
    warn "  Failed to apply $file"
    return 1
  }
}

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
check_prereqs() {
  header "Checking prerequisites"

  if ! command -v kubectl &>/dev/null; then
    error "kubectl is not installed."
  fi
  ok "kubectl found: $(kubectl version --client 2>&1 | head -1)"

  # Check current context
  local current_context
  current_context=$(kubectl config current-context 2>/dev/null || true)
  if [[ -z "$current_context" ]]; then
    error "No kubectl context set. Configure kubectl first."
  fi
  ok "Current context: $current_context"

  # Check cluster connectivity
  if ! kubectl cluster-info 2>/dev/null | head -1 >/dev/null; then
    error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
  fi
  ok "Cluster connectivity verified"

  # Check K8s manifests directory
  if [[ ! -d "$K8S_DIR" ]]; then
    error "Kubernetes manifests directory not found: $K8S_DIR"
  fi
  ok "Manifests directory: $K8S_DIR"

  # Verify required structure
  local required_dirs=("valkey" "varnish" "nginx" "trafficserver")
  for dir in "${required_dirs[@]}"; do
    if [[ ! -d "${K8S_DIR}/${dir}" ]]; then
      warn "Expected directory not found: ${K8S_DIR}/${dir}"
    fi
  done

  ok "Prerequisites check passed"
}

# ---------------------------------------------------------------------------
# Namespace
# ---------------------------------------------------------------------------
create_namespace() {
  header "Creating namespace: $NAMESPACE"

  if kubectl get namespace "$NAMESPACE" &>/dev/null; then
    ok "Namespace $NAMESPACE already exists"
  else
    kubectl_cmd create namespace "$NAMESPACE" 2>&1 | tee -a "${LOG_FILE:-/dev/null}"
    ok "Namespace $NAMESPACE created"
  fi

  # Apply network policy if exists
  if [[ -f "${K8S_DIR}/network-policy.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/network-policy.yaml"
  fi
}

# ---------------------------------------------------------------------------
# Secrets
# ---------------------------------------------------------------------------
create_secrets() {
  header "Creating secrets"

  # Load from file if provided
  if [[ -n "$SECRET_FILE" && -f "$SECRET_FILE" ]]; then
    log "Loading secrets from: $SECRET_FILE"
    set -a
    source "$SECRET_FILE"
    set +a
  fi

  local password="${VALKEY_PASSWORD:-myworkspace}"
  local grafana_password="${GRAFANA_PASSWORD:-admin}"

  # Check if secret already exists
  if kubectl get secret valkey-secret -n "$NAMESPACE" &>/dev/null; then
    # Update secret
    log "Updating existing secret: valkey-secret"
    kubectl_cmd delete secret valkey-secret -n "$NAMESPACE" 2>/dev/null || true
  fi

  kubectl_cmd create secret generic valkey-secret \
    -n "$NAMESPACE" \
    --from-literal=password="$password" \
    --from-literal=grafana-password="$grafana_password" \
    --from-literal=auth-token="${AUTH_TOKEN:-}" \
    --from-literal=session-secret="${SESSION_SECRET:-}" \
    --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}"

  ok "Secrets created/updated"
}

# ---------------------------------------------------------------------------
# ConfigMaps
# ---------------------------------------------------------------------------
apply_configmaps() {
  header "Applying ConfigMaps"

  # Valkey config
  if [[ -f "${K8S_DIR}/valkey/valkey-standalone.yaml" ]]; then
    # The standalone yaml includes the configmap inline; apply it first
    kubectl_apply "${K8S_DIR}/valkey/valkey-standalone.yaml"
  fi

  # Create ConfigMaps from files if they don't exist as separate manifests
  if [[ -f "${K8S_DIR}/valkey/configmap.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/valkey/configmap.yaml"
  else
    # Create configmap from valkey config files
    local valkey_conf_dir="/root/myworkspace/cache/valkey"
    if [[ -d "$valkey_conf_dir" ]]; then
      log "Creating ConfigMap from valkey config files..."
      kubectl_cmd create configmap valkey-config \
        -n "$NAMESPACE" \
        --from-file="${valkey_conf_dir}/standalone/valkey.conf" \
        --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || true

      kubectl_cmd create configmap valkey-cluster-config \
        -n "$NAMESPACE" \
        --from-file="${valkey_conf_dir}/cluster/valkey-cluster.conf" \
        --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || true

      kubectl_cmd create configmap valkey-cluster-init-script \
        -n "$NAMESPACE" \
        --from-file="${valkey_conf_dir}/init-cluster.sh" \
        --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || true
    fi
  fi

  # Varnish ConfigMap
  if [[ -f "${K8S_DIR}/varnish/configmap.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/varnish/configmap.yaml"
  else
    local varnish_vcl_dir="/root/myworkspace/cache/varnish/vcl"
    if [[ -d "$varnish_vcl_dir" ]]; then
      log "Creating Varnish ConfigMap..."
      kubectl_cmd create configmap varnish-config \
        -n "$NAMESPACE" \
        --from-file="${varnish_vcl_dir}/" \
        --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || true
    fi
  fi

  # Nginx ConfigMap
  if [[ -f "${K8S_DIR}/nginx/configmap.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/nginx/configmap.yaml"
  else
    local nginx_conf_dir="/root/myworkspace/cache/nginx/conf"
    if [[ -d "$nginx_conf_dir" ]]; then
      log "Creating Nginx ConfigMap..."
      kubectl_cmd create configmap nginx-config \
        -n "$NAMESPACE" \
        --from-file="${nginx_conf_dir}/" \
        --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || true
    fi
  fi

  # ATS ConfigMap
  if [[ -f "${K8S_DIR}/trafficserver/configmap.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/trafficserver/configmap.yaml"
  else
    local ats_conf_dir="/root/myworkspace/cache/trafficserver/conf"
    if [[ -d "$ats_conf_dir" ]]; then
      log "Creating TrafficServer ConfigMap..."
      kubectl_cmd create configmap ats-config \
        -n "$NAMESPACE" \
        --from-file="${ats_conf_dir}/" \
        --dry-run=client -o yaml 2>/dev/null | kubectl_cmd apply -f - 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || true
    fi
  fi

  ok "ConfigMaps applied"
}

# ---------------------------------------------------------------------------
# Deploy Valkey
# ---------------------------------------------------------------------------
deploy_valkey() {
  header "Deploying Valkey (standalone + cluster)"

  # Deploy standalone Valkey
  if [[ -f "${K8S_DIR}/valkey/valkey-standalone.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/valkey/valkey-standalone.yaml"
  else
    warn "  valkey-standalone.yaml not found"
  fi

  # Deploy Valkey cluster (StatefulSet)
  if [[ -f "${K8S_DIR}/valkey/valkey-cluster.yaml" ]]; then
    kubectl_apply "${K8S_DIR}/valkey/valkey-cluster.yaml"
  else
    warn "  valkey-cluster.yaml not found"
  fi

  # Wait for standalone deployment
  log "  Waiting for Valkey standalone deployment..."
  kubectl_cmd rollout status deployment/valkey -n "$NAMESPACE" --timeout="${TIMEOUT}s" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || warn "  Valkey standalone rollout timed out"

  # Wait for cluster StatefulSet
  log "  Waiting for Valkey cluster StatefulSet..."
  kubectl_cmd rollout status statefulset/valkey-cluster -n "$NAMESPACE" --timeout="${TIMEOUT}s" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || warn "  Valkey cluster rollout timed out"

  ok "Valkey deployed"
}

# ---------------------------------------------------------------------------
# Wait for cluster init
# ---------------------------------------------------------------------------
wait_for_cluster_init() {
  header "Waiting for Valkey cluster initialization job"

  # Check if init job exists
  if kubectl get job valkey-cluster-init -n "$NAMESPACE" &>/dev/null; then
    log "  Cluster init job found, waiting for completion..."

    # Delete existing job if it already ran
    local job_status
    job_status=$(kubectl get job valkey-cluster-init -n "$NAMESPACE" -o jsonpath='{.status.succeeded}' 2>/dev/null || echo "0")
    if [[ "$job_status" != "1" ]]; then
      kubectl_cmd delete job valkey-cluster-init -n "$NAMESPACE" 2>/dev/null || true
      kubectl_apply "${K8S_DIR}/valkey/valkey-cluster.yaml"
    fi

    # Wait for job
    kubectl_cmd wait --for=condition=complete job/valkey-cluster-init \
      -n "$NAMESPACE" --timeout="${TIMEOUT}s" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || {
      warn "  Cluster init job did not complete successfully"
      local job_logs
      job_logs=$(kubectl logs job/valkey-cluster-init -n "$NAMESPACE" 2>/dev/null || true)
      if [[ -n "$job_logs" ]]; then
        warn "  Job logs:\n${job_logs}"
      fi
    }
  else
    warn "  Cluster init job not found (valkey-cluster-init). Manual init may be needed."
  fi

  ok "Cluster initialization check complete"
}

# ---------------------------------------------------------------------------
# Deploy Varnish
# ---------------------------------------------------------------------------
deploy_varnish() {
  header "Deploying Varnish"

  if [[ ! -d "${K8S_DIR}/varnish" ]]; then
    warn "  Varnish manifests directory not found"
    return
  fi

  for manifest in configmap.yaml deployment.yaml service.yaml hpa.yaml pdb.yaml; do
    if [[ -f "${K8S_DIR}/varnish/${manifest}" ]]; then
      kubectl_apply "${K8S_DIR}/varnish/${manifest}"
    fi
  done

  kubectl_cmd rollout status deployment/varnish -n "$NAMESPACE" --timeout="${TIMEOUT}s" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || \
    warn "  Varnish rollout timed out"
  ok "Varnish deployed"
}

# ---------------------------------------------------------------------------
# Deploy Nginx
# ---------------------------------------------------------------------------
deploy_nginx() {
  header "Deploying Nginx"

  if [[ ! -d "${K8S_DIR}/nginx" ]]; then
    warn "  Nginx manifests directory not found"
    return
  fi

  for manifest in configmap.yaml deployment.yaml service.yaml ingress.yaml; do
    if [[ -f "${K8S_DIR}/nginx/${manifest}" ]]; then
      kubectl_apply "${K8S_DIR}/nginx/${manifest}"
    fi
  done

  kubectl_cmd rollout status deployment/nginx -n "$NAMESPACE" --timeout="${TIMEOUT}s" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || \
    warn "  Nginx rollout timed out"
  ok "Nginx deployed"
}

# ---------------------------------------------------------------------------
# Deploy TrafficServer
# ---------------------------------------------------------------------------
deploy_trafficserver() {
  header "Deploying Apache TrafficServer"

  if [[ ! -d "${K8S_DIR}/trafficserver" ]]; then
    warn "  TrafficServer manifests directory not found"
    return
  fi

  for manifest in configmap.yaml deployment.yaml service.yaml; do
    if [[ -f "${K8S_DIR}/trafficserver/${manifest}" ]]; then
      kubectl_apply "${K8S_DIR}/trafficserver/${manifest}"
    fi
  done

  kubectl_cmd rollout status deployment/trafficserver -n "$NAMESPACE" --timeout="${TIMEOUT}s" 2>&1 | tee -a "${LOG_FILE:-/dev/null}" || \
    warn "  TrafficServer rollout timed out"
  ok "TrafficServer deployed"
}

# ---------------------------------------------------------------------------
# Verify all deployments
# ---------------------------------------------------------------------------
verify_deployments() {
  header "Verifying all deployments"

  local all_ok=true

  # Check deployments
  local deployments=("valkey" "varnish" "nginx" "trafficserver")
  for dep in "${deployments[@]}"; do
    if kubectl get deployment "$dep" -n "$NAMESPACE" &>/dev/null; then
      local ready
      ready=$(kubectl get deployment "$dep" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
      local desired
      desired=$(kubectl get deployment "$dep" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
      if [[ "${ready:-0}" -ge "${desired:-1}" ]] 2>/dev/null; then
        ok "  deployment/$dep: $ready/$desired replicas ready"
      else
        warn "  deployment/$dep: $ready/$desired replicas ready"
        all_ok=false
      fi
    fi
  done

  # Check StatefulSet
  if kubectl get statefulset valkey-cluster -n "$NAMESPACE" &>/dev/null; then
    local ready
    ready=$(kubectl get statefulset valkey-cluster -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired
    desired=$(kubectl get statefulset valkey-cluster -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "6")
    if [[ "${ready:-0}" -ge "${desired:-1}" ]] 2>/dev/null; then
      ok "  statefulset/valkey-cluster: $ready/$desired replicas ready"
    else
      warn "  statefulset/valkey-cluster: $ready/$desired replicas ready"
      all_ok=false
    fi
  fi

  # Check services
  local services=("valkey" "varnish" "nginx" "trafficserver" "valkey-cluster")
  for svc in "${services[@]}"; do
    if kubectl get service "$svc" -n "$NAMESPACE" &>/dev/null; then
      local cluster_ip
      cluster_ip=$(kubectl get service "$svc" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "None")
      ok "  service/$svc: cluster IP $cluster_ip"
    fi
  done

  # Check ConfigMaps
  local configmaps=("valkey-config" "valkey-cluster-config" "varnish-config" "nginx-config" "ats-config")
  for cm in "${configmaps[@]}"; do
    if kubectl get configmap "$cm" -n "$NAMESPACE" &>/dev/null; then
      ok "  configmap/$cm exists"
    fi
  done

  # Check secrets
  if kubectl get secret valkey-secret -n "$NAMESPACE" &>/dev/null; then
    ok "  secret/valkey-secret exists"
  fi

  # Check HPA
  if kubectl get hpa varnish -n "$NAMESPACE" &>/dev/null; then
    ok "  hpa/varnish configured"
  fi

  # Check PDB
  if kubectl get pdb varnish-pdb -n "$NAMESPACE" &>/dev/null; then
    ok "  pdb/varnish-pdb configured"
  fi

  if [[ "$all_ok" == true ]]; then
    ok "All resources verified successfully"
  else
    warn "Some resources have issues - review the output above"
  fi

  # Print summary
  header "Resource Summary"
  kubectl_cmd get all -n "$NAMESPACE" 2>&1 | tee -a "${LOG_FILE:-/dev/null}"
  echo ""
  kubectl_cmd get configmap -n "$NAMESPACE" 2>&1 | tee -a "${LOG_FILE:-/dev/null}"
  echo ""
  kubectl_cmd get secret -n "$NAMESPACE" 2>&1 | tee -a "${LOG_FILE:-/dev/null}"
}

# ---------------------------------------------------------------------------
# Post-deploy summary
# ---------------------------------------------------------------------------
print_summary() {
  header "Deployment Summary"

  echo "  Timestamp:      $DEPLOY_TIMESTAMP"
  echo "  Namespace:      $NAMESPACE"
  echo "  Manifests:      $K8S_DIR"
  echo "  Secret file:    ${SECRET_FILE:-none}"
  echo "  Timeout:        ${TIMEOUT}s"
  echo ""
  echo -e "${GREEN}  Deployment completed${NC}"
  echo ""
  echo "  To interact with the cache:"
  echo "    kubectl exec -n $NAMESPACE deploy/valkey -- valkey-cli ping"
  echo "    kubectl exec -n $NAMESPACE deploy/varnish -- varnishadm ping"
  echo "    kubectl exec -n $NAMESPACE deploy/nginx -- wget -q -O /dev/null http://localhost/nginx-health"
  echo "    kubectl exec -n $NAMESPACE deploy/trafficserver -- traffic_ctl server status"
  echo ""
  echo "  To view logs:"
  echo "    kubectl logs -n $NAMESPACE -l app=valkey"
  echo "    kubectl logs -n $NAMESPACE -l app=varnish"
  echo "    kubectl logs -n $NAMESPACE -l app=nginx"
  echo "    kubectl logs -n $NAMESPACE -l app=trafficserver"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo -e "${CYAN}==============================================${NC}"
  echo -e "${CYAN}  MyWorkSpace Cache K8s Deploy v${VERSION}${NC}"
  echo -e "${CYAN}==============================================${NC}"

  if [[ -n "$LOG_FILE" ]]; then
    mkdir -p "$(dirname "$LOG_FILE")"
  fi

  check_prereqs
  create_namespace
  create_secrets
  apply_configmaps
  deploy_valkey
  wait_for_cluster_init
  deploy_varnish
  deploy_nginx
  deploy_trafficserver
  verify_deployments
  print_summary

  echo -e "\n${GREEN}Deployment completed at $(date '+%Y-%m-%d %H:%M:%S')${NC}"
}

main "$@"
