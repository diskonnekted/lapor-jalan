# Deploy Railway/Render: Backend

## Environment Variables (set in Railway/Render dashboard)
PORT=3005
JWT_SECRET=your-secret-key-here
GOOGLE_VISION_API_KEY=your-google-api-key-here

## Start Command
node server.js

## Build Command  
npm install && npm run seed && npm run seed-osm && npm run seed-desa
