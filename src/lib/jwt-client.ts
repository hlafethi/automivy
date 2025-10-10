import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JWTClient {
  static async sign(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    
    return jwt;
  }

  static async verify(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static decode(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      return payload as JWTPayload;
    } catch (error) {
      return null;
    }
  }
}
