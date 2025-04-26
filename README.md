# K8s-website
Chat and AI website, containerized on Kubernetes

## Structura

    k8s-website/
    ├── cms/
    │   ├── Dockerfile
    │   └── db/
    │       ├── Dockerfile
    ├── chat/
    │   ├── backend/
    │   │   ├── Dockerfile
    │   │   └── src/  # Codul Java pentru chat backend
    │   ├── frontend/
    │   │   ├── Dockerfile
    │   │   └── src/  # Codul Angular pentru chat frontend
    │   └── db/
    │       ├── Dockerfile
    ├── ai/
    │   ├── Dockerfile
    │   └── src/  # Codul Angular pentru aplicația AI
    └── k8s/
        ├── cms-deployment.yaml
        ├── cms-service.yaml
        ├── cms-db-deployment.yaml
        ├── cms-db-service.yaml
        ├── cms-db-pvc.yaml
        ├── cms-pvc.yaml
        ├── chat-backend-deployment.yaml
        ├── chat-backend-service.yaml
        ├── chat-frontend-deployment.yaml
        ├── chat-frontend-service.yaml
        ├── chat-db-deployment.yaml
        ├── chat-db-service.yaml
        ├── chat-db-pvc.yaml
        ├── ai-app-deployment.yaml
        ├── ai-app-service.yaml
        └── ingress.yaml