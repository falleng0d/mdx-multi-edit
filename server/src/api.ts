import { Hono } from 'hono';
import { cors } from 'hono/cors';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { mergeMdxDirectory } from './mdx-merger.js';
import { splitMergedMDXContent } from "server/src/mdx-splitter.js";
import type {
  ApiErrorResponse,
  FileUpdateResult,
  GetMdxResponse,
  PostMdxRequest,
  PostMdxResponse,
  RootResponse,
} from 'shared/dist';
import { fileURLToPath } from "url";

type AppContext = {
  Variables: {
    directory: string;
  };
};

const ctx = <AppContext>{ Variables: { directory: '' } };

export function setContext(context: AppContext) {
  ctx.Variables = {
    ...ctx.Variables, ...context.Variables,
  }
}

const app = new Hono<AppContext>();

app.use(async (c, next) => {
  c.set('directory', ctx.Variables.directory);
  await next();
});

app.use('*', cors());

/**
 * Delete all MDX files in a directory
 * @param directory The directory to delete MDX files from
 * @returns Promise that resolves to an array of deleted file paths
 */
async function deleteExistingMdxFiles(directory: string): Promise<string[]> {
  try {
    const mdxFiles = await glob(`${directory}/**/*.{md,mdx}`, {
      ignore: ['**/node_modules/**', '**/dist/**']
    });

    const deletedFiles: string[] = [];
    for (const file of mdxFiles) {
      try {
        fs.unlinkSync(file);
        deletedFiles.push(file);
        console.log(`Deleted file: ${file}`);
      } catch (error) {
        console.error(`Error deleting file ${file}:`, error);
      }
    }

    return deletedFiles;
  } catch (error) {
    console.error('Error deleting MDX files:', error);
    return [];
  }
}

app.get('/', (c) => {
  const response: RootResponse = {
    success: true, message: 'MDX Multi Edit API', version: '0.1.0',
  };
  return c.json(response);
});

// GET /api/mdx - Returns a list of all MDX files
app.get('/api/mdx', async (c) => {
  try {
    const directory = c.get('directory');
    if (!directory) {
      const errorResponse: ApiErrorResponse = {
        success: false, error: 'Directory not set',
      };
      return c.json(errorResponse, 500);
    }

    // Merge all MDX files in the directory
    const mergedContent = await mergeMdxDirectory(directory);

    // Return the merged content
    const response: GetMdxResponse = {
      success: true, content: mergedContent,
    };
    return c.json(response);
  } catch (error) {
    console.error('Error fetching MDX files:', error);
    const errorResponse: ApiErrorResponse = {
      success: false, error: 'Failed to fetch MDX files',
    };
    return c.json(errorResponse, 500);
  }
});

// POST /api/mdx - Saves changes to the file system
app.post('/api/mdx', async (c) => {
  try {
    const directory = c.get('directory');
    if (!directory) {
      const errorResponse: ApiErrorResponse = {
        success: false, error: 'Directory not set',
      };
      return c.json(errorResponse, 500);
    }

    const { content } = await c.req.json<PostMdxRequest>();

    if (!content) {
      const errorResponse: ApiErrorResponse = {
        success: false, error: 'No content provided',
      };
      return c.json(errorResponse, 400);
    }

    // Split the merged content back into individual files
    const fileUpdates = splitMergedMDXContent(content, directory);

    if (fileUpdates.length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false, error: 'No files found in content',
      };
      return c.json(errorResponse, 400);
    }

    // Delete existing MDX files before writing new ones
    console.log(`Deleting existing MDX files in ${directory}`);
    const deletedFiles = await deleteExistingMdxFiles(directory);
    console.log(`Deleted ${deletedFiles.length} MDX files`);

    // Write each file to disk
    const results: FileUpdateResult[] = await Promise.all(fileUpdates.map(async (update) => {
      try {
        // Normalize the path
        let filePath = update.path;
        if (filePath.startsWith('./')) {
          filePath = filePath.substring(2);
        }

        const fullPath = path.join(directory, filePath);

        // Create the directory if it doesn't exist
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write the file
        console.log(`Writing file ${fullPath} (filePath: ${filePath})`);
        fs.writeFileSync(fullPath, update.content);

        const result: FileUpdateResult = {
          path: update.path, success: true,
        };
        return result;
      } catch (error) {
        console.error(`Error writing file ${update.path}:`, error);
        const result: FileUpdateResult = {
          path: update.path, success: false, error: (error as Error).message,
        };
        return result;
      }
    }));

    const response: PostMdxResponse = {
      success: true, files: results,
    };
    return c.json(response);
  } catch (error) {
    console.error('Error saving MDX files:', error);
    const errorResponse: ApiErrorResponse = {
      success: false, error: 'Failed to save MDX files',
    };
    return c.json(errorResponse, 500);
  }
});

export default app;
