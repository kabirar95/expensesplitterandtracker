# 💸 DIVVY: Autonomous Social Finance & Zero-App Settlement Engine
> **Next-Generation P2P Expense Splitter, 1-Tap UPI Intent Settlement & AI-Powered Personal Wealth Ecosystem**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## ⚡ The 10-Line Hook: Why Divvy Stops Judges Cold

> **Every group expense app built in the last decade suffers from the "Walled Garden Paradox":**  
> If you create a group on Splitwise, all 7 of your friends must download the app, create accounts, and calculate who owes whom—only to switch to GPay or PhonePe to manually type UPI IDs, settle debts off-platform, and completely lose track of where their personal salary went.
>
> **Divvy shatters this friction forever through Zero-App P2P Settlement.**  
> Snap a photo of a ₹6,400 restaurant bill: Divvy's computer vision OCR extracts every dish and tax, collapses 15 tangled debts into just 2 payments via Min-Cash-Flow algorithms, and lets you tap **"WhatsApp Ping"**. Your friend—**who does not even have Divvy installed**—receives a verified WhatsApp notification with an embedded NPCI UPI intent deep link. One tap opens their GPay/PhonePe with the exact ₹850 and payee preloaded; they authenticate with their fingerprint, and the debt is extinguished in 4 seconds. Divvy instantly synchronizes that payout into the payer's personal wealth ledger.  
> **It is not just an expense splitter; it is the autonomous operating system for shared financial life.**

---

## 🛑 1. The Core Problem: Onboarding Friction & Disconnected Wealth

Modern peer-to-peer personal finance is fundamentally broken across three dimensions:
1. **App Fatigue & Non-User Abandonment:** Forcing casual acquaintances or dining friends to download an 80MB application to split a ₹300 cab ride creates massive adoption resistance. As a result, the group organizer shoulders unpaid debts indefinitely.
2. **The Walled-Garden Data Void:** Traditional splitters live in absolute isolation from personal budgeting. When you settle a ₹3,500 weekend trip tab, that transaction never reflects in your monthly personal budget or savings rate, completely blinding you to your true financial health.
3. **Bill Extraction & Currency Paralysis:** Splitting long grocery receipts or itemized restaurant tabs with varying taxes, alcohol surcharges, and tips remains a painful, error-prone manual calculation.

---

## 🛠️ 2. What We Have Built (Live Production Platform)

Divvy is not a mockup—it is fully engineered, containerized, and deployed with a hardened full-stack architecture:

### ⚡ Feature Highlights
- 📲 **Zero-App WhatsApp UPI Deep Linking:** Debtors receive an interactive WhatsApp notification formatted with NPCI-standard UPI Intent deep links (`upi://pay?pa=...&am=...`). Tapping it instantly opens Google Pay, PhonePe, or Paytm with the receiver's UPI VPA and exact amount preloaded. The payer needs **zero app download or account creation**.
- 🧮 **Greedy Minimum-Cash-Flow Optimization:** High-performance graph debt simplification collapses $O(N^2)$ tangled peer balances down to the absolute mathematical minimum number of cross-member settlements.
- 🔄 **Dual-Ledger Autonomous Synchronization:** When any peer debt is settled (via UPI, Cash, or Bank Transfer), Divvy automatically verifies if the debtor is the active user and instantly logs an expense into their **Personal Expense Tracker** under the appropriate category (Food, Travel, Rent), preserving personal budget accuracy without manual re-entry.
- 🧾 **Vision OCR & Itemized Dining Splitter:** Upload receipts from camera or gallery. Tesseract neural OCR parses merchant names, item names, prices, GST/taxes, and service charges, allowing friends to claim their specific items with a single tap.
- 📑 **Forensic Bank Statement Importer (PDF/CSV):** Native parser for HDFC, SBI, ICICI, and major bank statements with a SHA-256 fingerprint deduplication engine that stops duplicate transaction imports.
- 💱 **Real-Time FX Multi-Currency Engine:** Live exchange rate integration (`USD`, `EUR`, `GBP`, `AED`, `JPY`, `INR`) with cached offline fallbacks for international holiday trips.
- 🧠 **Gemini AI Financial Copilot:** Conversational natural language expense entry (*"Had sushi with Rahul and Priya for 2400"*), predictive budget burn-rate forecasting, and automated weekly email digests via Resend.
- 🎨 **State-of-the-Art Cyber-Tech Aesthetic:** High-contrast slate-titanium readability on a `#0b0d14` deep space canvas with crimson & electric violet glow.

---

## 🚀 3. What We Plan on Building (The Autonomous Roadmap)

Divvy's future trajectory evolves from a reactive tracker into an ambient, self-driving financial engine:

1. **RBI Account Aggregator (AA) Auto-Pilot Sync:** Direct integration with licensed Account Aggregator APIs (Setu / OneMoney) for consent-driven, zero-click bank transaction streaming without manual PDF uploads.
2. **Conversational WhatsApp & Telegram Split Bot:** Group members can add the Divvy bot to existing WhatsApp group chats. Texting `@Divvy split 1800 for dinner equally` logs the bill, calculates shares, and posts 1-tap UPI payment buttons directly inside the chat.
3. **Split-to-Invest 'Round-Up' Micro-Wealth:** When settling debts, members can opt to round up payments to the nearest ₹10 or ₹50. The spare change is automatically routed into Digital Gold or high-yield liquid mutual fund micro-investments.
4. **Smart Escrow Travel Vaults:** Multi-party escrow pools where members pre-fund group vacations, programmatically releasing disbursements upon group multi-sig voting.

---

## 🏆 4. The Winning Edge: Why Divvy Wins

| Dimension | Traditional Splitters (e.g. Splitwise) | Banking Apps (GPay, PhonePe) | **Divvy** |
| :--- | :--- | :--- | :--- |
| **Recipient Onboarding** | Mandatory 80MB app install & account | Both must use the same ecosystem | **Zero app required (1-Tap WhatsApp UPI Intent)** |
| **Debt Simplification** | Basic / Paywalled | None (direct 1:1 transfers only) | **Greedy Min-Cash-Flow Algorithm** |
| **Personal Budget Link** | None (Walled Garden) | Bare transaction history | **Autonomous Dual-Ledger Sync** |
| **Itemized Dining Split** | Manual / Clunky | None | **Computer Vision OCR Bill Parser** |
| **Bank Import** | None | Limited to native account | **Forensic PDF/CSV Importer with Deduplication** |
| **AI Copilot** | None | None | **Google Gemini Natural Language & Predictions** |

---

## 💻 Local Development Setup

```bash
# 1. Clone repo
git clone https://github.com/kabirar95/expensesplitterandtracker.git
cd expensesplitterandtracker

# 2. Launch with Docker Compose
docker compose up -d

# 3. Access Services
# Frontend Web App:  http://localhost:5173
# FastAPI Swagger:    http://localhost:8000/docs
# API Health Check:   http://localhost:8000/api/health
```

---

## 📄 Executive Pitch Document

For hackathons, investor decks, and judging panels:
- **Download the Word Document:** [`DIVVY_EXECUTIVE_PITCH.docx`](DIVVY_EXECUTIVE_PITCH.docx)
