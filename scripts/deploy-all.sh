#!/bin/bash
BASE_DIR=$(dirname "$0")

echo "🚀 Memulai deployment untuk seluruh service..."

$BASE_DIR/deploy-api.sh
$BASE_DIR/deploy-admin.sh
$BASE_DIR/deploy-fe.sh
$BASE_DIR/deploy-docs.sh

echo "🏁 Seluruh service berhasil dipush ke Docker Hub."
