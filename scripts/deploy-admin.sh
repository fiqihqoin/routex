#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Admin Dashboard (Laravel)..."
cd $SCRIPT_DIR/../services/admin
docker build --platform $PLATFORM -t $DOCKER_USER/routex-admin:$TAG .
docker push $DOCKER_USER/routex-admin:$TAG

echo "✅ Admin Dashboard pushed."
