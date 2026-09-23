// Servidor estático mínimo para testar a app localmente. Sem dependências.
// Usar:  node servidor.js     →  http://localhost:4322
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PORTA = process.env.PORT || 4322;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(req.url.split('?')[0]);
  const relativo = normalize(caminho === '/' ? '/index.html' : caminho).replace(/^(\.\.[/\\])+/, '');
  const ficheiro = join(RAIZ, relativo);

  try {
    const conteudo = await readFile(ficheiro);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(ficheiro)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  }
}).listen(PORTA, () => console.log(`App a correr em http://localhost:${PORTA}`));
