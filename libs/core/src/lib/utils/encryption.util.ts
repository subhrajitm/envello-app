export class EncryptionUtil {
    // Basic MVP encryption (Base64 + shifted)
    static encrypt(text: string): string {
        try {
            return btoa(text.split('').map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join(''));
        } catch {
            return text;
        }
    }

    static decrypt(cipher: string): string {
        try {
            const raw = atob(cipher);
            return raw.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');
        } catch {
            return cipher;
        }
    }
}
