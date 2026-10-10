const encoder = new TextEncoder();
// Cloudflare Workers Web Crypto supports PBKDF2 iteration counts up to 100,000.
const ITERATIONS = 100_000;
const bytesToBase64 = (bytes: Uint8Array) => {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const derive = async (password: string, salt: Uint8Array, iterations: number) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
};
export const hashPassword = async (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
};
export const verifyPassword = async (password: string, stored: string) => {
  if (!stored.startsWith('pbkdf2$')) return { valid: password === stored, needsUpgrade: password === stored };
  try {
    const [, iterationsValue, saltValue, hashValue] = stored.split('$');
    const expected = base64ToBytes(hashValue);
    const actual = await derive(password, base64ToBytes(saltValue), Number(iterationsValue));
    if (expected.length !== actual.length) return { valid: false, needsUpgrade: false };
    let difference = 0;
    for (let index = 0; index < expected.length; index++) difference |= expected[index] ^ actual[index];
    return { valid: difference === 0, needsUpgrade: Number(iterationsValue) < ITERATIONS };
  } catch {
    return { valid: false, needsUpgrade: false };
  }
};
