import { Command } from 'commander';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import fs from 'fs';
import path from 'path';
import { mergeMdxDirectory } from './mdx-merger.js';
import { splitMergedMDXContent } from "server/src/mdx-splitter.js";
import type {
  ApiErrorResponse,
  GetMdxResponse,
  PostMdxRequest,
  PostMdxResponse,
  FileUpdateResult,
  RootResponse
} from 'shared/dist';

const DEFAULT_PORT = 3001;

const program = new Command()
.name('mdx-multi-edit-backend')
.description('Backend server for MDX Multi Edit')
.option('-p, --port <number>', 'Port to run the server on', String(DEFAULT_PORT))
.option('-d, --directory <path>', 'Directory containing MDX files', '.')
.parse(process.argv);

const app = new Hono();

app.use('*', cors());

const options = program.opts();
const port = parseInt(options.port, 10);
const directory = path.resolve(options.directory);

if (!fs.existsSync(directory)) {
  console.error(`Directory does not exist: ${directory}`);
  process.exit(1);
}

console.log(`Working directory: ${directory}`);

app.get('/', (c) => {
  const response: RootResponse = {
    success: true,
    message: 'MDX Multi Edit API',
    version: '0.1.0',
  };
  return c.json(response);
});

// GET /api/mdx - Returns a list of all MDX files
app.get('/api/mdx', async (c) => {
  try {
    // Merge all MDX files in the directory
    const mergedContent = await mergeMdxDirectory(directory);

    // Return the merged content
    const response: GetMdxResponse = {
      success: true,
      content: mergedContent,
    };
    return c.json(response);
  } catch (error) {
    console.error('Error fetching MDX files:', error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Failed to fetch MDX files',
    };
    return c.json(errorResponse, 500);
  }
});

// POST /api/mdx - Saves changes to the file system
app.post('/api/mdx', async (c) => {
  try {
    const { content } = await c.req.json<PostMdxRequest>();

    if (!content) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'No content provided',
      };
      return c.json(errorResponse, 400);
    }

    // Split the merged content back into individual files
    const fileUpdates = splitMergedMDXContent(content);

    if (fileUpdates.length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'No files found in content',
      };
      return c.json(errorResponse, 400);
    }

    // Write each file to disk
    const results: FileUpdateResult[] = await Promise.all(fileUpdates.map(async (update) => {
      try {
        // Normalize the path
        let filePath = update.path;
        if (filePath.startsWith('./')) {
          filePath = filePath.substring(2);
        }

        const fullPath = path.join(directory, filePath);

        // Create directory if it doesn't exist
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(fullPath, update.content);

        const result: FileUpdateResult = {
          path: update.path,
          success: true,
        };
        return result;
      } catch (error) {
        console.error(`Error writing file ${update.path}:`, error);
        const result: FileUpdateResult = {
          path: update.path,
          success: false,
          error: (error as Error).message,
        };
        return result;
      }
    }));

    const response: PostMdxResponse = {
      success: true,
      files: results,
    };
    return c.json(response);
  } catch (error) {
    console.error('Error saving MDX files:', error);
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Failed to save MDX files',
    };
    return c.json(errorResponse, 500);
  }
});

serve({
  fetch: app.fetch, port,
}, (info) => {
  console.log(`MDX Multi Edit backend server running at http://localhost:${info.port}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/mdx - Get all MDX files`);
  console.log(`  POST /api/mdx - Save changes to MDX files`);
});

export default app;
