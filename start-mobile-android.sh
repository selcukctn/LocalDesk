#!/bin/bash

echo "========================================"
echo "  Local Desk Android Uygulaması"
echo "========================================"
echo ""

cd LocalDesk

echo "[1/2] Bağımlılıkları kontrol ediliyor..."
if [ ! -d "node_modules" ]; then
    echo "node_modules bulunamadı, yükleniyor..."
    npm install
fi

echo ""
echo "[2/2] Android uygulaması başlatılıyor..."
echo ""
npm run android

