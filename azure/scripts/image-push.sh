#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Pushing Images to Microk8s Registry (localhost:32000) =====${NC}"

# List of images to build and push
IMAGES=(
  "vvveb-cms"
  "chat-backend"
  "chat-frontend"
  "ai-backend"
  "ai-frontend"
)

# Function to build and push
build_and_push() {
  local image_name=$1
  local app_dir=$2
  local dockerfile=$3
  echo -e "${BLUE}Processing image: ${image_name}${NC}"
  echo -e "  - Building ${image_name}..."
  docker build -t localhost:32000/${image_name}:latest -f "${dockerfile}" "${app_dir}"
  echo -e "  - Pushing to localhost:32000/${image_name}..."
  docker push localhost:32000/${image_name}:latest
  echo -e "${GREEN}Successfully processed ${image_name}${NC}"
  echo ""
}

# Build and push application images
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
build_and_push "vvveb-cms" "$REPO_ROOT/cms" "$REPO_ROOT/cms/Dockerfile"
build_and_push "chat-backend" "$REPO_ROOT/chat/backend" "$REPO_ROOT/chat/backend/Dockerfile"
build_and_push "chat-frontend" "$REPO_ROOT/chat/frontend" "$REPO_ROOT/chat/frontend/Dockerfile"
build_and_push "ai-frontend" "$REPO_ROOT/ai/frontend" "$REPO_ROOT/ai/frontend/Dockerfile"
build_and_push "ai-backend" "$REPO_ROOT/ai/backend" "$REPO_ROOT/ai/backend/Dockerfile"

# Push standard images
STANDARD_IMAGES=(
  "mysql:latest"
)

for image in "${STANDARD_IMAGES[@]}"; do
  echo -e "${BLUE}Processing standard image: ${image}${NC}"
  if [[ $image == *":"* ]]; then
    base_image="${image%:*}"
    tag="${image#*:}"
    echo -e "  - Pulling ${image}..."
    docker pull ${image}
    echo -e "  - Tagging for localhost:32000..."
    docker tag ${image} localhost:32000/${base_image}:${tag}
    echo -e "  - Pushing to localhost:32000/${base_image}:${tag}..."
    docker push localhost:32000/${base_image}:${tag}
  else
    echo -e "  - Pulling ${image}..."
    docker pull ${image}
    echo -e "  - Tagging for localhost:32000..."
    docker tag ${image} localhost:32000/${image}
    echo -e "  - Pushing to localhost:32000/${image}..."
    docker push localhost:32000/${image}
  fi
  echo -e "${GREEN}Successfully processed ${image}${NC}"
  echo ""
done

echo -e "${BLUE}Verifying registry content...${NC}"
curl localhost:32000/v2/_catalog
echo -e "${GREEN}===== Image Push Complete =====${NC}"
