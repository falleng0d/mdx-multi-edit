import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import type { MdxFile } from 'shared/dist';

/**
 * Find all MDX files in a directory recursively
 * @param directory Directory to search for MDX files
 * @returns Promise that resolves to an array of file paths
 */
export async function findMdxFiles(directory: string): Promise<string[]> {
  try {
    // Use glob to find all .md and .mdx files
    return await glob(`${directory}/**/*.{md,mdx}`, {
      ignore: ['**/node_modules/**', '**/dist/**']
    });
  } catch (error) {
    console.error('Error finding MDX files:', error);
    return [];
  }
}

/**
 * Read an MDX file and return its content
 * @param filePath Path to the MDX file
 * @returns Object containing the file path and content
 */
export function readMdxFile(filePath: string): MdxFile {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      path: filePath,
      content
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return {
      path: filePath,
      content: ''
    };
  }
}

/**
 * Create a file link for the merged content
 * @param filePath Path to the file
 * @returns Formatted file link
 */
export function createFileLink(filePath: string): string {
  // Convert absolute path to relative path if needed
  let relativePath = filePath;
  if (path.isAbsolute(filePath)) {
    relativePath = `./${path.relative(process.cwd(), filePath)}`;
  } else if (!relativePath.startsWith('./')) {
    relativePath = `./${relativePath}`;
  }

  // Get the file name without extension for the link text
  const fileName = path.basename(filePath, path.extname(filePath));

  return `[${fileName}](${relativePath.replace(/\\/g, '/')})`;
}

/**
 * Merge multiple MDX files into a single string
 * @param files Array of MDX files
 * @returns Merged content string
 */
export function mergeMdxFiles(files: MdxFile[]): string {
  // Sort files by path to ensure consistent ordering
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // Build the merged content
  let mergedContent = '';

  for (const file of sortedFiles) {
    // Add a divider and file link
    mergedContent += '---\n';
    mergedContent += `${createFileLink(file.path)}\n\n`;

    // Add file content
    mergedContent += `${file.content.trim()}\n\n`;
  }

  return mergedContent.trim();
}

/**
 * Process a directory and merge all MDX files
 * @param directory Directory containing MDX files
 * @param outputPath Path to write the merged content (optional)
 * @returns Promise that resolves to the merged content
 */
export async function mergeMdxDirectory(directory: string, outputPath?: string): Promise<string> {
  try {
    // Find all MDX files
    const filePaths = await findMdxFiles(directory);

    if (filePaths.length === 0) {
      console.warn(`No MDX files found in ${directory}`);
      return '';
    }

    console.log(`Found ${filePaths.length} MDX files in ${directory}`);

    // Read all files
    const files = filePaths.map(filePath => readMdxFile(filePath));

    // Merge files
    const mergedContent = mergeMdxFiles(files);

    // Write to output file if specified
    if (outputPath) {
      const outputDir = path.dirname(outputPath);

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, mergedContent);
      console.log(`Merged content written to ${outputPath}`);
    }

    return mergedContent;
  } catch (error) {
    console.error('Error merging MDX directory:', error);
    return '';
  }
}

// CLI support
if ("require" in global && require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: ts-node src/mdx-merger.ts <input-directory> [output-file]');
    process.exit(1);
  }

  const inputDir = args[0];
  const outputFile = args[1];

  if (!inputDir || !fs.existsSync(inputDir)) {
    console.error('Input directory is required');
    process.exit(1);
  }

  mergeMdxDirectory(inputDir, outputFile)
    .then(content => {
      if (!outputFile) {
        console.log('\nMerged Content:');
        console.log(content);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
