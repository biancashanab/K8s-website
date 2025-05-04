#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== Kubernetes Deployment Script (CMS and Chat) ==========${NC}"

echo -e "${BLUE}Deleting existing Kind cluster...${NC}"
if kind get clusters | grep -q k8s-website; then
  kind delete cluster --name k8s-website
  echo -e "${GREEN}Existing cluster deleted successfully.${NC}"
else
  echo -e "${GREEN}No existing cluster found.${NC}"
fi

echo -e "${BLUE}Setting up local Docker registry...${NC}"
if [ "$(docker ps -q -f name=registry)" ]; then
  echo "Registry container already exists, stopping and removing..."
  docker stop registry
  docker rm registry
fi
docker run -d --restart=always --name registry -p 5000:5000 registry:2
echo -e "${GREEN}Local registry started at localhost:5000${NC}"

echo -e "${BLUE}Creating new Kind cluster...${NC}"
cat <<EOF | kind create cluster --name k8s-website --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraMounts:
  - hostPath: ../cms/cms-db-data
    containerPath: /mnt/cms-db-data
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5000"]
    endpoint = ["http://registry:5000"]
EOF
echo -e "${GREEN}New Kind cluster created successfully.${NC}"

echo -e "${BLUE}Connecting registry to Kind network...${NC}"
docker network connect kind registry || true
echo -e "${GREEN}Registry connected to Kind network.${NC}"

echo -e "${BLUE}Waiting for CoreDNS to be ready...${NC}"
for i in {1..3}; do
  if kubectl wait --namespace kube-system \
    --for=condition=ready pod \
    --selector=k8s-app=kube-dns \
    --timeout=60s; then
    echo -e "${GREEN}CoreDNS is ready.${NC}"
    break
  else
    echo -e "${RED}CoreDNS not ready, retrying ($i/3)...${NC}"
    kubectl get pods -n kube-system
    sleep 10
    if [ $i -eq 3 ]; then
      echo -e "${RED}CoreDNS failed to start. Exiting...${NC}"
      kubectl describe pod -n kube-system -l k8s-app=kube-dns
      exit 1
    fi
  fi
done

echo -e "${BLUE}Installing NGINX Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/kind/deploy.yaml
echo -e "${GREEN}Ingress controller installed. Waiting for it to be ready...${NC}"

echo -e "${BLUE}Waiting for Ingress controller to be ready...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s || { echo -e "${RED}Ingress controller not ready. Exiting...${NC}"; exit 1; }

echo -e "${BLUE}Building and pushing Docker images...${NC}"
bash image_push.sh
sleep 5
echo -e "${GREEN}All images built and pushed successfully.${NC}"

echo -e "${BLUE}Applying CMS and Chat manifests...${NC}"
# Apply database manifests first
kubectl apply -f cms-db-pv.yaml
kubectl apply -f cms-db-pvc.yaml
kubectl apply -f cms-db-deployment.yaml
kubectl apply -f cms-db-service.yaml
cd chat
kubectl apply -f chat-db-secret.yaml
kubectl apply -f chat-db-pvc.yaml
kubectl apply -f chat-db-deployment.yaml
kubectl apply -f chat-db-service.yaml
cd ..
# Wait for database pods to be ready
echo -e "${BLUE}Waiting for database pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=cms-db --timeout=120s || { echo -e "${RED}CMS DB not ready${NC}"; exit 1; }
kubectl wait --for=condition=ready pod -l app=chat-db --timeout=120s || { echo -e "${RED}Chat DB not ready${NC}"; exit 1; }

# Apply application manifests
kubectl apply -f cms-deployment.yaml
kubectl apply -f cms-service.yaml
cd chat
kubectl apply -f chat-backend-deployment.yaml
kubectl apply -f chat-backend-service.yaml
kubectl apply -f chat-frontend-deployment.yaml
kubectl apply -f chat-frontend-service.yaml
cd ...
kubectl apply -f ingress.yaml

echo -e "${GREEN}All manifests applied successfully.${NC}"

echo -e "${BLUE}Waiting for all deployments to be ready...${NC}"
kubectl get deployments -o name | xargs -I{} kubectl rollout status {}

echo -e "${BLUE}Verifying networking...${NC}"
kubectl exec debug-pod -- nslookup cms-service || echo -e "${RED}DNS resolution failed${NC}"
kubectl exec debug-pod -- nc -zv cms-service 80 || echo -e "${RED}CMS service not reachable${NC}"
kubectl exec debug-pod -- nc -zv chat-backend 88 || echo -e "${RED}Chat backend not reachable${NC}"
kubectl exec debug-pod -- nc -zv chat-frontend 90 || echo -e "${RED}Chat frontend not reachable${NC}"

echo -e "${GREEN}====================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}====================${NC}"
echo -e "${GREEN}You can now access:${NC}"
echo -e "${GREEN}CMS: http://localhost/${NC}"
echo -e "${GREEN}Chat: http://localhost/chat${NC}"
echo -e "${GREEN}====================${NC}"

echo -e "${BLUE}Currently running pods:${NC}"
kubectl get pods

echo -e "${BLUE}Ingress status:${NC}"
kubectl get ingress
