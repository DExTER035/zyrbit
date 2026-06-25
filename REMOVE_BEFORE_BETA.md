# DexOS — Remove Before Beta

The following features create high cognitive load, introduce data loss vulnerabilities, or represent broken placeholder logic. They must be removed or hidden before launching to private beta:

---

## 1. The Cosmos Shop (Profile Tab)
- **Why**: Buying cosmetic items or advanced telemetry unlocks entries in a database table but does not trigger any real code or UI changes.
- **Action**: Remove the mock shop catalog completely or limit it exclusively to avatar badge skins.

---

## 2. Secure Local Vault (Wealth Tab)
- **Why**: Storing vault keys solely in local storage cache causes permanent data loss if cache is cleared.
- **Action**: Remove the Secure Vault container entirely until database key backup or passphrase derivation is implemented.

---

## 3. Progress Photo Upload Box (Health Tab)
- **Why**: Converting high-res progress photos into raw Base64 strings and writing them directly inside database rows causes severe latency.
- **Action**: Remove the photo container until a Supabase Storage asset pipeline is wired up.

---

## 4. Blackout Mode Focus (Growth Tab)
- **Why**: It is an easily bypassable frontend overlay that can be cleared by refreshing the browser tab, failing its primary value promise.
- **Action**: Remove the Blackout toggle container.

---

## 5. Brain Teasers Quiz (Dex Tab)
- **Why**: Riddle and math trivia questions inside a voice wellness coach tab distract from core habits, timers, and telemetry routines.
- **Action**: Remove the Quiz subtab from Dex.
