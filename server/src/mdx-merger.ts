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
      ignore: ['**/node_modules/**', '**/dist/**'],
      absolute: true
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
 * @param absFilePath Absolute path to the file
 * @param directory Base directory to make paths relative to
 * @returns Formatted file link
 */
export function createFileLink(absFilePath: string, directory: string): string {
  // Convert an absolute path to a relative path if needed
  let relativePath = absFilePath;
  relativePath = `./${path.relative(directory, absFilePath)}`;

  // Get the file name without extension for the link text
  const fileName = path.basename(absFilePath, path.extname(absFilePath));

  return `[${fileName}](${relativePath.replace(/\\/g, '/')})`;
}

/**
 * Merge multiple MDX files into a single string
 * @param files Array of MDX files with absolute paths
 * @param directory Absolute base directory to make paths relative to
 * @returns Merged content string
 */
export function mergeMdxFiles(files: MdxFile[], directory: string): string {
  // Sort files by a path to ensure consistent ordering
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // Build the merged content
  let mergedContent = '';

  for (const file of sortedFiles) {
    // Add a divider and file link
    mergedContent += '---\n';
    mergedContent += `${createFileLink(file.path, directory)}\n\n`;

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
    const absFilePaths = await findMdxFiles(directory);

    if (absFilePaths.length === 0) {
      console.warn(`No MDX files found in ${directory}`);
      return '';
    }

    console.log(`Found ${absFilePaths.length} MDX files in ${directory}`);

    // Read all files
    const files = absFilePaths.map(filePath => readMdxFile(filePath));

    // Merge files
    const mergedContent = mergeMdxFiles(files, directory);

    // Write to the output file if specified
    if (outputPath) {
      const outputDir = path.dirname(outputPath);

      // Create the output directory if it doesn't exist
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
