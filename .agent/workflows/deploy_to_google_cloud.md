---
description: How to deploy EdTon.ai to Google Cloud Platform (Cloud Run)
---

# Deploy EdTon.ai to Google Cloud Run

This workflow guides you through deploying the application to Google Cloud Run using `gcloud`.

## Prerequisites
- [ ] Google Cloud Project ID
- [ ] Database Connection String (Supabase Transaction Pooler, port 6543)
- [ ] DeepSeek API Key

## Steps

0. **Set Variables** (Run this first in your terminal):
```powershell
$PROJECT_ID = "your-project-id"        
$REGION = "europe-west1"               
$REPO_NAME = "edtonai-repo"
$SUPABASE_URL = "https://your-project.supabase.co"
$SUPABASE_KEY = "your-anon-key"
$DATABASE_URL = "postgres://postgres..."
$DEEPSEEK_KEY = "sk-..."
```

1. **Setup Project**
```powershell
// turbo
gcloud config set project $PROJECT_ID
// turbo
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
// turbo
gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION
```

2. **Deploy Backend**
```powershell
// turbo
gcloud builds submit ./backend --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:v1"

// turbo
gcloud run deploy edtonai-backend `
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:v1" `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars "AI_PROVIDER=deepseek" `
  --set-env-vars "DEEPSEEK_API_KEY=$DEEPSEEK_KEY" `
  --set-env-vars "DATABASE_URL=$DATABASE_URL" `
  --set-env-vars "LOG_LEVEL=INFO"
```

3. **Deploy Frontend**
> **Note**: Copy the URL from the previous step into `$BACKEND_URL` below.

```powershell
$BACKEND_URL = "https://edtonai-backend-xyz.a.run.app"

// turbo
gcloud builds submit ./frontend `
  --config ./frontend/cloudbuild.yaml `
  --substitutions "_IMAGE_TAG=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:v1,_VITE_SUPABASE_URL=$SUPABASE_URL,_VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY"

// turbo
gcloud run deploy edtonai-frontend `
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:v1" `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars "BACKEND_URL=$BACKEND_URL"
```
