const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');

const app = express();

const targetServer = process.env.WEBDAV_SERVER || 'https://grand-keenetic.netcraze.pro';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, User-Agent');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,  // Bypass SSL cert issues
  secureOptions: require('constants').SSL_OP_NO_TLSv1_3  // Force TLS 1.2, not 1.3 (to avoid EPROTO)
});

// Custom handler for PROPFIND and OPTIONS to fix 405 errors in Android app
app.all('/api/webdav*', (req, res, next) => {
  if (req.method === 'PROPFIND' || req.method === 'OPTIONS') {
    // Manual proxy using https.request for WebDAV-specific methods to bypass http-proxy-middleware limitations
    const options = {
      hostname: 'grand-keenetic.netcraze.pro',
      port: 443,
      path: '/webdav' + req.url.replace('/api/webdav', ''),
      method: req.method,
      headers: {
        ...req.headers,
        'Host': 'grand-keenetic.netcraze.pro',
        'User-Agent': 'Android-WebDAV-App/1.0',
        'Depth': req.method === 'PROPFIND' ? '0' : req.headers.depth
      },
      agent: httpsAgent  // Use same agent for SSL bypass
    };
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.on('data', chunk => res.write(chunk));
      proxyRes.on('end', () => res.end());
    });
    proxyReq.on('error', err => {
      console.error('[ERROR] PROPFIND/OPTIONS Proxy error:', err);
      res.status(500).send(`Proxy error: ${err.message}`);
    });
    if (req.body) req.pipe(proxyReq);
    else proxyReq.end();  // Handle requests without body
  } else {
    next();  // For other methods, proceed to http-proxy-middleware
  }
});

// Proxy middleware for non-WebDAV-specific methods (GET, POST, PUT, DELETE)
app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: true,
  pathRewrite: { '^/api/webdav': '/webdav' },
  agent: httpsAgent,
  timeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[INFO] Proxying ${req.method} ${req.url} to ${targetServer}/webdav`);
    proxyReq.setHeader('User-Agent', 'Android-WebDAV-App/1.0');
  },
  onError: (err, req, res) => {
    console.error('[ERROR] Proxy error:', err.message);
    res.status(500).send(`Proxy error: ${err.message}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[INFO] Response status: ${proxyRes.statusCode}`);
  }
}));

app.get('/', (req, res) => {
  res.send('WebDAV Proxy on Render is running! Use /api/webdav/ for WebDAV.');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`[INFO] Proxy server running on port ${port}, target: ${targetServer}`);
});
