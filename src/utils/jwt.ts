import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

export interface JwtPayload {
  userId: number;
  role: 'USER' | 'ADMIN';
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
