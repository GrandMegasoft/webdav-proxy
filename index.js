const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');  // Добавим dependency ниже

const app = express();

// Env vars из Render
const username = process.env.WEBDAV_USERNAME;
const password = process.env.WEBDAV_PASSWORD;
const targetServer = process.env.WEBDAV_SERVER || 'https://megaclock.rf.gd/api/webdav/';

if (!username || !password || !targetServer) {
  console.error('Ошибка: WEBDAV_USERNAME, WEBDAV_PASSWORD или WEBDAV_SERVER не заданы');
  process.exit(1);
}

// Middleware для CORS (если нужно для Android Sardine)
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

// Прокси для всех путей под /api/webdav/
app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: true,
  pathRewrite: { '^/api/webdav': '' },  // Убираем /api/webdav из пути
  onProxyReq: (proxyReq, req, res) => {
    // Добавляем Basic Auth для InfinityFree
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    proxyReq.setHeader('Authorization', `Basic ${auth}`);
    console.log(`Proxying ${req.method} ${req.url} to ${targetServer}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
}));

// Root route для теста
app.get('/', (req, res) => {
  res.send('WebDAV Proxy on Render is running! Use /api/webdav/ for WebDAV.');
});

// Render требует слушать PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
