# DexOS — QA Bug Report

This document reports critical, high, and medium-severity bugs discovered in the DexOS application during systemic end-to-end user simulation.

---

### Bug 1: Mock Shop Item Purchases Have No Code Effect
- **Severity**: High
- **Screen**: Profile (Market Sub-Tab)
- **Steps to Reproduce**:
  1. Complete habits or quizzes to earn 500 Zyrons.
  2. Navigate to Profile -> Market.
  3. Buy the "Cosmos Themes" or "Deep Analytics" item.
  4. Confirm purchase.
- **Expected Behavior**: Custom color themes should unlock in styling variables, or new historical chart graphs should reveal themselves on Stats.
- **Actual Behavior**: 500 Zyrons are subtracted from the wallet, the database registers a row in `shop_purchases`, but the codebase executes no UI changes or functional activations.
- **Root Cause**: The items are purely conceptual. No client-side rendering hooks are wired up to read the contents of the `shop_purchases` table.
- **Recommended Fix**: Wire up visual checks to the active purchases (e.g. disable stats rendering unless "Deep Analytics" is owned in `shop_purchases`).

---

### Bug 2: Local AES-GCM Encryption Key Recovery Vulnerability
- **Severity**: Critical
- **Screen**: Wealth (Safe Vault)
- **Steps to Reproduce**:
  1. Open Wealth -> Safe Vault.
  2. Set up password vault keys and log secure content.
  3. Clear browser cache / Application Local Storage.
  4. Attempt to unlock the vault.
- **Expected Behavior**: Key should be recovered via user email password decryption.
- **Actual Behavior**: The vault data is permanently lost and unrecoverable.
- **Root Cause**: The vault encryption keys are stored solely in local client memory/cache instead of synchronized, encrypted profile tables.
- **Recommended Fix**: Implement PBKDF2 key derivation using the user's login passphrase, or store encrypted key envelopes securely on a Supabase database vault table.

---

### Bug 3: Temporary Blackout Mode Bypass
- **Severity**: Medium
- **Screen**: Growth
- **Steps to Reproduce**:
  1. Turn on "Blackout Mode" focus block.
  2. Refresh the browser tab or close and reopen it.
- **Expected Behavior**: The active countdown session should resume in Blackout focus view.
- **Actual Behavior**: Blackout Mode exits instantly, showing all details and headers.
- **Root Cause**: Blackout Mode state is managed purely in temporary React state context instead of persistent storage cache hooks.
- **Recommended Fix**: Cache active blackout focus status in LocalStorage or check database active focus records on mount.

---

### Bug 4: Paywall Client-Side Gating Bypass
- **Severity**: Medium
- **Screen**: Dex
- **Steps to Reproduce**:
  1. Prompt Dex AI coach 5 times in a single day on a free tier.
  2. Paywall overlay prompts upgrade to premium.
  3. Clear cookies/local storage for `zyrbit_dex_chats_<date>`.
  4. Send another message.
- **Expected Behavior**: Daily limit should be verified on database metadata checks.
- **Actual Behavior**: Paywall is completely bypassed and user continues prompting the model.
- **Root Cause**: daily chat counters are incremented and checked solely in client-side local storage.
- **Recommended Fix**: Record chat prompts in a database metadata transaction table and enforce the count check via Supabase RPC functions.

---

### Bug 5: Base64 Progress Photo Database Bloat
- **Severity**: High
- **Screen**: Health
- **Steps to Reproduce**:
  1. Open Health page.
  2. Upload a high-resolution progress photo.
- **Expected Behavior**: Photo is uploaded to an asset bucket and stored as a light URL string.
- **Actual Behavior**: Raw image file is converted into a huge Base64 string and written directly inside the database table columns, causing performance lag.
- **Root Cause**: Absence of integration with Supabase Storage Buckets for health progression uploads.
- **Recommended Fix**: Set up a Supabase Storage bucket for photo progress logs and store only the public URL in the database logs.
