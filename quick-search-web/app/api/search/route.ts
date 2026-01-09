import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

// Helper to check auth (Allow both USER and ADMIN)
const checkAuth = (request: Request) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    try {
        const token = authHeader.split(' ')[1];
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, role] = decoded.split(':');
        if (!username || !role) return null;
        return { username, role };
    } catch (e) {
        return null;
    }
}

export async function POST(request: Request) {
    if (!checkAuth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scriptConfigId, searchText, sheetName } = body;

    if (!scriptConfigId) {
        return NextResponse.json({ error: 'Config ID required' }, { status: 400 });
    }

    const config = await prisma.scriptConfig.findUnique({
        where: { id: scriptConfigId }
    });

    if (!config) {
        return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    // Call WPS AirScript API
    const apiUrl = `https://www.kdocs.cn/api/v3/ide/file/${config.file_id}/script/${config.script_id}/sync_task`;

    try {
        const payload = {
            Context: {
                argv: {
                    sheet_name: sheetName, // Optional
                    search_text: searchText
                }
            }
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'airscript_token': config.token,
                'Content-Type': 'application/json'
            }
        });

        const taskData = response.data.data;
        if (!taskData) {
             return NextResponse.json({ error: 'No data from AirScript', raw: response.data });
        }

        let result = taskData.result;
        try {
            if (typeof result === 'string') {
                if (result !== "[Undefined]") {
                     result = JSON.parse(result);
                }
            }
        } catch (e) {
            console.log("Failed to parse result string: ", result);
        }

        return NextResponse.json({
            success: true,
            data: result,
            logs: taskData.logs
        });

    } catch (error: any) {
        console.error("AirScript Call Error:", error.response?.data || error.message);
        return NextResponse.json({
            error: 'Failed to call AirScript',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
