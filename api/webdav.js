const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Только WEBDAV_SERVER для target
const targetServer = process.env.WEBDAV_SERVER || 'https://grand-keenetic.netcraze.pro/webdav';

// CORS для Android/WebDAV (предотвращает ошибки коннекта)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Прокси для /api/webdav/ → к вашему серверу, без добавления auth
app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: true,
  pathRewrite: { '^/api/webdav': '/webdav' },  // /api/webdav → /webdav на вашем сервере
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.originalUrl} to ${targetServer}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response status: ${proxyRes.statusCode}`);
  }
}));

// Root route
app.get('/', (req, res) => {
  res.send('WebDAV Proxy on Render is running! Use /api/webdav/ for WebDAV.');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}, target: ${targetServer}`);
});
