import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkMdx from 'remark-mdx'
import type { Root } from 'mdast'
import type { FileUpdate } from 'shared/dist'

/**
 * Represents a file divider with path and position in the AST
 */
interface FileDivider {
  filePath: string;
  startIndex: number;
}

/**
 * Parses merged MDX content and split it into individual files using AST
 */
export function splitMergedMDXContentWithAST(mergedContent: string): FileUpdate[] {
  // Parse the merged content into an AST
  const tree = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .parse(mergedContent) as Root;

  // Find all file dividers in the document
  const fileDividers: FileDivider[] = [];

  // We need to find a pattern of thematic break followed by a paragraph with a link
  for (let i = 0; i < tree.children.length - 1; i++) {
    const currentNode = tree.children[i];
    const nextNode = tree.children[i + 1];

    if (!currentNode || !nextNode) {
      console.warn('[splitMergedMDXContentWithAST] Invalid node structure, skipping...');
      continue;
    }

    // Check if we have a thematic break (---) followed by a paragraph with a link
    if (currentNode.type === 'thematicBreak' && nextNode.type === 'paragraph') {
      const paragraph = nextNode as any;

      // Check if paragraph contains a link that points to an MDX file
      if (paragraph.children && paragraph.children.length > 0) {
        const firstChild = paragraph.children[0];
        if (firstChild.type === 'link' &&
            (firstChild.url.endsWith('.md') || firstChild.url.endsWith('.mdx'))) {
          fileDividers.push({
            filePath: firstChild.url,
            startIndex: i
          });
        }
      }
    }
  }

  // Sort dividers by their position in the document
  fileDividers.sort((a, b) => a.startIndex - b.startIndex);

  // Group nodes between file dividers
  const fileUpdates: FileUpdate[] = [];

  for (let i = 0; i < fileDividers.length; i++) {
    const currentDivider = fileDividers[i];
    const nextDivider = fileDividers[i + 1];

    if (!currentDivider) {
      console.warn('[splitMergedMDXContentWithAST] No current divider found, skipping...');
      continue;
    }

    // Calculate the range of nodes for this file
    // Start after the paragraph with the link (which is at currentDivider.startIndex + 1)
    const startIndex = currentDivider.startIndex + 2; // +2 to skip both the thematic break and the paragraph with link
    const endIndex = nextDivider ? nextDivider.startIndex : tree.children.length;

    // Extract nodes for this file
    const fileNodes = tree.children.slice(startIndex, endIndex);

    // Create a new AST for this file
    const fileTree: Root = {
      type: 'root',
      children: fileNodes
    };

    // Convert the AST back to markdown
    const fileContent = unified()
      .use(remarkStringify)
      .use(remarkMdx)
      .stringify(fileTree);

    fileUpdates.push({
      path: currentDivider.filePath,
      content: fileContent.trim()
    });
  }

  return fileUpdates;
}

/**
 * Fallback regex-based parser for when AST parsing fails
 */
export function splitMergedMDXContentWithRegex(mergedContent: string): FileUpdate[] {
  const fileUpdates: FileUpdate[] = [];

  // Regex to match file dividers
  // Format: ---\n[filename](./path/to/file.mdx)
  const fileDividerRegex = /^---\s*\n\s*\[([^\]]+)]\(([^)]+\.mdx?)\)/gm;

  let match;
  const matches: { index: number, filePath: string }[] = [];

  // Find all file dividers
  while ((match = fileDividerRegex.exec(mergedContent)) !== null) {
    if (match.length < 3 || !match[2]) {
      console.warn('[splitMergedMDXContentWithRegex] Invalid match found:', match);
      continue;
    }

    matches.push({
      index: match.index,
      filePath: match[2] // The file path is now in capture group 2
    });
  }

  // Sort matches by their position in the document
  matches.sort((a, b) => a.index - b.index);

  // Split content between file dividers
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];

    if (!currentMatch) {
      console.warn('[splitMergedMDXContentWithRegex] No current match found, skipping...');
      continue;
    }

    // Find the end of the line containing the file link (+3 to skip past '---')
    const startIndex = mergedContent.indexOf('\n', currentMatch.index + 3) + 1;
    const endIndex = nextMatch ? nextMatch.index : mergedContent.length;

    let content = mergedContent.substring(startIndex, endIndex).trim();

    fileUpdates.push({
      path: currentMatch.filePath,
      content: content
    });
  }

  return fileUpdates;
}

/**
 * Parses merged MDX content and split it into individual files
 */
export function splitMergedMDXContent(mergedContent: string): FileUpdate[] {
  try {
    return splitMergedMDXContentWithAST(mergedContent);
  } catch (error) {
    console.error('[splitMergedMDXContent] Failed to parse MDX content with AST parser:', error);
    try {
      // Fall back to regex-based parsing
      return splitMergedMDXContentWithRegex(mergedContent);
    } catch (fallbackError) {
      console.error('[splitMergedMDXContent] Failed to parse MDX content with fallback parser:', fallbackError);
      return [];
    }
  }
}
