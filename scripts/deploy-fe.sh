#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Frontend (Vite)..."
cd $SCRIPT_DIR/../fe
if [ ! -f .env ]; then
  echo "⚠️ fe/.env tidak ditemukan! Menggunakan default."
fi
echo "🐳 Packaging into Docker image ($PLATFORM) using Buildx..."
docker buildx build --pull --no-cache --platform $PLATFORM -t $DOCKER_USER/routex-fe:$TAG --load .
docker push $DOCKER_USER/routex-fe:$TAG

echo "✅ Frontend pushed."
