require('dotenv').config();
const { encrypt, decrypt } = require('./utils/crypto');

function testEncryptionUtility() {
  console.log('===================================================');
  console.log('    Testing AES-256-CBC Encryption Utility         ');
  console.log('===================================================');

  try {
    const testSecret = 'K3sktG6NQgEge1hOpHmH8qq8dySCB9GqUHrGQdvF';
    console.log(`[Test] Plain Text: "${testSecret}"`);

    const encrypted = encrypt(testSecret);
    console.log(`[Test] Cipher Text: "${encrypted}"`);

    if (!encrypted.includes(':')) {
      throw new Error('Encryption output format is invalid (missing IV delimiter ":")');
    }

    const decrypted = decrypt(encrypted);
    console.log(`[Test] Decrypted:  "${decrypted}"`);

    if (decrypted !== testSecret) {
      throw new Error('Decrypted string does not match the original plain text!');
    }

    console.log('\n[Success] Symmetric Encryption utility verified successfully!');
  } catch (err) {
    console.error('[Fail] Encryption check failed:', err.message);
    process.exit(1);
  }
}

testEncryptionUtility();
