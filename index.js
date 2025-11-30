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

// Custom HTTPS agent for SSL compatibility
const agent = new https.Agent({
  rejectUnauthorized: false,  // Ignore cert errors
  secureProtocol: 'TLSv1_method',  // Force TLS 1.0 (if supported), or try 'TLSv1_1_method', 'TLSv1_2_method'
  ciphers: 'ALL:!RC4+EXPORT:!aNULL:!LOW:!MD5:!SSLv2:!EXP:!PSK:!SRP:!DSS:RC4-MD5',  // Strong ciphers, but allow RC4 if needed
  secureOptions: require('constants').PCB_SEQ_AGGR  // Additional options (may help)
});

app.use('/api/webdav', createProxyMiddleware({
  target: targetServer,
  changeOrigin: false,
  pathRewrite: { '^/api/webdav': '/webdav' },  // Remove extra slash (/webdav -> /webdav)
  agent: agent,  // Use custom agent
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.originalUrl} to ${targetServer}/webdav`);

    if (req.method === 'PROPFIND' && !req.headers['depth']) {
      proxyReq.setHeader('Depth', '0');  // Force depth for PROPFIND
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error: ' + err.message);
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
