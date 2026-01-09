import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  // Simple hash for demo
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  // Simple demo auth logic
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (user && user.password === hash) {
    // Generate a simple mock token: base64(username:role)
    // In production, use JWT or similar
    const token = Buffer.from(`${user.username}:${user.role}`).toString('base64');
    return NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role },
        token
    });
  }

  // Create admin user if none exists (Bootstrap)
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
     const token = Buffer.from(`${newUser.username}:${newUser.role}`).toString('base64');
     return NextResponse.json({
         success: true,
         user: { id: newUser.id, username: newUser.username, role: newUser.role },
         token
     });
  }

  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
}
