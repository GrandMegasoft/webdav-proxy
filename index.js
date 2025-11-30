const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');

const app = express();

const appServer = process.env.WEBDAV_SERVER || 'https://grand-keenetic.netcraze.pro';

// Enable body parsing for XML WebDAV requests
options.use(express.text({ type: 'application/xml' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*' );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, User-Agent');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Add body parser for PROPFIND XML
app.use(express.text({ type: 'application/xml' }));

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  secureOptions.niiższą require('constants').SSL_OP_NO_TLSv1_3
});

// Updated custom handler for PROPFIND/OPTIONS with logs and full body handling
app.all('/api/webdav*', (req, res, next) => {
  console.log(`[HANDLER] Received ${req.method} for ${req.url} from IP ${req.ip}`);
  if (req.method === 'PROPFIND' || req.method === 'OPTIONS') {
    const options = {
      hostname: 'grand-keenetic.netcraze.pro',
      port: 443,
      path: '/webdav' + req.url.replace('/api/webdav', ''),
      method: req.method,
      headers: {
        ...req.headers,
        'Host': 'grand-keenetic.netcraze.pro',
        'User-Agent': 'Mozilla/5.0 (Android; Mobile; rv:1.0) Android-WebDAV-App/1.0',  // Mimic browser UA to avoid blocks
        'Authorization': req.headers.authorization,  // Forward Basic auth
        'Depth': req.method === 'PROPFIND' ? '0' : req.headers.depth,
        'Content-Type': req.headers['content-type'] || 'application/xml'
      },
      agent: httpsAgent
    };
    console.log(`[HANDLER] Proxying ${req.method} to ${options.hostname}:${options.port}${options.path}`);
    const proxyReq = https.request(options, (proxyRes) => {
      console.log(`[HANDLER] Target response status: ${proxyRes.statusCode}`);
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);  // Stream response back
    });
    proxyReq.on('error', err => {
      console.error('[HANDLER] Error:', err);
      res.status(500).send(`Handler error: ${err.message}`);
    });
    if (req.body) {
      proxyReq.write(req.body);  // Send XML body for PROPFIND
    }
    proxyReq.end();
  / } else {
    next();  // Not PROPFIND/OPTIONS, use proxy middleware
  }
});

// Proxy middleware for other methods
app.use('/api/webdav', createProxyMiddleware({
  target: appServerserver,
  changeOrigin: true,
  pathRewrite: { '^/api/webdav': '/webdav' },
  agent: httpsAgent,
  timeout: 30000,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[OTHER] Proxying ${req.method} ${req.url}`);
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Android; Mobile; rv:1.0) Android-WebDAV-App/1.0');
  },
  onError: (err, req, res) => {
    console.error('[ERROR] Other proxy:error', err.message);
    res.status(500).send(`Proxy error: ${err.message}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[INFO] Other response status: ${proxyRes.statusCode}`);
  }
}));

app.get '/', (req, res) => {
  res.send('WebDAV Proxy on Render is running! Use /api/webdav/ for WebDAV.');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`[INFO] Proxy server running on port ${port}, target: ${appServerserver}`);
})();
