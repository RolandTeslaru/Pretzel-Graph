import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { Vault } from '../../domain'

/**
 * Server only: the backend writes blobs, the worker reads them, and both hold
 * the key. One implementation so a change to the format cannot land in one and
 * not the other.
 *
 * A blob is `keyId:iv:authTag:ciphertext`. Only the key is secret — the other
 * three are needed to decrypt and travel in the open.
 */
export namespace Encryption {

    const ALGORITHM   = 'aes-256-gcm'
    const IV_BYTES    = 16
    const KEY_HEX_LEN = 64 // 32 bytes as hex

    function currentKey(): Buffer {
        const key = process.env.PRETZEL_ENCRYPTION_KEY

        if (!key || key.length !== KEY_HEX_LEN)
            throw new Error('PRETZEL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')

        return Buffer.from(key, 'hex')
    }

    /**
     * A short, stable label for a key, derived from the key itself — so it never
     * has to be stored or passed alongside, and a key recovered from a backup can
     * always be matched to the blobs it opens.
     *
     * A truncated hash of a 256-bit random key reveals nothing useful about it.
     */
    export function keyId(key: Buffer = currentKey()): string {
        return createHash('sha256').update(key).digest('hex').slice(0, 8)
    }

    /**
     * The key a blob says it needs.
     *
     * One key exists today, so this either matches or fails — but it fails
     * *legibly*. Without the id a stale blob surfaces as "unable to authenticate
     * data", indistinguishable from tampering. Rotation is this function
     * consulting a set rather than a single value.
     */
    function keyFor(id: string): Buffer {
        const current = currentKey()

        if (keyId(current) !== id)
            throw new Error(`No encryption key with id ${id}; the current key is ${keyId(current)}`)

        return current
    }

    /** All of a credential's fields, encrypted together as one JSON payload. */
    export function encryptValues(fieldValues: Vault.Credential.Instance.DecryptedValues): Vault.Credential.Instance.EncryptedBlob {
        const key    = currentKey()
        const iv     = randomBytes(IV_BYTES)
        const cipher = createCipheriv(ALGORITHM, key, iv)

        const ciphertext = Buffer.concat([cipher.update(JSON.stringify(fieldValues), 'utf8'), cipher.final()])
        const authTag    = cipher.getAuthTag()

        const result = [
            keyId(key),
            iv.toString('hex'),
            authTag.toString('hex'),
            ciphertext.toString('hex'),
        ].join(':')

        return Vault.Credential.Instance.EncryptedBlob.parse(result)
    }

    export function decryptBlob(blob: Vault.Credential.Instance.EncryptedBlob): Vault.Credential.Instance.DecryptedValues {
        const parts = blob.split(':')

        // Three parts is the format from before blobs carried a key id. Read with
        // the current key, which is the only one that could have written them.
        const [id, ivHex, authTagHex, ciphertextHex] = parts.length === 3
            ? [null, ...parts] as const
            : parts

        if (!ivHex || !authTagHex || !ciphertextHex)
            throw new Error('Malformed encrypted blob')

        const key = id ? keyFor(id) : currentKey()

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
