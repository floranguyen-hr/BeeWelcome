import crypto from "node:crypto";

/**
 * Mã hóa mật khẩu bằng scrypt với salt ngẫu nhiên 16 bytes.
 * Định dạng lưu trữ: `<salt_hex>:<derived_key_hex>`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

/**
 * Kiểm tra mật khẩu người dùng nhập vào so với chuỗi hash đã lưu trong CSDL.
 * Sử dụng crypto.timingSafeEqual để phòng chống tấn công timing attack.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(":")) {
      return false;
    }
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) {
      return false;
    }
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
