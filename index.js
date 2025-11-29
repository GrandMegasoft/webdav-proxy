const express = require('express');
const { clientFactory } = require('webdav-server/v2');

const app = express();

// Настройка proxy клиента для InfinityFree WebDAV
const webdavUsername = process.env.WEBDAV_USERNAME;
const webdavPassword = process.env.WEBDAV_PASSWORD;
const webdavServer = process.env.WEBDAV_SERVER;  // https://megaclock.rf.gd/api/webdav/

if (!webdavServer || !webdavUsername || !webdavPassword) {
  console.error("Ошибка: WEBDAV_SERVER, WEBDAV_USERNAME или WEBDAV_PASSWORD не заданы");
  process.exit(1);
}

// Создаём клиента для подключения к InfinityFree WebDAV
const webdavClient = clientFactory(webdavServer, {
  username: webdavUsername,
  password: webdavPassword,
  authType: 'basic',  // Basic auth для InfinityFree
});

// Настройка WebDAV сервера (оказывает root директорией InfinityFree)
const { WebDAVServer } = require('webdav-server/v2');
const webdavServerInstance = new WebDAVServer({
  rootFileSystem: {
    'fs': webdavClient.rootTrait(),  // Проксирует на root InfinityFree
    'name': webdavServer.replace(/\/$/, '')  // Убрать trailing slash
  },
  httpAuthentication: {
    username: webdavUsername,
    passwordRetriever: () => webdavPassword
  },
  privilegeManager: webdavClient.privilegeManager()
});

// Применяем WebDAV к Express
app.use(webdavServerInstance.plugins.express('/api/webdav/'));  // Mount на /api/webdav/

// Vercel serverless export
const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`WebDAV Proxy on port ${port}`);
  });
}

module.exports = app;  // Экспорт для Vercel (serverless)

