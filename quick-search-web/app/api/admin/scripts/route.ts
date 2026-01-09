import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to check auth
const checkAuth = (request: Request, requiredRole?: string) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    try {
        const token = authHeader.split(' ')[1]; // Bearer <token>
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, role] = decoded.split(':');

        if (!username || !role) return null;
        if (requiredRole && role !== requiredRole) return null;

        return { username, role };
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
