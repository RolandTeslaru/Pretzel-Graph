import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { Vault } from '@pretzel-graph/shared/domain'

const ALGORITHM   = 'aes-256-gcm'
const IV_BYTES    = 16
const KEY_HEX_LEN = 64 // 32 bytes as hex

function getKey(): Buffer {
    const key = process.env.PRETZEL_ENCRYPTION_KEY
    if (!key || key.length !== KEY_HEX_LEN)
        throw new Error('PRETZEL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
    return Buffer.from(key, 'hex')
}

export function encryptCredentialBlob(fieldValues: Vault.Credential.Instance.DecryptedValues): Vault.Credential.Instance.EncryptedBlob {
    const key     = getKey()
    const iv      = randomBytes(IV_BYTES)
    const cipher  = createCipheriv(ALGORITHM, key, iv)
    const payload = JSON.stringify(fieldValues)

    const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
    const authTag    = cipher.getAuthTag()

    const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
    return Vault.Credential.Instance.EncryptedBlob.parse(result)
}

export function decryptCredentialBlob(blob: Vault.Credential.Instance.EncryptedBlob): Vault.Credential.Instance.DecryptedValues {
    const key = getKey()
    const [ivHex, authTagHex, ciphertextHex] = blob.split(':')

    if (!ivHex || !authTagHex || !ciphertextHex)
        throw new Error('Malformed encrypted blob')

    const iv         = Buffer.from(ivHex, 'hex')
    const authTag    = Buffer.from(authTagHex, 'hex')
    const ciphertext = Buffer.from(ciphertextHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    return Vault.Credential.Instance.DecryptedValues.parse(JSON.parse(plaintext))
}
