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

app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: true,  // Changed back to true for Kee nFR etic
  pathRewrite: { '^/api/webdav': '/webdav' },
  agent: httpsAgent,
  timeout: 30000,  // Add timeout to avoid hangs
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[INFO] Proxying ${req.method} ${req.url} to ${targetServer}/webdav`);
    console.log(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
    proxyReq.setHeader('User-Agent', 'Android-WebDAV-App/1.0');  // Mimic app user-agent to avoid blocks
    if (req.method === 'PROPFIND') {
      proxyReq.setHeader('Depth', '0');  // Force for PROPFIND
    }
  },
  onError: (err, req, res) => {
    console.error('[ERROR] Proxy error:', err.message);  // More detailed error logging
    console.error('[ERROR] Full error:', err);
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
