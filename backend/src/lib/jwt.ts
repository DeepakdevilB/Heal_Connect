import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'healconnect_access_secret_change_in_prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'healconnect_refresh_secret_change_in_prod';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface JwtPayload {
  userId: string;
  email?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_EXPIRY_MS);
}

/** Generates a cryptographically secure 64-char hex token (raw — never stored directly). */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** SHA-256 hash a token before storing it in the database. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Generate a 6-digit OTP string. */
export function generateOtp(): string {
  const digits = crypto.randomInt(0, 1_000_000);
  return digits.toString().padStart(6, '0');
}
