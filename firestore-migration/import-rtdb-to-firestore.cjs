'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ID = 'mutabi-acb51';
const DEFAULT_DATA_FILE = path.join(__dirname, 'rtdb-export.json');
const DEFAULT_SERVICE_ACCOUNT_FILE = path.join(__dirname, 'serviceAccountKey.json');
const MAX_SAFE_DOCUMENT_BYTES = 900 * 1024;
const BATCH_SIZE = 400;

function printUsage() {
  console.log(`
Mutabi Realtime Database -> Cloud Firestore importer

Usage:
  node import-rtdb-to-firestore.cjs --dry-run
  node import-rtdb-to-firestore.cjs --apply
  node import-rtdb-to-firestore.cjs --apply --overwrite
  node import-rtdb-to-firestore.cjs --dry-run --file "C:\\path\\to\\rtdb-export.json"

Options:
  --dry-run     Validate and show the import plan. This is the default.
  --apply       Write documents to Cloud Firestore.
  --overwrite   Replace existing documents (requires --apply).
  --file        Path to the Realtime Database JSON export.
  --help        Show this help.

Project: ${PROJECT_ID}
`);
}

function getOptionValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`Missing value after ${name}`);
  }
  return args[index + 1];
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateSegment(segment, label) {
  if (typeof segment !== 'string' || segment.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (segment.includes('/') || segment === '.' || segment === '..' || /^__.*__$/.test(segment)) {
    throw new Error(`Invalid Firestore path segment for ${label}: ${segment}`);
  }
  if (Buffer.byteLength(segment, 'utf8') > 1500) {
    throw new Error(`${label} exceeds Firestore's document/collection ID length limit.`);
  }
}

function validateValue(value, location = 'document') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number found at ${location}`);
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      if (Array.isArray(value[i])) {
        throw new Error(`Nested arrays are not supported by Firestore at ${location}[${i}]`);
      }
      validateValue(value[i], `${location}[${i}]`);
    }
    return;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (!key) throw new Error(`Empty field name found at ${location}`);
      if (/^__.*__$/.test(key)) throw new Error(`Reserved Firestore field name found at ${location}.${key}`);
      validateValue(child, `${location}.${key}`);
    }
    return;
  }
  throw new Error(`Unsupported value type at ${location}: ${typeof value}`);
}

function readExport(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON export not found: ${filePath}\nSave your Realtime Database export as rtdb-export.json in this folder.`);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`The export file is not valid JSON: ${error.message}`);
  }

  if (!isObject(data)) throw new Error('The JSON root must be an object.');
  return data;
}

function buildOperations(data) {
  const operations = [];
  const sourceCounts = {};

  for (const [collectionName, records] of Object.entries(data)) {
    validateSegment(collectionName, 'collection name');
    if (!isObject(records)) {
      throw new Error(`Root node "${collectionName}" must be an object/map in this export.`);
    }

    if (collectionName === 'adhkarProgress') {
      let userCount = 0;
      let dayCount = 0;

      for (const [uid, days] of Object.entries(records)) {
        validateSegment(uid, 'adhkarProgress user ID');
        if (!isObject(days)) throw new Error(`adhkarProgress/${uid} must contain a date map.`);

        // Create a lightweight parent document, then store each date in its own subcollection document.
        operations.push({
          path: `adhkarProgress/${uid}`,
          data: { uid },
          source: collectionName,
        });
        userCount += 1;

        for (const [date, progress] of Object.entries(days)) {
          validateSegment(date, `adhkarProgress date for ${uid}`);
          if (!isObject(progress)) {
            throw new Error(`adhkarProgress/${uid}/${date} must be an object.`);
          }
          const documentData = { uid, date, ...progress };
          validateValue(documentData, `adhkarProgress/${uid}/days/${date}`);
          checkDocumentSize(`adhkarProgress/${uid}/days/${date}`, documentData);
          operations.push({
            path: `adhkarProgress/${uid}/days/${date}`,
            data: documentData,
            source: collectionName,
          });
          dayCount += 1;
        }
      }

      sourceCounts[collectionName] = { users: userCount, days: dayCount, documents: userCount + dayCount };
      continue;
    }

    let count = 0;
    for (const [documentId, record] of Object.entries(records)) {
      validateSegment(documentId, `${collectionName} document ID`);
      if (!isObject(record) && !Array.isArray(record)) {
        throw new Error(`${collectionName}/${documentId} must be an object or array.`);
      }
      validateValue(record, `${collectionName}/${documentId}`);
      checkDocumentSize(`${collectionName}/${documentId}`, record);
      operations.push({ path: `${collectionName}/${documentId}`, data: record, source: collectionName });
      count += 1;
    }
    sourceCounts[collectionName] = { documents: count };
  }

  return { operations, sourceCounts };
}

function checkDocumentSize(documentPath, data) {
  const bytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (bytes > MAX_SAFE_DOCUMENT_BYTES) {
    throw new Error(
      `Document ${documentPath} is approximately ${bytes} bytes, above this script's safety threshold. ` +
      'Split this record into subcollection documents before importing.'
    );
  }
}

function printPlan(filePath, operations, sourceCounts) {
  console.log('\n=== Mutabi Firestore migration plan ===');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Source file: ${filePath}`);
  console.log('\nSource root nodes:');
  for (const [name, counts] of Object.entries(sourceCounts)) {
    if (name === 'adhkarProgress') {
      console.log(`  ${name}: ${counts.users} user parent docs + ${counts.days} daily docs = ${counts.documents} documents`);
    } else {
      console.log(`  ${name}: ${counts.documents} documents`);
    }
  }
  console.log(`\nTotal Firestore documents planned: ${operations.length}`);
  console.log('\nMapping:');
  console.log('  activities/{presetId}');
  console.log('  admins/{uid}');
  console.log('  encouragements/{id}');
  console.log('  logs/{logId}');
  console.log('  notes/{noteId}');
  console.log('  users/{uid}');
  console.log('  adhkarProgress/{uid}/days/{YYYY-MM-DD}');
  console.log('\nThe source Realtime Database is not modified.');
}

async function importDocuments(operations, overwrite) {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT || DEFAULT_SERVICE_ACCOUNT_FILE);
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Service account key not found: ${keyPath}\n` +
      'Download a private key for project mutabi-acb51 and save it as serviceAccountKey.json in this folder.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Service account file is not valid JSON: ${error.message}`);
  }

  if (serviceAccount.project_id !== PROJECT_ID) {
    throw new Error(
      `Wrong service account project. Expected ${PROJECT_ID}, received ${serviceAccount.project_id || 'unknown'}. ` +
      'Do not import into another Firebase project.'
    );
  }

  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
  const db = getFirestore(app);

  try {
    await db.listCollections();

    let written = 0;
    let skipped = 0;
    const pending = [];

    for (const operation of operations) {
      const ref = db.doc(operation.path);
      if (!overwrite) {
        const existing = await ref.get();
        if (existing.exists) {
          skipped += 1;
          continue;
        }
      }
      pending.push({ ref, data: operation.data });
    }

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batchItems = pending.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const item of batchItems) batch.set(item.ref, item.data);
      await batch.commit();
      written += batchItems.length;
      console.log(`Uploaded ${written}/${pending.length} documents...`);
    }

    let verified = 0;
    for (const item of pending) {
      const snapshot = await item.ref.get();
      if (snapshot.exists) verified += 1;
    }

    console.log('\n=== Import result ===');
    console.log(`Written: ${written}`);
    console.log(`Skipped because they already existed: ${skipped}`);
    console.log(`Verified after upload: ${verified}/${pending.length}`);
    console.log('Realtime Database export and source database were not changed.');

    if (verified !== pending.length) {
      throw new Error('Verification count does not match the number of attempted writes. Review the Firestore console.');
    }
  } finally {
    await app.delete();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const apply = args.includes('--apply');
  const overwrite = args.includes('--overwrite');
  if (overwrite && !apply) throw new Error('--overwrite can only be used together with --apply.');
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('Use either --dry-run or --apply, not both.');

  const fileArg = getOptionValue(args, '--file');
  const filePath = path.resolve(fileArg || DEFAULT_DATA_FILE);
  const data = readExport(filePath);
  const { operations, sourceCounts } = buildOperations(data);

  printPlan(filePath, operations, sourceCounts);

  if (!apply) {
    console.log('\nDRY RUN ONLY: no Firestore data was written.');
    console.log('After reviewing the plan and adding the service account key, run:');
    console.log('  node .\\import-rtdb-to-firestore.cjs --apply');
    return;
  }

  if (overwrite) {
    console.warn('\nWARNING: --overwrite replaces existing documents at the same paths.');
  } else {
    console.log('\nExisting Firestore documents will be skipped; no existing document will be replaced.');
  }

  await importDocuments(operations, overwrite);
}

main().catch((error) => {
  console.error('\nMIGRATION FAILED');
  console.error(error.message || error);
  process.exitCode = 1;
});
