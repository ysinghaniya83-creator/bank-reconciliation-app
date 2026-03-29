# Bank Reconciliation System

A complete bank reconciliation web application for managing multiple business entities and bank accounts.

## Entities Managed

| Entity | Bank | Opening Balance (Mar 6, 2026) |
|--------|------|-------------------------------|
| Kishan Enterprise | ICICI | ₹23,81,563 |
| Yaksh Carting | HDFC | ₹4,539 |
| Fremi Carting | Saraswat Bank | ₹4,123 |
| Shree Developer | Saraswat Bank | ₹7,927 |
| Shree Developer | HDFC | ₹12,861 |
| Shree Developer | Varachha Bank | ₹25,747 |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Backend**: Firebase (Auth + Firestore)
- **Dates**: date-fns

## Features

- **Google Sign-In Only** authentication
- **4-digit PIN Lock** with 15-minute inactivity timeout
- **Role-based access**: Admin / Editor / Viewer
- **Executive Dashboard** (Today's View with opening/closing balances)
- **Date Filter Dashboard** (View any date's balance)
- **Daily Ledger** with CRUD, filters, and CSV import
- **User Management** (Admin: change roles)
- **Activity Logs** (Admin: paginated, last 6 months)
- **Indian Rupee formatting** (₹1,23,456.78)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- A Firebase project with Firestore and Authentication enabled

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Authentication** > **Sign-in method** > **Google**
4. Enable **Firestore Database**
5. Go to **Project Settings** > **Your apps** > Add a Web App
6. Copy the Firebase config

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=your_admin@email.com
```

> `VITE_ADMIN_EMAIL`: This email will automatically be assigned the `admin` role on first login.

### 4. Deploy Firestore Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login
firebase login

# Initialize (select Firestore)
firebase init firestore

# Deploy rules and indexes
firebase deploy --only firestore
```

Or manually copy the contents of `firestore.rules` into Firebase Console > Firestore > Rules.

### 5. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 6. First-Time Setup

1. **Sign in with Google** using your admin email
2. You will be prompted to **set a 4-digit PIN**
3. After PIN setup, you'll see the dashboard
4. To seed initial data, open browser console and run:

```javascript
// In browser console after login
import('/src/lib/seedData.ts').then(m => m.runSeedData())
```

Or you can manually add the initial entities/categories through Firestore Console.

### 7. Build for Production

```bash
npm run build
```

The build output will be in the `dist/` folder.

## Balance Formula

```
Opening Balance (for date D) = Base Opening (Mar 6) + Sum of all Credits before D - Sum of all Debits before D

Closing Balance = Opening Balance + Today's Credits - Today's Debits

Net Movement = Today's Credits - Today's Debits
```

## CSV Import Format

The CSV import supports files with the following columns (order flexible, header row required):

```csv
Date,Entity Name,Description,Category,Credit,Debit
07/03/2026,Kishan Enterprise | ICICI,Sales Collection,Sales Receipt,150000,
08/03/2026,Yaksh Carting | HDFC,Diesel Expense,Diesel,,12000
```

## User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access: manage users, view logs, all CRUD |
| **editor** | Add/edit/delete transactions, view dashboards |
| **viewer** | Read-only: dashboards and ledger |

## PIN Lock System

- Each user sets a 4-digit PIN on first login
- Screen locks automatically after **15 minutes of inactivity**
- Inactivity tracked via: mouse movement, clicks, key presses, touch, scroll
- Wrong PIN: max 5 attempts, then automatic sign-out
- PIN stored as SHA-256 hash in Firestore

## Firestore Collections

- `transactions` - All financial transactions
- `entities` - Bank account entities with opening balances
- `categories` - Transaction categories
- `users` - User profiles with roles and PIN hashes
- `userLogs` - Activity/audit logs

## Security

- Firestore Security Rules enforce role-based access
- PINs are never stored in plain text (SHA-256 hashed)
- Activity logs are write-only for regular users (read by admins only)
- Admins cannot remove their own admin role
