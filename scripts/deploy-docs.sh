#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Portal Docs (Next.js)..."
cd $SCRIPT_DIR/../routex-docs
if [ ! -f .env ]; then
  echo "⚠️ routex-docs/.env tidak ditemukan! Menggunakan default."
fi
docker build --platform $PLATFORM -t $DOCKER_USER/routex-docs:$TAG .
docker push $DOCKER_USER/routex-docs:$TAG

echo "✅ Portal Docs pushed."
