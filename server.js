'use strict';
const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 3000;
const app = createApp();
const server = app.listen(port, () => {
  console.log(`GameNight Master rulează pe http://localhost:${port}`);
});

function stop() {
  server.close(() => { app.locals.db.close(); process.exit(0); });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
