# 🚀 Panduan Deploy: Frontend Vercel + Backend Railway

## Langkah 1: Deploy Backend ke Railway

1. Buka https://railway.app
2. Connect GitHub account → pilih repo `diskonnekted/lapor-jalan`
3. Deploy service baru → pilih direktori `backend`
4. Set environment variables di Railway dashboard:
   ```
   PORT=3005
   JWT_SECRET=generate-random-secret-here
   GOOGLE_VISION_API_KEY=your-api-key
   ```
5. Railway akan otomatis build dan deploy
6. Catat URL backend (misal: `https://your-app.railway.app`)

## Langkah 2: Deploy Frontend ke Vercel

1. Buka https://vercel.com
2. Import project dari GitHub: `diskonnekted/lapor-jalan`
3. Configure project:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Set environment variable di Vercel:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
   Ganti dengan URL backend Railway kamu
5. Deploy!

## Langkah 3: Test

1. Buka URL Vercel frontend
2. Test pelaporan kerusakan
3. Test admin dashboard
4. Semua data akan tersimpan di backend Railway

## Update Code

Setelah push ke GitHub:
```bash
git add .
git commit -m "update"
git push
```
Vercel dan Railway akan otomatis rebuild.
