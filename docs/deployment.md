# Deployment Guide

## Local Development

### Prerequisites
- JDK 21+
- Docker & Docker Compose
- Gradle 8.12+

### Steps

```bash
# 1. Start infrastructure
docker compose up -d postgres redis qdrant

# 2. Run database migrations
./gradlew :core:flywayMigrate

# 3. Start development services
./gradlew :auth-service:run
./gradlew :user-service:run
# ... in separate terminals
```

## Docker Deployment

```bash
# Build all images
docker compose build

# Start everything
docker compose up -d

# View logs
docker compose logs -f api-gateway
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (GKE, EKS, or AKS)
- kubectl configured
- Container registry access

### Deploy

```bash
# Create namespace and resources
kubectl apply -k k8s/overlays/production

# Verify deployment
kubectl get pods -n rickchat -w
kubectl get svc -n rickchat

# Access the API
kubectl port-forward -n rickchat svc/api-gateway 8080:80
```

### Scaling

```bash
# Scale specific services
kubectl scale deployment -n rickchat chat-service --replicas=5
kubectl scale deployment -n rickchat ai-gateway --replicas=3
```

## Google Cloud Run

```bash
# Enable required services
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Build and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/api-gateway
gcloud run deploy api-gateway \
  --image gcr.io/$PROJECT_ID/api-gateway \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 2 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 2 \
  --concurrency 80 \
  --set-env-vars "ENVIRONMENT=production,DATABASE_URL=..."

# Deploy all services
for service in auth-service user-service chat-service ai-gateway memory-service marketplace-service learning-service translation-service notification-service payment-service subscription-service file-service analytics-service admin-service; do
  gcloud builds submit --tag "gcr.io/$PROJECT_ID/$service" "./$service"
  gcloud run deploy "$service" \
    --image "gcr.io/$PROJECT_ID/$service" \
    --platform managed \
    --region us-central1 \
    --no-allow-unauthenticated
done
```

## Environment Configuration

### Production Checklist

- [ ] Generate strong JWT secret (32+ chars, random)
- [ ] Set up Firebase project and download service account
- [ ] Configure Google Cloud Secret Manager for secrets
- [ ] Set up Cloud SQL PostgreSQL (with pgvector extension)
- [ ] Configure Memorystore Redis instance
- [ ] Deploy Qdrant (Cloud Run or self-hosted)
- [ ] Set up Cloud Storage bucket
- [ ] Configure Cloud Logging and Monitoring
- [ ] Set up VPC and firewall rules
- [ ] Configure custom domain and SSL certificate
- [ ] Set up CI/CD pipeline (Cloud Build, GitHub Actions)
- [ ] Configure alerts and notification channels
