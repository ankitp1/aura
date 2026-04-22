# Aura: The Passive Wardrobe

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

> **Hi Roshna! It’s a pleasure to introduce you to Aura.**
>
> Aura isn't just a closet app; it’s a high-fidelity identity engine designed for the modern wardrobe. Most fashion apps fail because they require "manual labor"—the tedious task of photographing every item you own. Aura solves this by looking backwards into your history to build your future style.

## The Vision
The core philosophy of Aura is that your style isn't what you buy, it’s the **Aura** of what you actually wear. By harvesting years of visual data from your personal photo library, Aura distills your chaotic photo history into a curated, permanent digital twin of your wardrobe.

## Key Feature Set

### 1. The Harvest Protocol (Zero-Entry Digitization)
Instead of manual uploads, Aura connects to your Google Photos library. Our vision engine scans your history, ignores the background noise, and clusters photos to identify your unique clothing items. It automatically selects the "Hero Image" for each piece, creating a digital closet without you lifting a finger.

### 2. Identity Matching & Style Aura
Aura analyzes the stylistic "DNA" of your wardrobe. It assigns you a dominant Aura type (e.g., Sartorialist, Minimalist, or Urban Avant-Garde) and provides a confidence score on how well your digital closet matches your real-world identity.

### 3. Style Me (Weather-Aware Gemini Stylist)
This is where the engine comes alive. You can ask Aura for styling help for any occasion—like "A morning gallery crawl in Soho."
* **Weather Intelligence:** Aura fetches the localized 6-hour forecast and adjusts its advice (suggesting layers for rain or breathable fabrics for heat).
* **Capsule Curation:** It recommends 3 distinct outfits using only items you actually own.
* **The Missing Piece:** It identifies the single "dark matter" item missing from your closet that would unlock the most new outfit combinations.

### 4. The Vault (Wardrobe Evaluator)
Every item in your harvest is scored on Versatility. Aura tells you which pieces are your "workhorses" and which ones are redundant, helping you move toward a more sustainable, high-impact capsule wardrobe.

### 5. Permanent Archive
Even if you delete old photos from your phone, Aura keeps the garment metadata and hero images safe. It’s a permanent record of your style evolution.

---

## Technical Stack & Architecture
* **Frontend:** React + Vite, styled with Tailwind CSS and Motion for fluid micro-animations.
* **Authentication:** Firebase Auth (Google Provider) with strict data isolation.
* **Database:** Firestore (with persistent offline caching).
* **AI & Vision:** Gemini 1.5 Flash for image reasoning, deduplication, and weather-aware outfit generation.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the required API keys in a `.env.local` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   # Firebase configuration relies on the active Google App setup.
   ```
3. Run the app:
   ```bash
   npm run dev
   ```

## API Access & Scope Warning
Aura utilizes the `https://www.googleapis.com/auth/photoslibrary.readonly` scope. To test this locally, ensure that your Google Cloud Project has the **Google Photos Library API** enabled, and that you are added as a Test User in the OAuth consent screen.
