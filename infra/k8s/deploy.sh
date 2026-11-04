#!/usr/bin/env bash
# One-shot: create the kind cluster (if needed), build images, load them, apply manifests.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

if ! kind get clusters | grep -qx bys; then
  kind create cluster --config infra/kind-config.yaml
fi

# Build the three app images. kind nodes can't see your local Docker images,
# so `kind load` copies them into the cluster node.
docker build -t bys-backend:local ./backend
docker build -t bys-notifications:local ./notifications
docker build -t bys-frontend:local ./frontend
docker build -t bys-ai-agent:local ./ai-agent
kind load docker-image bys-backend:local bys-notifications:local bys-frontend:local bys-ai-agent:local --name bys

# Apply every manifest in order (files are numbered).
kubectl --context kind-bys apply -f infra/k8s/00-namespace.yaml
kubectl --context kind-bys apply -f infra/k8s/

# The LLM API key + model ID (optional): copied from .env into a Secret, never written to a manifest.
if [ -f .env ] && grep -q '^LLM_API_KEY=.' .env; then
  kubectl --context kind-bys -n bys create secret generic bys-ai \
    --from-literal=LLM_API_KEY="$(grep '^LLM_API_KEY=' .env | cut -d= -f2-)" \
    --from-literal=AGENT_MODEL="$(grep '^AGENT_MODEL=' .env | cut -d= -f2-)" \
    --dry-run=client -o yaml | kubectl --context kind-bys apply -f -
fi

# Restart app pods so they pick up freshly loaded images with the same tag.
kubectl --context kind-bys -n bys rollout restart deployment backend notifications frontend ai-agent

echo "Waiting for pods to become ready..."
kubectl --context kind-bys -n bys rollout status deployment/backend --timeout=300s
kubectl --context kind-bys -n bys rollout status deployment/ai-agent --timeout=300s
kubectl --context kind-bys -n bys rollout status deployment/frontend --timeout=120s
kubectl --context kind-bys -n bys get pods
echo
echo "App running at http://localhost:8088"
