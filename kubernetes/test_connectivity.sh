#!/bin/bash
# kind-registry-debug.sh

echo "=== Testing Registry Connection in Kind ==="

echo -e "\n1. Testing registry from host:"
curl -s http://localhost:5000/v2/_catalog || echo "Failed to connect to registry from host"

echo -e "\n2. Creating debug pod in Kubernetes..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: registry-debug
spec:
  containers:
  - name: registry-debug
    image: curlimages/curl
    command: ["sleep", "3600"]
EOF

echo -e "\nWaiting for debug pod to start..."
kubectl wait --for=condition=Ready pod/registry-debug --timeout=60s

echo -e "\n3. Testing registry connection from inside Kind:"
kubectl exec registry-debug -- curl -s http://registry:5000/v2/_catalog || echo "Failed to connect to registry from Kind"

echo -e "\n4. Listing available images in registry:"
curl -s http://localhost:5000/v2/_catalog | grep -o '"[^"]*"' | tr -d '"' | while read repo; do
  if [ ! -z "$repo" ]; then
    echo "Repository: $repo"
    curl -s http://localhost:5000/v2/$repo/tags/list | grep -o '"tags":\[[^]]*\]' | grep -o '"[^"]*"' | grep -v tags | tr -d '"' | while read tag; do
      echo "  - $repo:$tag"
    done
  fi
done

echo -e "\n5. Checking for image pull errors in pods:"
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

echo -e "\n6. Testing image pull directly:"
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: image-pull-test
spec:
  containers:
  - name: test-container
    image: registry:5000/ai-app:latest
  restartPolicy: Never
EOF

echo -e "\nWatching image-pull-test pod status:"
kubectl get pod image-pull-test -w &
watch_pid=$!
sleep 10
kill $watch_pid

echo -e "\nChecking image-pull-test pod events:"
kubectl describe pod image-pull-test | grep -A 10 Events:

echo -e "\n=== Registry connection debugging complete ==="
echo "Debug pod 'registry-debug' has been created for further testing."
echo "Run 'kubectl exec -it registry-debug -- sh' to access it."
echo "When finished, run the following to clean up:"
echo "kubectl delete pod registry-debug image-pull-test"
