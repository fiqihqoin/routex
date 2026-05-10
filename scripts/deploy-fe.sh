#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Frontend (Vite)..."
cd $SCRIPT_DIR/../fe
if [ ! -f .env ]; then
  echo "⚠️ fe/.env tidak ditemukan! Menggunakan default."
fi
docker build --platform $PLATFORM -t $DOCKER_USER/routex-fe:$TAG .
docker push $DOCKER_USER/routex-fe:$TAG

echo "✅ Frontend pushed."
