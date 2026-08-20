"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptCredentialBlob = decryptCredentialBlob;
const crypto_1 = require("crypto");
const domain_1 = require("../../shared/domain");
const ALGORITHM = 'aes-256-gcm';
const KEY_HEX_LEN = 64;
function getKey() {
    const key = process.env.PRETZEL_ENCRYPTION_KEY;
    if (!key || key.length !== KEY_HEX_LEN)
        throw new Error('PRETZEL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    return Buffer.from(key, 'hex');
}
function decryptCredentialBlob(blob) {
    const key = getKey();
    const [ivHex, authTagHex, ciphertextHex] = blob.split(':');
    if (!ivHex || !authTagHex || !ciphertextHex)
        throw new Error('Malformed encrypted blob');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return domain_1.Vault.Credential.Instance.DecryptedValues.parse(JSON.parse(plaintext));
}
