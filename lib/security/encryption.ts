import CryptoJS from 'crypto-js'

class EncryptionManager {
  private static readonly ALGORITHM = 'AES-256'
  private readonly encryptionKey: string

  constructor() {
    // Get encryption key from environment variable with fallback
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long'

    if (this.encryptionKey.length !== 32) {
      console.warn('Encryption key should be exactly 32 characters long for AES-256')
      // Pad or truncate to 32 characters
      this.encryptionKey = this.encryptionKey.padEnd(32, '0').substring(0, 32)
    }
  }

  /**
   * Encrypts a string value using AES-256
   */
  encrypt(value: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(value, this.encryptionKey).toString()
      return encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt value')
    }
  }

  /**
   * Decrypts an AES-256 encrypted string
   */
  decrypt(encryptedValue: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedValue, this.encryptionKey)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)

      if (!decrypted) {
        throw new Error('Decryption resulted in empty string')
      }

      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt value')
    }
  }

  /**
   * Encrypts an object by first JSON stringifying it
   */
  encryptObject(obj: any): string {
    try {
      const jsonString = JSON.stringify(obj)
      return this.encrypt(jsonString)
    } catch (error) {
      console.error('Object encryption failed:', error)
      throw new Error('Failed to encrypt object')
    }
  }

  /**
   * Decrypts an object and parses it from JSON
   */
  decryptObject<T = any>(encryptedValue: string): T {
    try {
      const decryptedString = this.decrypt(encryptedValue)
      return JSON.parse(decryptedString) as T
    } catch (error) {
      console.error('Object decryption failed:', error)
      throw new Error('Failed to decrypt object')
    }
  }

  /**
   * Generates a random 32-character key for AES-256
   */
  static generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Validates if a string is properly encrypted
   */
  isValidEncrypted(value: string): boolean {
    try {
      this.decrypt(value)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Masks sensitive values for display
   */
  maskValue(value: string, showLast: number = 4): string {
    if (!value || value.length <= showLast) {
      return '••••••••'
    }

    const start = value.length - showLast
    const masked = '•'.repeat(value.length - showLast) + value.substring(start)
    return masked
  }

  /**
   * Hashes a value for verification purposes (not encryption)
   */
  hash(value: string): string {
    return CryptoJS.SHA256(value).toString()
  }

  /**
   * Verifies a value against its hash
   */
  verifyHash(value: string, hash: string): boolean {
    const computedHash = this.hash(value)
    return computedHash === hash
  }
}

// Singleton instance
const encryptionManager = new EncryptionManager()

export const encrypt = encryptionManager.encrypt.bind(encryptionManager)
export const decrypt = encryptionManager.decrypt.bind(encryptionManager)
export const encryptObject = encryptionManager.encryptObject.bind(encryptionManager)
export const decryptObject = encryptionManager.decryptObject.bind(encryptionManager)
export const generateKey = EncryptionManager.generateKey
export const isValidEncrypted = encryptionManager.isValidEncrypted.bind(encryptionManager)
export const maskValue = encryptionManager.maskValue.bind(encryptionManager)
export const hash = encryptionManager.hash.bind(encryptionManager)
export const verifyHash = encryptionManager.verifyHash.bind(encryptionManager)

export { encryptionManager }