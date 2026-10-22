import { cookies } from "next/headers";
import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "bee_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "bee-logistics-onboarding-secret-key-enterprise-2026";

/**
 * Ký mã token dựa trên userId và HMAC SHA-256
 */
export function signSessionToken(userId: string): string {
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(userId)
    .digest("hex");
  return `${userId}.${hmac}`;
}

/**
 * Kiểm tra tính hợp lệ của token và trả về userId nếu chữ ký hợp lệ
 */
export function verifySessionToken(token: string): string | null {
  try {
    if (!token || !token.includes(".")) {
      return null;
    }
    const [userId, hmac] = token.split(".");
    if (!userId || !hmac) {
      return null;
    }

    const expectedHmac = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(userId)
      .digest("hex");

    const hmacBuf = Buffer.from(hmac);
    const expectedBuf = Buffer.from(expectedHmac);

    if (hmacBuf.length !== expectedBuf.length) {
      return null;
    }

    if (crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Thiết lập cookie phiên làm việc HTTP-only, an toàn
 */
export async function createSession(userId: string): Promise<void> {
  const token = signSessionToken(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 ngày
  });
}

/**
 * Lấy userId của phiên hiện tại từ cookie
 */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  console.log("[DEBUG getSessionUserId] cookie value:", cookie?.value);
  if (!cookie?.value) {
    return null;
  }
  const verified = verifySessionToken(cookie.value);
  console.log("[DEBUG getSessionUserId] verified userId:", verified);
  return verified;
}

/**
 * Xóa cookie phiên khi đăng xuất
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
