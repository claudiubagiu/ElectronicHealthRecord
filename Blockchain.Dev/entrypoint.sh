#!/bin/sh

echo "🚀 Starting Hardhat node..."
npx hardhat node &

echo "⏳ Waiting for node to be ready..."
sleep 5

echo "📝 Deploying contracts..."
npx hardhat run scripts/deploy.js --network localhost

if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
else
  echo "❌ Deployment failed!"
  exit 1
fi

echo "🔄 Keeping container alive..."
tail -f /dev/null