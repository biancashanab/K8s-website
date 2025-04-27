#!/bin/bash
# deploy-chat-fixed.sh

set -e

echo "Applying chat backend fixes..."

# 1. Apply updated web.xml, database, and server config
kubectl apply -f kubernetes/chat/chat-db-secret.yaml
kubectl apply -f kubernetes/chat/chat-db-pvc.yaml
kubectl apply -f kubernetes/chat/chat-db-deployment.yaml
kubectl apply -f kubernetes/chat/chat-db-service.yaml

# 2. Wait for database to be ready
echo "Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=chat-db --timeout=120s

# 3. Deploy backend with fixed configs
kubectl apply -f kubernetes/chat/chat-backend-deployment.yaml
kubectl apply -f kubernetes/chat/chat-backend-service.yaml

# 4. Wait for backend to be ready
echo "Waiting for backend to be ready..."
kubectl wait --for=condition=ready pod -l app=chat-backend --timeout=120s

# 5. Deploy frontend
kubectl apply -f kubernetes/chat/chat-frontend-deployment.yaml
kubectl apply -f kubernetes/chat/chat-frontend-service.yaml

# 6. Apply ingress last
kubectl apply -f kubernetes/ingress.yaml

echo "Chat deployment completed successfully!"
