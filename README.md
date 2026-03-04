# IRONLOG — Personal Fitness Tracker PWA

A complete workout, nutrition, and body metrics tracking app built as a Progressive Web App. Install it directly to your iPhone home screen — no App Store needed.

## Features

- **90+ Exercise Library** with YouTube form demos for every movement
- **500+ Food Database** with instant search and auto macro calculation
- **Workout Templates** — PPL, Upper/Lower, Full Body, and more
- **Rest Timer** with 60/90/120/180s presets and vibration alerts
- **PR Auto-Detection** — celebrates your personal records when you hit them
- **Calendar Planner** — weekly schedule with day-by-day workout planning
- **Plate Calculator** — shows exact plates per side for any target weight
- **Body Metrics** — weight, body fat, measurements with trend charts
- **Sleep & Water Tracking** alongside nutrition
- **Workout Ratings** — 5-star system on every session
- **Streak Counter** — tracks consecutive training days
- **Full Analytics** — volume, frequency, progression, and distribution charts
- **Offline Support** — works without internet after first load
- **Data persists** in localStorage across sessions

## Install on iPhone

1. Open `https://wisemanmax.github.io/ironlog/` in **Safari**
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it **IRONLOG** and tap **Add**
5. Launch from your home screen — runs fullscreen like a native app

## Deploy to GitHub Pages

```bash
# Create new repo called "ironlog" on GitHub
git init
git add .
git commit -m "IRONLOG v3 — PWA"
git branch -M main
git remote add origin https://github.com/wisemanmax/ironlog.git
git push -u origin main
```

Then in GitHub → Settings → Pages → Source: **main** branch, root folder.

Your app will be live at: `https://wisemanmax.github.io/ironlog/`

## Tech Stack

- React 18 (CDN)
- Recharts (charts)
- Babel standalone (JSX compilation)
- Service Worker (offline caching)
- localStorage (data persistence)
- Pure CSS-in-JS (no build tools needed)

## Built by Bwise
