import { Command } from 'commander';
import { serve } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import { showRoutes } from 'hono/dev';
import app, { setContext } from './api.js';

const DEFAULT_PORT = 3001;

const program = new Command()
.name('mdx-multi-edit-backend')
.description('Backend server for MDX Multi Edit')
.option('-p, --port <number>', 'Port to run the server on', String(DEFAULT_PORT))
.option('-d, --directory <path>', 'Directory containing MDX files', '.')
.parse(process.argv);

const options = program.opts();
const port = parseInt(options.port, 10);
const directory = path.resolve(options.directory);

if (!fs.existsSync(directory)) {
  console.error(`Directory does not exist: ${directory}`);
  process.exit(1);
}

setContext({ Variables: { directory } });

console.log(`Working directory: ${directory}`);

serve({
  fetch: app.fetch, port,
}, (info) => {
  console.log(`MDX Multi Edit backend server running at http://localhost:${info.port}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/mdx - Get all MDX files`);
  console.log(`  POST /api/mdx - Save changes to MDX files`);
});

showRoutes(app, {
  verbose: true,
})

export { app };
