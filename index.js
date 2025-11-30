const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https'); // For SSL agent

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

app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: false,
  pathRewrite: { '^/api/webdav': '/webdav/' },
  agent: new https.Agent({ rejectUnauthorized: false }), // Fix EPROTO: ignore cert validation (for self-signed/old SSL)
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.originalUrl} to ${targetServer}/webdav/`);

    // Force Depth:0 for PROPFIND (to avoid 403 on infinite depth)
    if (req.method === 'PROPFIND') {
      proxyReq.setHeader('Depth', '0');
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
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
