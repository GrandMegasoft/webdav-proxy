const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');

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

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,  // Ignore SSL cert issues
});

app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: false,
  pathRewrite: { '^/api/webdav': '/webdav' },  // Fixed: no extra slash, '/webdav' instead of '/webdav/'
  agent: httpsAgent,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to ${targetServer}/webdav`);
    if (req.method === 'PROPFIND') {
      proxyReq.setHeader('Depth', '0');  // Force depth for prohibited CA PROPFIND
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
