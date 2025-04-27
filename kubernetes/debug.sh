#!/bin/bash
# debug-websocket.sh - Script to debug WebSocket connections in Kubernetes

# Set colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== WebSocket Connection Debugging ==========${NC}"

# Check if frontend pods are running
echo -e "${BLUE}Checking frontend pods:${NC}"
kubectl get pods -l app=chat-frontend

# Check if backend pods are running
echo -e "${BLUE}Checking backend pods:${NC}"
kubectl get pods -l app=chat-backend

# Check services
echo -e "${BLUE}Checking services:${NC}"
kubectl get services | grep chat

# Check ingress
echo -e "${BLUE}Checking ingress:${NC}"
kubectl get ingress
kubectl describe ingress app-ingress

# Check ingress controller pod
echo -e "${BLUE}Checking ingress controller:${NC}"
kubectl get pods -n ingress-nginx

# Create a test pod to check connectivity
echo -e "${BLUE}Creating test pod to check connectivity:${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: websocket-debug
spec:
  containers:
  - name: websocket-debug
    image: nginx:alpine
    command: ["/bin/sh", "-c", "apk add --no-cache curl && while true; do sleep 30; done"]
EOF

# Wait for the pod to be ready
echo "Waiting for debug pod to be ready..."
kubectl wait --for=condition=Ready pod/websocket-debug --timeout=60s

echo -e "${BLUE}Testing HTTP connectivity from debug pod:${NC}"
kubectl exec websocket-debug -- curl -v http://chat-backend:88 || echo -e "${YELLOW}Could not connect to backend HTTP${NC}"
kubectl exec websocket-debug -- curl -v http://chat-frontend:90 || echo -e "${YELLOW}Could not connect to frontend HTTP${NC}"

echo -e "${BLUE}Testing DNS resolution:${NC}"
kubectl exec websocket-debug -- nslookup chat-backend || echo -e "${YELLOW}Could not resolve chat-backend${NC}"
kubectl exec websocket-debug -- nslookup chat-frontend || echo -e "${YELLOW}Could not resolve chat-frontend${NC}"
kubectl exec websocket-debug -- nslookup chat-db || echo -e "${YELLOW}Could not resolve chat-db${NC}"

echo -e "${BLUE}Testing port connectivity:${NC}"
echo "Chat backend (port 88):"
kubectl exec websocket-debug -- sh -c "nc -zv chat-backend 88" || echo -e "${YELLOW}Port 88 not accessible${NC}"
echo "Chat frontend (port 90):"
kubectl exec websocket-debug -- sh -c "nc -zv chat-frontend 90" || echo -e "${YELLOW}Port 90 not accessible${NC}"

echo -e "${BLUE}Checking backend logs:${NC}"
BACKEND_POD=$(kubectl get pods -l app=chat-backend -o jsonpath="{.items[0].metadata.name}")
if [ -n "$BACKEND_POD" ]; then
  kubectl logs $BACKEND_POD | tail -n 50
else
  echo -e "${RED}No backend pod found${NC}"
fi

echo -e "${BLUE}Checking frontend logs:${NC}"
FRONTEND_POD=$(kubectl get pods -l app=chat-frontend -o jsonpath="{.items[0].metadata.name}")
if [ -n "$FRONTEND_POD" ]; then
  kubectl logs $FRONTEND_POD | tail -n 50
else
  echo -e "${RED}No frontend pod found${NC}"
fi

echo -e "${GREEN}Debug complete. To clean up the debug pod, run:${NC}"
echo "kubectl delete pod websocket-debug"
