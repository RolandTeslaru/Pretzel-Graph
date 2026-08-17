import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { Vault } from '../../domain'

// Server only: the backend writes blobs, the worker reads them, and both hold
// the key. One implementation so a change to the format cannot land in one and
// not the other.
export namespace Encryption {

    const ALGORITHM   = 'aes-256-gcm'
    const IV_BYTES    = 16
    const KEY_HEX_LEN = 64 // 32 bytes as hex

    function getKey(): Buffer {
        const key = process.env.PRETZEL_ENCRYPTION_KEY

        if (!key || key.length !== KEY_HEX_LEN)
            throw new Error('PRETZEL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')

        return Buffer.from(key, 'hex')
    }

    /**
     * A short, stable label for a key, derived from the key itself — so it never
     * has to be stored or passed alongside, and a key file can always be matched
     * to the blobs it opens.
     *
     * A truncated hash of a 256-bit random key reveals nothing useful about it.
     * Not yet part of the blob format below.
     */
    export function keyId(key: Buffer = getKey()): string {
        return createHash('sha256').update(key).digest('hex').slice(0, 8)
    }

    /** All of a credential's fields, encrypted together as one JSON payload. */
    export function encryptValues(fieldValues: Vault.Credential.Instance.DecryptedValues): Vault.Credential.Instance.EncryptedBlob {
        const key    = getKey()
        const iv     = randomBytes(IV_BYTES)
        const cipher = createCipheriv(ALGORITHM, key, iv)

        const ciphertext = Buffer.concat([cipher.update(JSON.stringify(fieldValues), 'utf8'), cipher.final()])
        const authTag    = cipher.getAuthTag()

        const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`

        return Vault.Credential.Instance.EncryptedBlob.parse(result)
    }

    export function decryptBlob(blob: Vault.Credential.Instance.EncryptedBlob): Vault.Credential.Instance.DecryptedValues {
        const key = getKey()

        const [ivHex, authTagHex, ciphertextHex] = blob.split(':')

        if (!ivHex || !authTagHex || !ciphertextHex)
            throw new Error('Malformed encrypted blob')

        const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))

        // Authenticated: a wrong key and a tampered blob fail the same way, so
        // neither can be mistaken for corrupt data worth working around.
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

        const plaintext = Buffer
            .concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()])
            .toString('utf8')

        return Vault.Credential.Instance.DecryptedValues.parse(JSON.parse(plaintext))
    }
}
