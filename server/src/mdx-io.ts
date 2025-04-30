import { splitMergedMDXContent } from 'server/src/mdx-splitter.js';
import type { FileUpdate } from 'shared/dist';
import fs from 'fs';
import path from 'path';

/**
 * Process an MDX file and split it into individual files
 * @param inputFilePath Path to the merged MDX file
 * @param outputDir Directory to write the split files to (optional)
 * @returns Array of FileUpdate objects
 */
export function splitMDXFile(inputFilePath: string, outputDir?: string): FileUpdate[] {
  try {
    const mergedContent = fs.readFileSync(inputFilePath, 'utf-8');
    const fileUpdates = splitMergedMDXContent(mergedContent);

    // If outputDir is provided, write the files
    if (outputDir && fileUpdates.length > 0) {
      writeMDXFiles(fileUpdates, outputDir);
    }

    return fileUpdates;
  } catch (error) {
    console.error('Error processing file:', error);
    return [];
  }
}

/**
 * Write files to disk
 * @param fileUpdates Array of FileUpdate objects
 * @param outputDir Base directory to write files to
 */
export function writeMDXFiles(fileUpdates: FileUpdate[], outputDir: string): void {
  for (const update of fileUpdates) {
    try {
      // Normalize the path and ensure it's relative
      let filePath = update.path;
      if (filePath.startsWith('./')) {
        filePath = filePath.substring(2);
      }

      const fullPath = path.join(outputDir, filePath);

      // Create the directory if it doesn't exist
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(fullPath, update.content);
      console.log(`Wrote file: ${fullPath}`);
    } catch (error) {
      console.error(`Error writing file ${update.path}:`, error);
    }
  }
}
