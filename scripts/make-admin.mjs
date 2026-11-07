#!/usr/bin/env node
/**
 * Script to assign an admin in Firebase Firestore.
 * Usage: node scripts/make-admin.mjs <USER_UID>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const uid = process.argv[2];

if (!uid) {
  console.error('❌ يرجى تمرير UID المستخدم: node scripts/make-admin.mjs <UID>');
  process.exit(1);
}

// Check for service account
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';

if (!existsSync(serviceAccountPath)) {
  console.log(`ℹ️ لم يتم العثور على ملف serviceAccountKey.json.`);
  console.log(`لتعيين الأدمن يدويًا في Firebase Console:`);
  console.log(`1. افتح Firestore Database.`);
  console.log(`2. أنشئ Collection باسم "admins".`);
  console.log(`3. أضف مستندًا بمعرف Document ID = ${uid}`);
  console.log(`4. أضف حقلاً: createdAt = [Server Timestamp].`);
  process.exit(0);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function makeAdmin() {
  try {
    await db.collection('admins').doc(uid).set({
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`✅ تم تعيين المستخدم (${uid}) كمشرف (Admin) بنجاح!`);
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  }
}

makeAdmin();
