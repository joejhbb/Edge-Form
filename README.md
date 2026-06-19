# EdgeForm

Ang **EdgeForm** ay isang web app na tumutulong mag-guide sa tamang postura habang nag-eehersisyo (Squats, Push-ups, at Planks) gamit ang camera ng iyong device. May kasama rin itong boses para sa pagbibilang at paggabay sa tamang porma.

---

## Saan Nakalagay ang mga Code at Files?

* **`src/`** - Lahat ng frontend codes (React, mga UI screen, dashboard, at forms).
* **`csharp-backend/`** - Backend program na isinulat sa C# para sa pag-calculate ng skeletal angles at posture quality.
* **`server.ts`** - Proxy helper para sa dynamic Text-to-Speech (boses).
* **Web Browser LocalStorage** - Dito direktang sinasave ang mga workout history. Kaya hindi na kailangan ng remote SQL database setup at magiging 100% offline-ready ang data mo.

---

## Paano Patakbuhin ang System sa Computer mo

Sundin lamang ang mga simpleng hakbang sa ibaba:

### 1. Patakbuhin ang Frontend (React App)
1. Siguraduhing may naka-install na **Node.js** (v18+) sa iyong computer.
2. Magbukas ng terminal o command prompt sa main folder at i-type:
   ```bash
   npm install
   ```
3. Pagkatapos mag-install, patakbuhin ang application:
   ```bash
   npm run dev
   ```
4. Buksan ang link na `http://localhost:3000` gamit ang Google Chrome browser.

### 2. Patakbuhin ang C# Backend (Optional)
Kung nais mo ring patakbuhin ang hiwalay na C# program para sa post-calculation:
1. Magbukas ng panibagong terminal window at pumunta sa backend folder:
   ```bash
   cd csharp-backend
   ```
2. I-run ang program gamit ang utos na ito:
   ```bash
   dotnet run
   ```
3. Maghintay hanggang sa ipakita nito na umaandar na ito sa `http://localhost:5000`.

### 3. Pagsamahin sa Browser
1. Sa tumatakbong website (`http://localhost:3000`), magpunta sa kahit anong Workout screen.
2. I-click ang **Settings Icon (⚙️)** sa itaas.
3. Tiyakin na ang API URL ay nakasulat bilang `http://localhost:5000`. Kapag mapapansin mo ang kulay berdeng badge na may nakasulat na **Online 🟢 (C# Engine)**, ibig sabihin ay konektado na sila!

*(Tandaan: Kung offline o walang tumatakbong C# Backend, may built-in fallback calculator pa rin ang frontend kaya gagana pa rin ang tracking kahit walang server.)*
