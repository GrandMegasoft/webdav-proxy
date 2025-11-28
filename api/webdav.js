import https from 'https';
import { URL } from 'url';

const realBase = 'https://grand-keenetic.netcraze.pro/webdav';

export default function handler(req, res) {
  const { url: relativePath = '/' } = req.query;
  const fullUrl = new URL(relativePath, realBase).href;
  const method = req.method;
  let body = '';

  // Собираем body (для PROPFIND XML)
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    forwardRequest(req, res, fullUrl, method, body);
  });
}

function forwardRequest(req, res, fullUrl, method, body) {
  // Auth check
  if (!req.headers.authorization) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="WebDAV"',
      'Content-Type': 'text/plain'
    });
    return res.end('Authentication required');
  }

  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Allow': 'GET, PUT, POST, PROPFIND, DELETE, MKCOL, HEAD, OPTIONS',
      'DAV': '1, 2',
      'MS-Author-Via': 'DAV',
      'Content-Length': '0'
    });
    return res.end();
  }

  const parsedUrl = new URL(fullUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + (parsedUrl.search || ''),
    method: method,
    headers: {
      ...req.headers,
      host: parsedUrl.host,
      'User-Agent': 'Mozilla/5.0 (compatible; Vercel WebDAV Proxy)',
      'Accept': '*/*',
      'Connection': 'keep-alive'
    }
  };

  if (body) {
    options.headers['Content-Type'] = 'text/xml; charset=utf-8';
    options.headers['Content-Length'] = Buffer.byteLength(body);
    if (!options.headers['Depth']) {
      options.headers['Depth'] = 'infinity';
    }
  }

  const proxyReq = https.request(options, (proxyRes) => {
    // Forward headers, excluding some to avoid conflicts
    const headers = { ...proxyRes.headers };
    delete headers['transfer-encoding'];
    delete headers['content-encoding'];
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  });

  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}
