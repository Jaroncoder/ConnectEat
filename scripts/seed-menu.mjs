import admin from 'firebase-admin';
import fs from 'node:fs';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const menuItems = [
  { name: 'Veg Sandwich', price: 60 },
  { name: 'Paneer Roll', price: 90 },
  { name: 'Masala Dosa', price: 80 },
  { name: 'Cold Coffee', price: 70 },
  { name: 'Fruit Bowl', price: 85 }
];

for (const item of menuItems) {
  await db.collection('menu').add(item);
  console.log('Added:', item.name);
}

console.log('Menu seeded successfully.');
process.exit(0);
