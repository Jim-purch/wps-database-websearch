import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

// Helper to check auth
const checkAuth = (request: Request, requiredRole?: string) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (!decoded || !decoded.username || !decoded.role) return null;
        if (requiredRole && decoded.role !== requiredRole) return null;

        return decoded;
    } catch (e) {
        return null;
    }
}

// List configs
export async function GET(request: Request) {
    if (!checkAuth(request, 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const configs = await prisma.scriptConfig.findMany();
    return NextResponse.json(configs);
}

// Add config
export async function POST(request: Request) {
    if (!checkAuth(request, 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, type, file_id, script_id, token } = body;

    if (!name || !type || !file_id || !script_id || !token) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const config = await prisma.scriptConfig.create({
        data: {
            name,
            type,
            file_id,
            script_id,
            token
        }
    });

    return NextResponse.json(config);
}

// Delete config
export async function DELETE(request: Request) {
    if (!checkAuth(request, 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if(id) {
        await prisma.scriptConfig.delete({ where: { id } });
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
}
