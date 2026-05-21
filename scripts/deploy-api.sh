#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Transaction API (Go)..."
cd $SCRIPT_DIR/../services/transaction-api
docker build --platform $PLATFORM -t $DOCKER_USER/caishenengine-go-api:$TAG .
docker push $DOCKER_USER/caishenengine-go-api:$TAG

echo "✅ Transaction API pushed."
