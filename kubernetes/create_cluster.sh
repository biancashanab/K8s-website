#!/bin/bash
# setup-kind-with-registry.sh

kind delete cluster --name k8s-website
docker rm --force registry

# Create a kind network
docker network create kind

# Run a local registry
docker run -d --name registry --network kind -p 5000:5000 registry:2

# Get the registry's IP
REGISTRY_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' registry)

# Create a kind configuration file with registry mirror
cat > kind-config.yaml <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5000"]
    endpoint = ["http://registry:5000"]
EOF

# Create the kind cluster
kind create cluster --config kind-config.yaml

# Create a ConfigMap to point to the registry
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:5000"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF

echo "Kind cluster with registry setup complete!"
echo "Registry is available at: localhost:5000 (host) and localhost:5000 (from cluster)"
