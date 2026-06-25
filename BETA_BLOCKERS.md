# DexOS — Beta Blockers Checklist

This document details the issues that **must be fixed** before launching DexOS to the first 20 private beta users.

---

## 1. Remove Cosmos Market Simulated Purchases
- **Severity**: High
- **Issue**: Users spending earned Zyrons to unlock premium features (like "Deep Analytics" or "Themes") face broken hooks since these features are not implemented in code.
- **Consequence**: Destruction of user trust within the first 5 minutes of usage.
- **Fix**: Remove mock shop purchases or restrict the items to unlocked profile badge avatars only.

---

## 2. Eliminate Local AES-GCM Vault Cache Key
- **Severity**: Critical
- **Issue**: The vault encryption key is stored solely in local memory/cache. If a user clears their cache or signs in on a different device, their stored vault data becomes permanently unrecoverable.
- **Consequence**: Permanent loss of financial/personal telemetry logs.
- **Fix**: Migrate keys to a secure, encrypted profile table in Supabase or implement passphrase key derivation.

---

## 3. Replace Base64 Progress Photo Uploads
- **Severity**: High
- **Issue**: Progress photos are stored inside the database columns as massive Base64 strings.
- **Consequence**: Slows down the database queries, increases latency, and threatens bandwidth costs.
- **Fix**: Replace base64 database columns with a standard Supabase Storage Bucket file upload pipeline.

---

## 4. Move Paywall Counter Checks to Database Rules
- **Severity**: Medium
- **Issue**: Daily AI coach prompt limits are tracked only in client-side `localStorage`.
- **Consequence**: Tech-savvy beta users bypass constraints instantly by clearing cookies.
- **Fix**: Store and check daily prompt allocations in a database metadata transaction schema.
