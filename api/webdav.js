import https from 'https';
import { URL } from 'url';

const realBase = 'https://grand-keenetic.netcraze.pro/webdav';

export default async function handler(req, res) {
  try {
    const { url: relativePath = '/' } = req.query;
    const fullUrl = new URL(relativePath, realBase).href;
    const method = req.method;

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
      res.writeHead(200, {
        'Allow': 'GET, PUT, POST, PROPFIND, DELETE, MKCOL, HEAD, OPTIONS',
        'DAV': '1, 2',
        'MS-Author-Via': 'DAV',
        'Content-Length': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, PROPFIND, DELETE, MKCOL, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth'
      });
      return res.end();
    }

    // Auth check
    if (!req.headers.authorization) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="WebDAV"',
        'Content-Type': 'text/plain'
      });
      return res.end('Authentication required');
    }

    // Collect body data for methods that need it
    let body = '';
    if (['PUT', 'POST', 'PROPFIND'].includes(method)) {
      for await (const chunk of req) {
        body += chunk;
      }
    }

    // For PROPFIND, if no body provided, use a default one
    if (method === 'PROPFIND' && (!body || body.length === 0)) {
      body = '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><getlastmodified/><getcontentlength/><getcontenttype/><resourcetype/></prop></propfind>';
    }

    forwardRequest(req, res, fullUrl, method, body);
  } catch (error) {
    console.error('Handler error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
}

function forwardRequest(req, res, fullUrl, method, body) {
  try {
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

    // Handle body and headers for specific methods
    if (body && body.length > 0) {
      options.headers['Content-Type'] = req.headers['content-type'] || 'text/xml; charset=utf-8';
      options.headers['Content-Length'] = Buffer.byteLength(body);

      if (method === 'PROPFIND' && !options.headers['Depth']) {
        options.headers['Depth'] = '1';
      }
    }

    // Remove headers that might cause issues
    delete options.headers['connection'];
    delete options.headers['transfer-encoding'];

    console.log('Forwarding request:', { method, fullUrl, bodyLength: body ? body.length : 0 });

    const proxyReq = https.request(options, (proxyRes) => {
      // Forward headers, excluding some to avoid conflicts
      const headers = { ...proxyRes.headers };
      delete headers['transfer-encoding'];

      // Add CORS headers
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, PROPFIND, DELETE, MKCOL, HEAD, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Depth';

      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });

    if (body && body.length > 0) {
      proxyReq.write(body);
    }

    proxyReq.end();
  } catch (error) {
    console.error('Forward request error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Forward request error: ' + error.message);
  }
}
