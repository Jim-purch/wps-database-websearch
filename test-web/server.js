const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3456;

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, airscript_token');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API Proxy
    if (req.url.startsWith('/api/')) {
        const targetUrl = 'https://www.kdocs.cn' + req.url;
        console.log(`[Proxy] ${req.method} ${targetUrl}`);

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const url = new URL(targetUrl);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: req.method,
                headers: {
                    'Content-Type': 'application/json',
                    'airscript_token': req.headers['airscript_token'] || ''
                }
            };

            const proxyReq = https.request(options, (proxyRes) => {
                let data = '';
                proxyRes.on('data', chunk => data += chunk);
                proxyRes.on('end', () => {
                    res.writeHead(proxyRes.statusCode, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(data);
                    console.log(`[Proxy] Response: ${proxyRes.statusCode}`);
                });
            });

            proxyReq.on('error', (e) => {
                console.error(`[Proxy Error] ${e.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            });

            if (body) proxyReq.write(body);
            proxyReq.end();
        });
        return;
    }

    // Static files
    let filePath = req.url === '/' ? '/api-tester.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   WPS API 测试服务器已启动                      ║
╠════════════════════════════════════════════════╣
║   访问地址: http://localhost:${PORT}             ║
║   按 Ctrl+C 停止服务器                          ║
╚════════════════════════════════════════════════╝
`);
});
