import path from 'node:path';
import { createApp } from './app.js';

const dataDir = process.env.DATA_DIR || path.resolve('data');
const { server, momo, modules } = createApp({ dbFile: path.join(dataDir, 'teknons.db') });
const port = Number(process.env.PORT || 3100);
server.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`Teknons platform (${modules.map((m) => m.id).join(', ')}) on http://localhost:${port} · Mobile Money: ${momo.mode}`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); process.exit(0); });
