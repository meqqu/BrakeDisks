# Brake Disks Store

A lightweight prototype of an **online store for motorcycle brake discs** built with **Vite** (vanilla JavaScript).

## Features
- Modern dark‑theme UI with glass‑morphism, gradients and micro‑animations.
- Two roles:
  - **Shop visitor** – can browse, filter by brand and search.
  - **Owner (admin)** – password‑protected *Warehouse* page (`admin.html`) for adding, editing and deleting products. Authentication is a simple `prompt()` using the password defined in `config.js` (default `admin123`).
- All data stored in **localStorage**; a seed catalog lives in `products.json`.
- No backend required – run entirely in the browser.

## Tech Stack
- **Vite** – dev server (`npm run dev`).
- **HTML / CSS / JavaScript (ESM modules)**. 
- No external UI libraries – pure vanilla code.

## Project Structure
```
BrakeDisks/
├─ index.html          # shop front‑end
├─ admin.html          # warehouse (owner) UI
├─ style.css           # design system (dark theme, animations)
├─ app.js              # shop logic (load, filter, search)
├─ admin.js            # admin CRUD + password prompt
├─ config.js           # admin password constant
├─ products.json       # initial catalog (seed data)
├─ vite.config.js      # minimal Vite config
├─ package.json        # Vite dev dependencies
└─ README.md           # you are reading it now
```

## Setup & Run
```bash
# 1. Install dependencies (Vite)
cd /home/meqquz/Projects/BrakeDisks
npm install

# 2. Start the dev server
npm run dev

# Or start using the python HTTP server (user preferred)
npm run start-python
# (Equivalent to: python3 -m http.server 8080)
```
The site will be available at `http://localhost:5173` (Vite dev) or `http://localhost:8080` (Python HTTP server).

- Open `http://localhost:5173` to view the shop.
- Open `http://localhost:5173/admin.html` for the warehouse. Use the password `admin123` (or change it in `config.js`).

## Customisation
- **Change admin password** – edit `config.js`.
- **Add/modify styling** – edit `style.css` (CSS variables are defined at the top).
- **Add more products** – edit `products.json` or use the admin UI.
- **Add new brands** – just add a product with a new `brand` value; the UI will generate a filter button automatically.

---
*Enjoy the modern, fast, and lightweight prototype!*
