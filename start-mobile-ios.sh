#!/bin/bash

echo "========================================"
echo "  Local Desk iOS Uygulaması"
echo "========================================"
echo ""

cd LocalDesk

echo "[1/3] Bağımlılıkları kontrol ediliyor..."
if [ ! -d "node_modules" ]; then
    echo "node_modules bulunamadı, yükleniyor..."
    npm install
fi

echo ""
echo "[2/3] iOS Pods kontrol ediliyor..."
if [ ! -d "ios/Pods" ]; then
    echo "Pods bulunamadı, yükleniyor..."
    cd ios
    pod install
    cd ..
fi

echo ""
echo "[3/3] iOS uygulaması başlatılıyor..."
echo ""
npm run ios

