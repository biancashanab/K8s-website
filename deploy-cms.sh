#!/bin/bash
# deploy-k8s-website.sh

set -e

echo "Applying Kubernetes configurations for k8s-website..."

# Create the necessary PVs
kubectl apply -f kubernetes/cms-pv.yaml
kubectl apply -f kubernetes/cms-db-pv.yaml
kubectl apply -f kubernetes/chat/chat-db-pvc.yaml  # This already contains a PV definition

# Create the necessary PVCs
kubectl apply -f kubernetes/cms-pvc.yaml
kubectl apply -f kubernetes/cms-db-pvc.yaml

# Apply database deployments and services
kubectl apply -f kubernetes/cms-db-deployment.yaml
kubectl apply -f kubernetes/cms-db-service.yaml
kubectl apply -f kubernetes/chat/chat-db-secret.yaml
kubectl apply -f kubernetes/chat/chat-db-deployment.yaml
kubectl apply -f kubernetes/chat/chat-db-service.yaml

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app=cms-db --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=chat,tier=db --timeout=120s || true

# Apply application deployments and services
kubectl apply -f kubernetes/cms-deployment.yaml
kubectl apply -f kubernetes/cms-service.yaml
kubectl apply -f kubernetes/ai-app-deployment.yaml
kubectl apply -f kubernetes/ai-app-service.yaml
kubectl apply -f kubernetes/chat/chat-backend-deployment.yaml
kubectl apply -f kubernetes/chat/chat-backend-service.yaml
kubectl apply -f kubernetes/chat/chat-frontend-deployment.yaml
kubectl apply -f kubernetes/chat/chat-frontend-service.yaml

# Apply secrets
kubectl apply -f kubernetes/azure-secret.yaml

# Apply ingress last
kubectl apply -f kubernetes/ingress.yaml

echo "Deployment completed successfully!"
echo "You can now access:"
echo "CMS: http://localhost/"
echo "Chat: http://localhost/chat"
echo "AI App: http://localhost/ai"
