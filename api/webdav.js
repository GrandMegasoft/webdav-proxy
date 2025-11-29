const https = require('https');
const { URL } = require('url');

// Env vars
const username = process.env.WEBDAV_USERNAME;
const password = process.env.WEBDAV_PASSWORD;
const serverUrl = process.env.WEBDAV_SERVER; // https://megaclock.rf.gd/api/webdav/

// Function for Vercel serverless
export default async function handler(req, res) {
  try {
    // Build target URL for InfinityFree
    const targetPath = req.url.replace('/api/webdav', '') || '/'; // Relative path
    const targetUrl = new URL(targetPath, serverUrl);

    // Prepare proxy request
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname,
      method: req.method,
      headers: {
        ...req.headers,
        'Authorization': `Basic ${auth}`,
        // Copy original headers, remove if needed
      }
    };

    // Make request to InfinityFree
    const proxyReq = https.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode);
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/xml');
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      res.status(500).send('Proxy error: ' + error.message);
    });

    // Pipe body
    if (req.method !== 'GET' && req.body) {
      proxyReq.write(req.body);
    }

    proxyReq.end();
  } catch (error) {
    res.status(500).send('Handler error: ' + error.message);
  }
}
