const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size in bytes

/**
 * Gets the encryption key from environment variable.
 * Converts the 32-byte hex key to a Buffer.
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is missing.');
  }
  // Convert 64-character hex string to a 32-byte buffer
  const keyBuffer = Buffer.from(secret, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_SECRET must resolve to a 32-byte buffer (64 hex characters).');
  }
  return keyBuffer;
}

/**
 * Encrypts a plain-text string.
 * Returns the IV and ciphertext separated by a colon (e.g. "ivHex:cipherHex").
 * @param {string} text - The raw string to encrypt (e.g. AWS Secret Key)
 */
function encrypt(text) {
  if (!text) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV in hex format so we can read it during decryption
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a cipher text string formatted as "ivHex:cipherHex".
 * @param {string} encryptedText - The encrypted string retrieved from DB
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format. Must contain IV prefix.');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
