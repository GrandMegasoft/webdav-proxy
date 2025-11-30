const express = require('Express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Target base
const targetServer = process.env.WEBDAV_SERVER || 'https://grand-keenetic.netcraze.pro';

// CORS
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

// Прокси
app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: true,
  pathRewrite: { '^/api/webdav': '/webdav/' },  // Добавлен slash: /api/webdav -> /webdav/ (серверы WebDAV часто требуют для директорий)
  onProxyReq: (proxyReq, req, res) => {
    // Добавьте host header для обхода host checks на сервере
    proxyReq.setHeader('host', 'grand-keenetic.netcraze.pro');
    console.log(`Proxying ${req.method} ${req.url} to ${targetServer}/webdav/> );
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

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}, target: ${targetServer}`);
});
