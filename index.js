const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const http = require('http');  // For HTTP fallback if needed

const app = express();

const targetServer = process.env.WEBDAV_SERVER || 'https://grand-keenetic.netcraze.pro';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Enhanced HTTPS agent for max compatibility
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,  // Ignore cert
  minVersion: 'TLSv1',  // Allow TLS 1.0+
  maxVersion: 'TLSv1_3',  // Up to 1.3
  secureProtocol: 'TLSv1_2_method',  // Force 1.2 (common for old servers)
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256',  // Modern ciphers
  keepAlive: true,
  timeout: 10000  // 10s timeout to avoid hangs
});

// HTTP agent fallback (if HTTPS fails completely)
const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: 10000
});

app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: false,
  pathRewrite: { '^/api/webdav': '/webdav' },
  secure: true,  // HTTPS
  agent: httpsAgent,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.originalUrl} to ${targetServer}/webdav`);

    if (req.method === 'PROPFIND') {
      if (!req.headers['depth']) proxyReq.setHeader('Depth', '0');
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (err.code === 'EPROTO' || err.code === 'ECONNRESET') {
      // Fallback to HTTP if HTTPS fails (change target to HTTP version if server supports)
      console.log('Attempting HTTP fallback...');
      res.send('SSL error, try HTTP target if available');
    } else {
      res.status(500).send('Proxy error: ' + err.message);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response status: ${proxyRes.statusCode}`);
  }
}));

app.get('/', (req, res) => {
  res.send('WebDAV Proxy on Render is running! Use /api/webdav/ for WebDAV.');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}, target: ${targetServer}`);
});
