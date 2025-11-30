const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Env vars
const targetServer = process.env.WEBDAV_SERVER || 'https://grand-keenetic.netcraze.pro/webdav';  // Ваш target, без auth

if (!targetServer) {
  console.error('WEBDAV_SERVER не задан');
  process.exit(1);
}

// CORS для Android/WebDAV
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

// Прокси для /api/webdav/ → к вашему серверу, без добавления auth (app сам)
app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: true,
  pathRewrite: { '^/api/webdav': '/webdav' },  // Перезапись пути: /api/webdav → /webdav на вашем сервере
  onProxyReq: (proxyReq, req, res) => {
    // НЕ добавляем Basic Auth — app Sardine сам сделает
    console.log(`Proxying ${req.method} ${req.url} to ${targetServer}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response status: ${proxyRes.statusCode}`);
  }
}));

// Root
app.get('/', (req, res) => {
  res.send('WebDAV Proxy on Render is running! Use /api/webdav/ for WebDAV.');
});

// Port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}, target: ${targetServer}`);
});
