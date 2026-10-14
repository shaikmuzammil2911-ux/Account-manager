# Accounts Manager - OTT Subscription Management App

A production-ready, mobile-first Web Application for OTT subscription resellers and managers, built based on the reference walkthrough video and UI storyboard.

## 🌟 Key Features

1. **Home Dashboard**
   - **Sale**: Fast sales entry workflow with auto-calculations.
   - **Data**: Live inventory management across OTT platforms (Netflix, Prime Video, Disney+ Hotstar, SonyLIV, etc.).
   - **Recent Sales**: Searchable, filterable list of sales with date and validity filters.
   - **Fixed Bottom Navigation**: Instant toggle between `Home` and `Expiry`.

2. **Subscription Inventory Management**
   - Filter bar with 4 functional controls:
     - **Selected**: View and work through chosen accounts sequentially.
     - **Empty**: Show only accounts with available screen slots.
     - **Validity**: Filter accounts by validity (1, 3, 6, 12 months).
     - **Top / Bottom (⇅)**: Instant reverse sorting order.
   - Numbered inventory cards with red ribbon badges (`01`, `02`).
   - 5-screen slot visualization:
     - `+` for empty, ready-to-sell slots (clicking immediately opens the Sale form with account & screen preselected).
     - Green / Red badges for active or expired slots.
   - **Edit (UnLock)** and **Save**: Protected credential editing with persistent backend updates.

3. **New Sale Workflow**
   - Brand selection, validity selection with glossy embossed pill options.
   - Activation date picker popup calendar.
   - Automatic expiry date calculation based on validity.
   - Screen slot & PIN auto-assignment or selection.
   - Customer details (Name, Phone, Reference Name, Reference Number).
   - Confetti celebration upon saving and recording.

4. **Expiry Management & WhatsApp Notifications**
   - 4 Top filters: `ALL`, `In 02 Days`, `Today`, `Expired`.
   - Clear cards with customer details, mail ID, password, validity, screen, pin, and dates.
   - **Notify Button**: Launches WhatsApp with prefilled renewal reminder template or records in-app notification status.

5. **Date Picker Modal**
   - Calendar popup matching frame 56s from the reference video.
   - Month navigation and date selection.

6. **Settings & Customization**
   - Edit Sale Form & WhatsApp Template.
   - Credentials protection.
   - Database reset to original video demo records.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
npm install
```

### Running Locally
To run both backend API server and frontend development server simultaneously:
```bash
npm run start
```

Or run separately:
```bash
# Terminal 1: Backend Express Server (Port 5001)
npm run server

# Terminal 2: Vite Dev Server (Port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser.

## 🛠 Tech Stack
- **Frontend**: React 18, Vite 6, Lucide Icons, Canvas Confetti
- **Styling**: Vanilla CSS Design System with 3D glossy button gradients, ribbon chevron badges, and mobile viewport simulator frame
- **Backend**: Node.js, Express 4, REST API
- **Persistence**: File-persisted atomic JSON database (`server/data/database.json`)
