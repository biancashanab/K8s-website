#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== Deploying All Kubernetes Resources ==========${NC}"

# Get current directory
CURRENT_DIR=$(pwd)
BASE_DIR=$(basename "$CURRENT_DIR")

K8S_DIR=".."

echo -e "${GREEN}Using kubernetes directory: $K8S_DIR${NC}"

# Set the kubectl command to use microk8s kubectl directly
KUBECTL="microk8s kubectl"
echo -e "${BLUE}Using command: $KUBECTL${NC}"

# Apply resources in the correct order
echo -e "${BLUE}Applying all resources in the correct order...${NC}"

# 1. Apply secrets
echo -e "${BLUE}1. Applying secrets...${NC}"
$KUBECTL apply -f $K8S_DIR/azure-secret.yaml
echo -e "${GREEN}Secrets applied successfully${NC}"

# 2. Apply common resources
echo -e "${BLUE}2. Applying common resources...${NC}"
$KUBECTL apply -f $K8S_DIR/common/
echo -e "${GREEN}Common resources applied successfully${NC}"

# 3. Apply CMS deployment
echo -e "${BLUE}3. Applying CMS deployment...${NC}"
$KUBECTL apply -f $K8S_DIR/cms/
echo -e "${GREEN}CMS deployment applied successfully${NC}"

# 4. Apply Chat deployment
echo -e "${BLUE}4. Applying Chat deployment...${NC}"
$KUBECTL apply -f $K8S_DIR/chat/
echo -e "${GREEN}Chat deployment applied successfully${NC}"

# 5. Apply AI deployment
echo -e "${BLUE}5. Applying AI deployment...${NC}"
$KUBECTL apply -f $K8S_DIR/ai/
echo -e "${GREEN}AI deployment applied successfully${NC}"

# Wait for deployments to be ready
echo -e "${BLUE}Waiting for deployments to become ready...${NC}"
$KUBECTL get deployments | grep -v NAME | awk '{print $1}' | xargs -I{} $KUBECTL rollout status deployment/{} || true

# Check deployment status
echo -e "${BLUE}Checking deployment status...${NC}"
$KUBECTL get pods -o wide

# Display services
echo -e "${BLUE}Available services:${NC}"
$KUBECTL get svc

# Display ingress
echo -e "${BLUE}Ingress status:${NC}"
$KUBECTL get ingress

# Display HPAs
echo -e "${BLUE}Horizontal Pod Autoscalers:${NC}"
$KUBECTL get hpa

# Dashboard access instruction
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}All resources applied successfully!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "${YELLOW}You can access the dashboard with:${NC}"
echo -e "${YELLOW}  microk8s dashboard-proxy${NC}"
echo -e "${YELLOW}Your application should be accessible at:${NC}"
echo -e "${YELLOW}  http://52.172.213.33/${NC}"
echo -e "${GREEN}==========================================================${NC}"

# Ask if user wants to monitor deployment
read -p "Do you want to monitor the deployment? (y/n): " MONITOR
if [[ "$MONITOR" == "y" || "$MONITOR" == "Y" ]]; then
    echo -e "${BLUE}Monitoring deployment (press Ctrl+C to exit)...${NC}"
    $KUBECTL get pods -w
else
    echo -e "${GREEN}Deployment complete!${NC}"
fi
