# 🚀 Divvy - Expense Splitting & Financial Management Platform
### Client Product Brief & Executive Overview

---

## 📌 Executive Summary

**Divvy** is a next-generation, high-performance web platform designed to streamline **shared group expenses** and **personal budget management** into one seamless, intuitive, cyber-themed experience.

Whether managing shared household expenses, splitting vacation costs among friends, or tracking long-term personal financial goals, Divvy empowers users with real-time calculations, automated debt simplification, and multi-horizon budget analytics.

---

## 🌟 Core Value Propositions

| Problem | Divvy Solution |
| :--- | :--- |
| **Awkward Peer Debts**: Manual math leads to confusion, missed repayments, and dozens of redundant transfer requests. | **Algorithmic Debt Simplification**: Automatically calculates the minimum possible peer-to-peer payments required to settle all debts. |
| **Over-Budget Surprises**: Users track expenses too late, missing monthly targets. | **Real-Time Visual Alerts**: Color-coded progress bars (Emerald → Amber → Vivid Red) and instant overflow badges (`+₹X.XX Over Budget`). |
| **Rigid Tracker Tools**: Most apps only show the current calendar month. | **Timezone-Safe Month Navigator & 12-Month Horizon**: Effortlessly plan future months or review annual forecasts across Jan–Dec. |
| **Cluttered Interfaces**: Generic financial tools feel outdated and complex. | **Cyber-Tech Aesthetic**: Premium dark mode, high-contrast typography, glassmorphism, and micro-animations. |

---

## ✨ Key Feature Portfolio

### 1. 👥 Shared Group Expense Splitting
- **Multi-Type Bill Splitting**: Split expenses across group members using flexible calculation engines:
  - ⚖️ **Equal Split**: Even division among all selected participants.
  - 📊 **Percentage Split**: Custom weighted percentage allocation (must total 100%).
  - 🎯 **Exact Amount Split**: Specific monetary assignments per member.
- **Smart Debt Matrix & Simplification**: Eliminates redundant circular debts. For example, if User A owes User B ₹500, and User B owes User C ₹500, Divvy simplifies the transfer so User A pays User C ₹500 directly.
- **One-Click Settlement Recording**: Record full or partial settlements with instant balance recalculation.

---

### 2. 💳 Personal Budget & Expense Tracking
- **Overall Monthly Budget Target**: Establish a primary monthly target cap for all personal expenditures.
- **Category Breakdown Budgets**: Set individual limits for key categories (e.g. *Food & Dining*, *Travel & Transit*, *Utilities*, *Shopping*, *Entertainment*).
- **Separated Monthly vs. Yearly Metrics**:
  - 📅 **Monthly Spent**: Dynamically calculates spending strictly within the selected month.
  - 📈 **Yearly Spent**: Tracks cumulative spending across the entire calendar year.
  - 🛡️ **Remaining Cap / Over Budget**: Real-time indicator displaying available funds or exact overflow.

---

### 3. 🗓️ Interactive Month Navigator & 12-Month Yearly Horizon
- **Timezone-Safe Month Navigation**: Seamlessly navigate between past, present, and future months using `◀`, `▶`, or a direct Month-Picker.
- **📈 12-Month Yearly Horizon Grid**: Switch to an annual view showing total annual forecasts, estimated year-end savings, and an interactive 12-month grid displaying per-month spending totals.

---

### 4. 📊 Visual Analytics & AI Financial Assistance
- **Category Pie Charts & Spending Trend Bar Charts**: Interactive visual breakdowns powered by Recharts.
- **Divvy AI Assistant**: Smart financial advisory interface providing actionable advice on spending patterns and savings opportunities.

---

## 🔒 Enterprise-Grade Security & Infrastructure

- **Encrypted Password Protection**: User passwords are encrypted using industry-standard `bcrypt` hashing before storage.
- **Secure JWT Bearer Authentication**: Session control governed by JSON Web Tokens with strict access token expiration policies.
- **Supabase PostgreSQL Cloud Database**: Powered by Supabase, offering row-level security, automated backups, and 99.9% uptime.
- **Blazing Fast Performance**: Built on FastAPI async Python backend and Vite React frontend, delivering sub-100ms response times.

---

## 🗺️ Product Roadmap

```
[Phase 1: Core Engine] ✔
- Auth, JWT, Group Splitting, Debt Simplification Matrix

[Phase 2: Personal Tracker] ✔
- Monthly & Category Budgets, Month Navigator, 12-Month Yearly Horizon

[Phase 3: Visual Polish] ✔
- Cybertech Dark Aesthetics, High Contrast UI, Recharts Analytics

[Phase 4: Next Release] ⏳
- Automated OCR Receipt Scanner (Scan receipts via camera/upload)
- Automated Email & SMS Digest Notifications
- Native iOS & Android Mobile Apps
```

---

## 💼 Technical Specifications Summary

- **Frontend**: React 18, Vite, Zustand State Engine, Recharts, Vanilla CSS.
- **Backend API**: FastAPI (Python 3.12), SQLAlchemy 2.0 ORM, Pydantic, Uvicorn.
- **Database**: Supabase PostgreSQL Cloud.
- **Deployment Platform**: Vercel (Frontend) + Cloud Container Backend.

---

*Divvy Product Overview Document — Confidential Client Reference Brief v1.0*
