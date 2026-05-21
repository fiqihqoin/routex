#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Portal Docs (Next.js)..."
cd $SCRIPT_DIR/../caishenengine-docs
if [ ! -f .env ]; then
  echo "⚠️ caishenengine-docs/.env tidak ditemukan! Menggunakan default."
fi
docker build --platform $PLATFORM -t $DOCKER_USER/caishenengine-docs:$TAG .
docker push $DOCKER_USER/caishenengine-docs:$TAG

echo "✅ Portal Docs pushed."
