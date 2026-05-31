# Engrow — Deploy Guide

## What you need (already done ✓)
- GitHub account
- Render account (connected to GitHub)
- Gemini API key from aistudio.google.com

---

## Step 1 — Push to GitHub

1. Go to github.com → click the green "New" button
2. Name it: `engrow`
3. Leave it Public
4. Click "Create repository"
5. GitHub will show you a page with commands. Copy and run these in your terminal (or paste them one by one):

```
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/engrow.git
git push -u origin main
```

---

## Step 2 — Deploy backend on Render

1. Go to render.com → click "New +" → "Web Service"
2. Connect your GitHub repo: `engrow`
3. Settings:
   - **Name**: engrow-backend
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Click "Advanced" → "Add Environment Variable":
   - `GEMINI_API_KEY` → paste your Gemini key
   - `JWT_SECRET` → type any long random string (example: `engrow-super-secret-key-2024-xyz`)
   - `NODE_ENV` → `production`
5. Click "Create Web Service"

---

## Step 3 — Add the database on Render

1. On Render → click "New +" → "PostgreSQL"
2. Name: `engrow-db`
3. Plan: Free
4. Click "Create Database"
5. After it creates, go to your backend service → Environment → Add:
   - `DATABASE_URL` → paste the "Internal Database URL" from your database page

---

## Step 4 — Deploy frontend on Render

1. Render → "New +" → "Static Site"
2. Connect same GitHub repo
3. Settings:
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: dist
4. Add Environment Variable:
   - `VITE_API_URL` → your backend URL (example: `https://engrow-backend.onrender.com/api`)
5. Click "Create Static Site"

---

## Done ✓

Your app is live. Share the frontend URL with users.

---

## Free tier note

On Render's free tier, the backend sleeps after 15 minutes of no use.
First request after sleep takes ~30 seconds. This is normal for testing.
Upgrade to Starter ($7/month) when you have real users.
