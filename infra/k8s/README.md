# Kubernetes (Phase 6)

These manifests run the same containers as `docker-compose.yml`, but on a local Kubernetes cluster. The cluster is created with **kind** ("Kubernetes IN Docker").

```bash
./infra/k8s/deploy.sh
```

This creates the cluster, builds the images, loads them into the cluster, and applies the manifests. The app is then at http://localhost:8088.

```bash
./infra/k8s/teardown.sh
```

This deletes the cluster.

## Docker Compose vs Kubernetes: same app, different "operator"

| Concept | docker-compose | Kubernetes |
|---|---|---|
| Run a container | `services:` | `Deployment` (stateless) / `StatefulSet` (databases) → creates **Pods** |
| Find each other by name | Compose network DNS | **Service** objects (`postgres`, `redis`, `kafka`, `backend`) |
| Config | `environment:` | **ConfigMap** (plain) + **Secret** (sensitive) |
| Health | `healthcheck:` | **startup / liveness / readiness probes** |
| Persistent data | named volume | **PersistentVolumeClaim** |
| Expose to your laptop | `ports: "3000:80"` | **NodePort** Service (+ kind port mapping) |
| Scale | `--scale` | `replicas: 2` (+ self-healing: crashed pods are replaced) |

## Files

| File | What |
|---|---|
| [`../kind-config.yaml`](../kind-config.yaml) | Cluster definition; maps host port 8088 → NodePort 30080 |
| `00-namespace.yaml` | The `bys` namespace that holds everything |
| `01-config.yaml` | ConfigMap + Secret (DB URL, passwords, JWT secret) |
| `10-postgres.yaml` | StatefulSet with a 1Gi persistent volume |
| `11-redis.yaml`, `12-kafka.yaml` | Infrastructure Deployments + Services |
| `20-backend.yaml` | **2 replicas**, which works because the backend is stateless (JWT + Redis + Postgres) |
| `21-notifications.yaml` | Kafka consumer (no Service; nothing calls it) |
| `22-frontend.yaml` | nginx + NodePort 30080 |

## Useful commands

```bash
kubectl --context kind-bys -n bys get pods
```

```bash
kubectl --context kind-bys -n bys logs -f deploy/notifications
```

```bash
kubectl --context kind-bys -n bys logs -l app=backend --prefix
```

```bash
kubectl --context kind-bys -n bys delete pod -l app=backend
```

```bash
kubectl --context kind-bys -n bys scale deploy/backend --replicas=3
```

```bash
kubectl --context kind-bys -n bys describe pod <name>
```

What each one does, in order:
1. List pods with their status and restart counts.
2. Follow the "TICKET SENT" logs.
3. Show logs from both backend replicas.
4. Kill the backend pods and watch Kubernetes replace them.
5. Scale the backend out.
6. Explain why a pod isn't starting (check its events).

Minikube works too: `minikube start`, then `minikube image load <image>` for each image instead of `kind load`, `kubectl apply -f infra/k8s/`, and `minikube service frontend -n bys`.
