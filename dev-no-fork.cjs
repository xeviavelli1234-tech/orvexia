const fs = require('fs');
const path = require('path');
const { startServer } = require('next/dist/server/lib/start-server');

const dir = path.resolve('.');
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || 'localhost';

// For environments sin npm ni procesos hijo. Además forzamos distDir para que Next
// reutilice .next en lugar de .next/dev y no falten manifests.
process.env.__NEXT_DIST_DIR = path.join(dir, '.next');

// Asegura que los manifests que Next espera existan en .next/dev.
const requiredSrc = path.join(dir, '.next', 'required-server-files.json');
const requiredDst = path.join(dir, '.next', 'dev', 'required-server-files.json');
try {
  if (fs.existsSync(requiredSrc)) {
    fs.mkdirSync(path.dirname(requiredDst), { recursive: true });
    fs.copyFileSync(requiredSrc, requiredDst);
  }
} catch (err) {
  console.warn('No se pudo sincronizar required-server-files.json:', err);
}

startServer({
  dir,
  port,
  allowRetry: true,
  isDev: true,
  hostname,
  serverFastRefresh: true,
})
  .then(({ distDir }) => {
    // Keep a friendly log so it's obvious the server is running.
    // Avoid forking a worker because the current environment blocks child_process.fork (spawn EPERM).
    console.log(`Next dev server listo en http://${hostname}:${port} (distDir: ${distDir})`);
  })
  .catch((err) => {
    console.error('No se pudo iniciar el dev server sin forking:', err);
    process.exit(1);
  });
