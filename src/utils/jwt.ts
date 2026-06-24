import jwt from 'jsonwebtoken';
import { config } from '../config';

const SECRET = config.jwt.secret;
const EXPIRES_IN_SEC = config.jwt.expiresInDays * 24 * 60 * 60;

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN_SEC });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
