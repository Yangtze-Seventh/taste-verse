# 味迹 TasteVerse

**Your Personal Tasting Universe** — Record, visualize, and explore your tasting journey through an immersive 3D star map.

> 味有归处，心有所记 — *Taste has a home, memory has a record.*
<img width="1068" height="640" alt="gif图" src="https://github.com/user-attachments/assets/bac62a73-e4c2-4d45-a19d-269fbba947a5" />

## Overview

TasteVerse is a personal tasting journal that transforms your flavor experiences into an interactive 3D universe. Every coffee, tea, wine, meal, or dessert you taste becomes a glowing star in your personal cosmos. Shared flavors form constellation-like links, revealing hidden connections across your palate.

Built with React and Three.js, TasteVerse combines rich data entry with a visually stunning WebGL-powered exploration interface, an AI-powered sommelier chat assistant, and optional cloud synchronization.

## Features

### 🌌 3D Universe Visualization

The flagship feature — a force-directed 3D star map where each tasting record is a node.

- **Nodes** are glowing spheres sized by score and visit count, with orbiting rings and comet particles
- **Links** connect related tastings: same-category, shared tags, and taxonomy relationships
- **Environment** includes 7,000+ stars, nebula clouds, dust particles, and dramatic multi-color lighting
- Interactive orbit camera with click-to-focus, search filtering, and category isolation

<img width="1722" height="1178" alt="星云" src="https://github.com/user-attachments/assets/3e7541c2-4300-4864-8145-7d9dd1c8027b" />


### 📝 Tasting Records

Comprehensive data capture for every tasting experience:

- Product name with **fuzzy duplicate detection**
- 0–10 scoring system
- Flavor tags (freeform, enter-to-add)
- Tasting notes
- Price tracking (unit price or per-person average)
- Location / venue
- Photo upload
- **Visit tracking** — re-taste the same product over time, building a longitudinal flavor profile

<img width="539" height="988" alt="记录新品鉴" src="https://github.com/user-attachments/assets/a11f3cb3-1c1e-4980-8138-b6b2bbc66a4b" />


### 🗂️ Category Management

Organize tastings with a flexible two-level taxonomy:

- **5 default categories:** Coffee ☕, Tea 🍵, Wine 🍷, Chinese Food 🥢, Dessert 🍰
- Create **custom categories** with your own icon, name, color, and parent group
- Grid view with per-category statistics (average score, record count, popularity)
- Click any category to see all its records or isolate it in the 3D graph

<img width="539" height="988" alt="记录新品鉴" src="https://github.com/user-attachments/assets/822cd39e-5f42-41fd-a2cb-8dc785bcecf7" />


### 📅 Calendar View

Browse your tasting history by date:

- Monthly calendar with colored dots marking tasting days
- Day detail panel showing all records for the selected date
- Mini 3D cluster visualization per day
- Tag clouds and taste profiles for each day

<img width="357" height="769" alt="日历" src="https://github.com/user-attachments/assets/4f685c3d-f072-4719-be97-17a9c41959b7" />


### 🤖 AI Sommelier

An embedded AI chat assistant for intelligent tasting analysis:

- Natural-language chat for flavor queries and recommendations
- Image upload for product photo analysis
- Semantic memory search (powered by EverOS) for recalling relevant past tastings
- Distinctive **Möbius ring 3D visualization** with animated category ribbons

<img width="1814" height="1169" alt="ai品鉴师" src="https://github.com/user-attachments/assets/fa3f73f9-d883-4733-802f-c4d9c73b8010" />

### 🔍 Search & Discovery

- **Graph Search:** Real-time keyword search across names, tags, and notes — matching nodes highlight in the 3D graph
- **Semantic Search:** When connected to EverOS, hybrid keyword + vector search finds conceptually related tastings
- **Category Filtering:** Click any legend item to isolate a category cluster

### ☁️ Cloud Sync (Optional)

- Automatic sync to **EverOS** (Evermind AI) on record creation
- Full sync on app load when online
- Status indicator in navbar (green = online, gray = offline)
- **Fully offline-capable** — all core features work without cloud connectivity

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18.3 | UI rendering |
| Build | Vite 5.4 | Dev server & bundling |
| 3D Engine | Three.js 0.184 | WebGL rendering |
| Graph | 3d-force-graph 1.73 | Force-directed layout |
| Email | EmailJS 4 | Verification code delivery |
| Backend | Vercel Serverless | API proxy for EverOS |
| Cloud | EverOS (Evermind AI) | Sync & semantic search |
| Storage | localStorage | Client-side persistence |
| Fonts | Inter, Space Grotesk, Noto Sans SC | Typography (Latin + CJK) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Local Development

```bash
git clone https://github.com/your-username/taste-verse.git
cd taste-verse
npm install
npm run dev     # http://localhost:5173
```

> **Note:** The `/api/everos` endpoint is a Vercel Serverless Function and will not run with `npm run dev`. To enable cloud sync locally, use `vercel dev` instead:
>
> ```bash
> npm i -g vercel
> vercel dev
> ```

### Production Build

```bash
npm run build   # outputs to /dist
npm run preview # preview the production build
```

## Deployment (Vercel)

1. Import this repository into [Vercel](https://vercel.com). The framework will be auto-detected as Vite.

2. Set the following environment variables:

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `EVEROS_UPSTREAM` | EverOS API base URL | `https://api.evermind.ai/api/v1` |
   | `EVEROS_API_KEY` | API key from [EverOS](https://everos.evermind.ai/api-keys) (required for cloud sync) | `ek_...` |

3. After configuring environment variables, go to **Deployments → Latest → Redeploy** to apply them.

## Project Structure

```
taste-verse/
├── src/
│   ├── App.jsx                    # Root component — login screen, nav, view routing
│   ├── main.jsx                   # React 18 entry point
│   ├── lib/
│   │   ├── bootstrap.js           # Exposes Three.js & ForceGraph3D to window
│   │   └── tasteverse.js          # Core engine: 3D graph, auth, CRUD, storage, EverOS sync
│   ├── sommelier/
│   │   ├── AISommelier.jsx        # AI Sommelier panel component
│   │   ├── sommelier-engine.js    # Chat engine, recommendations, Möbius visualization
│   │   └── sommelier.css          # Sommelier panel styles
│   └── styles/
│       └── global.css             # Global styles (dark space theme)
├── api/
│   └── everos/
│       └── [...path].js           # Vercel serverless proxy for EverOS API (CORS)
├── public/                        # Static assets
├── index.html                     # SPA entry point
├── vite.config.js                 # Vite config with Three.js chunk optimization
├── vercel.json                    # Vercel rewrites & serverless config
└── package.json
```

## Data Storage

TasteVerse is **offline-first**. All data is stored in the browser's `localStorage` with per-user namespacing:

| Key | Content |
|-----|---------|
| `tv_session` | Current user session |
| `tv_{email}_notes` | All tasting records |
| `tv_{email}_taxonomy` | Category hierarchy |
| `tv_{email}_categories` | Category metadata |
| `tv_{email}_profile` | User profile (nickname, avatar, bio) |

When EverOS is connected, records are additionally synced to the cloud for backup and semantic search.

## Authentication

TasteVerse uses a **passwordless email verification** flow:

1. Enter your email address
2. Receive a 6-digit verification code via EmailJS
3. Enter the code to log in
4. Session persists in localStorage for automatic re-login

## Browser Requirements

- WebGL support (required for Three.js 3D rendering)
- Modern browser with ES6+ support (Chrome, Firefox, Safari, Edge)
- localStorage API

## License

See [LICENSE](./LICENSE) for details.

---

*Built with ❤️ and a passion for flavor.*
