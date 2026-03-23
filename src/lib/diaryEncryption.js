export const deriveKey = async (pin, userId) => {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin + userId),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(userId),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export const encryptText = async (text, key) => {
  if (!text) return ''
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  )
  const combined = new Uint8Array(
    iv.byteLength + encrypted.byteLength
  )
  combined.set(iv, 0)
  combined.set(
    new Uint8Array(encrypted),
    iv.byteLength
  )
  return btoa(String.fromCharCode(...combined))
}

export const decryptText = async (encoded, key) => {
  if (!encoded) return ''
  try {
    const combined = Uint8Array.from(
      atob(encoded), c => c.charCodeAt(0)
    )
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    return new TextDecoder().decode(decrypted)
  } catch { return null }
}

export const hashPin = async (pin) => {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(pin)
  )
  return btoa(String.fromCharCode(
    ...new Uint8Array(hash)
  ))
}

export const verifyPin = async (pin, storedHash) => {
  const hash = await hashPin(pin)
  return hash === storedHash
}
