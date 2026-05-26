#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "$0") && pwd)
source $SCRIPT_DIR/config.sh

echo "📦 Building Transaction API (Go) for $PLATFORM..."
cd $SCRIPT_DIR/../services/transaction-api

# Build using buildx to support efficient cross-compilation
docker buildx build --platform $PLATFORM -t $DOCKER_USER/caishenengine-go-api:$TAG --push .

echo "✅ Transaction API built and pushed."
