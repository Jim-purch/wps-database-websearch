import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  const hash = crypto.createHash('sha256').update(password).digest('hex');

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (user && user.password === hash) {
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    return NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role },
        token
    });
  }

  // Bootstrap Admin
  const userCount = await prisma.user.count();
  if (userCount === 0 && username === 'admin' && password === 'admin') {
     const adminHash = crypto.createHash('sha256').update('admin').digest('hex');
     const newUser = await prisma.user.create({
         data: {
             username: 'admin',
             password: adminHash,
             role: 'ADMIN'
         }
     });
     const token = jwt.sign({ username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });
     return NextResponse.json({
         success: true,
         user: { id: newUser.id, username: newUser.username, role: newUser.role },
         token
     });
  }

  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
}
