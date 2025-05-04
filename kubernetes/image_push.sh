#!/bin/bash
# push-images.sh - Build, tag and push all images to the local registry
# Place this script in the kubernetes folder

set -e

# Registry URL
REGISTRY="localhost:5000"

# Get the absolute path to the repo root directory (parent of kubernetes folder)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Building and pushing images to $REGISTRY ==="
echo "Repository root: $REPO_ROOT"

# Function to build and push an image
build_and_push() {
    local app_name=$1
    local app_dir=$2
    local dockerfile=$3

    echo ""
    echo "🔨 Building $app_name..."
    echo "Directory: $app_dir"
    echo "Dockerfile: $dockerfile"

    # Build the image
    docker build -t "$REGISTRY/$app_name:latest" -f "$dockerfile" "$app_dir"
    
    # Push the image
    echo "📤 Pushing $REGISTRY/$app_name:latest..."
    docker push "$REGISTRY/$app_name:latest"
    
    echo "✅ $app_name image built and pushed successfully"
}

# Build and push all application images
build_and_push "ai-app" "$REPO_ROOT/ai-app" "$REPO_ROOT/ai-app/Dockerfile"
build_and_push "chat-frontend" "$REPO_ROOT/chat/frontend" "$REPO_ROOT/chat/frontend/Dockerfile"
build_and_push "chat-backend" "$REPO_ROOT/chat/backend" "$REPO_ROOT/chat/backend/Dockerfile"
build_and_push "chat-db" "$REPO_ROOT/chat/db" "$REPO_ROOT/chat/db/Dockerfile"
build_and_push "vvveb-cms" "$REPO_ROOT/cms" "$REPO_ROOT/cms/Dockerfile"

docker push localhost:5000/mysql:latest

# For CMS, we're using an existing image from the registry
echo ""
echo "🔄 Using existing image for CMS (localhost:5000/vvveb-cms:latest)"
echo "   If this image doesn't exist yet, you need to pull and push it separately."

echo ""
echo "=== All images have been built and pushed to $REGISTRY ==="
echo ""
echo "To use these images in your Kind cluster, update your deployment files to use:"
echo "  - $REGISTRY/ai-app:latest"
echo "  - $REGISTRY/chat-frontend:latest"
echo "  - $REGISTRY/chat-backend:latest"
echo "  - $REGISTRY/chat-db:latest"
echo ""
echo "When using Kind, you may need to use the registry's IP address instead of localhost:"
REGISTRY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' registry)
echo "Registry IP for use in Kind: $REGISTRY_IP:5000"

