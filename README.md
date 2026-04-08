# ConnectEat (Firebase MVP)

A fast, queue-free canteen ordering system with:

- `mobile/` → React Native (Expo) student app
- `dashboard/` → React + Vite canteen staff dashboard
- `firebase/functions/` → Cloud Function to send FCM notification when order turns `Ready`

## 1) Prerequisites

- Node.js 20+
- npm 10+
- Firebase project
- Firebase CLI (`npm i -g firebase-tools`)

## 2) Environment Setup

Copy `.env.example` values into:

- `dashboard/.env`
- `mobile/.env`

Use `VITE_` variables in dashboard and `EXPO_PUBLIC_` variables in mobile.

## 3) Install Dependencies

```bash
cd /Users/macbookpro/projects/ConnectEat
npm run install:all
cd scripts && npm install
```

## 4) Seed Menu Data

Download a Firebase service account JSON and set:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/service-account.json"
cd /Users/macbookpro/projects/ConnectEat/scripts
node seed-menu.mjs
```

## 5) Run Apps

### Dashboard

```bash
cd /Users/macbookpro/projects/ConnectEat
npm run dev:dashboard
```

### Mobile (Expo)

```bash
cd /Users/macbookpro/projects/ConnectEat
npm run dev:mobile
```

If you need remote access from outside your local network, use the tunnel variant instead:

```bash
cd /Users/macbookpro/projects/ConnectEat/mobile
npm run start:tunnel
```

## 6) Deploy Notification Function

```bash
cd /Users/macbookpro/projects/ConnectEat/firebase
firebase login
firebase use <your-project-id>
firebase deploy --only functions
```

### Important: Blaze plan requirement

- Deploying Cloud Functions requires enabling `cloudbuild.googleapis.com` and related APIs.
- Firebase requires the project to be on the **Blaze (pay-as-you-go)** plan for this.
- If you stay on Spark, deploy rules only:

```bash
cd /Users/macbookpro/projects/ConnectEat/firebase
firebase deploy --only firestore:rules
```

- On Spark, push notifications from `firebase/functions/index.js` will not run, but the app still works with realtime status tracking.
- This project includes an in-app fallback alert in `mobile/App.js` that notifies users when status changes to `Ready`.

## Workflow Implemented

1. Student places order in mobile app.
2. Order writes to Firestore `orders`.
3. Dashboard receives it instantly through real-time listener.
4. Staff updates status: `Placed -> Preparing -> Ready`.
5. Cloud Function sends FCM push when status becomes `Ready`.
6. Student sees live status updates in app.

## Firestore Collections

- `menu`: `{ name, price }`
- `orders`: `{ userId, token, items[], totalAmount, status, createdAt, updatedAt, readyAt? }`
- `users`: `{ fcmToken? }`

## Notes

- Auth is anonymous in this MVP for speed.
- For production, switch to email/Google sign-in and tighten rules by role.
- Current `firebase/firestore.rules` are simplified for assignment demo speed (authenticated users can read/write).

## 5-Minute College Demo (Simplest Path)

Use this if you only need a working assignment demo quickly.

1. Keep project on Spark (free plan).
2. Deploy only Firestore rules:

```bash
cd /Users/macbookpro/projects/ConnectEat/firebase
firebase deploy --only firestore:rules
```

3. Start both apps:

```bash
cd /Users/macbookpro/projects/ConnectEat
npm run dev:dashboard
```

```bash
cd /Users/macbookpro/projects/ConnectEat
npm run dev:mobile
```

4. Demo flow:
	- Open mobile app, add items, place order.
	- Open dashboard, see order appear instantly.
	- Change status to `Preparing` then `Ready`.
	- Mobile updates in real-time and shows in-app ready alert.

For this demo mode, rules are intentionally permissive for authenticated users to reduce setup complexity.
