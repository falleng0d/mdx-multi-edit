import { splitMergedMDXContent } from '@server/mdx-splitter';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { mergeMdxDirectory } from "@server/mdx-merger";
import { describe, it, expect, beforeAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testInputDir = path.resolve(__dirname, 'sample');
const testOutputFile = path.resolve(__dirname, 'output.md');

const sampleMergedFilePath = path.resolve(__dirname, 'sample.md');

const introMdx = `# Introduction

Welcome to our documentation! This is a sample introduction file.

## Getting Started

To get started with our product, follow these steps:

1. Install the package
2. Configure your settings
3. Start using the features

\`\`\`js
// Example code
import { setup } from 'our-package';
setup({ debug: true });
\`\`\`
`;

const basicsMdx = `# Basics

This document covers the basic concepts of our product.

## Core Concepts

- **Concept 1**: Description of concept 1
- **Concept 2**: Description of concept 2
- **Concept 3**: Description of concept 3
`;

const quickStartMdx = `# Quick Start

This is a quick start guide for our product.

## Steps

1. First step
2. Second step
3. Third step

\`\`\`js
// Quick start code example
import { quickStart } from 'our-package';
quickStart();
\`\`\`
`;

beforeAll(() => {
  // Remove test files and directories
  if (fs.existsSync(testInputDir)) {
    fs.rmSync(testInputDir, { recursive: true, force: true });
  }

  if (fs.existsSync(testOutputFile)) {
    fs.unlinkSync(testOutputFile);
  }

  // Create the test directory if it doesn't exist
  fs.mkdirSync(testInputDir, { recursive: true });

  // Create subdirectories
  const docsDir = path.join(testInputDir, 'docs');
  const conceptsDir = path.join(docsDir, 'concepts');
  const examplesDir = path.join(testInputDir, 'examples');

  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(conceptsDir, { recursive: true });
  fs.mkdirSync(examplesDir, { recursive: true });

  // Create test files
  fs.writeFileSync(path.join(docsDir, 'intro.mdx'), introMdx);
  fs.writeFileSync(path.join(conceptsDir, 'basics.mdx'), basicsMdx);
  fs.writeFileSync(path.join(examplesDir, 'quick-start.mdx'), quickStartMdx);
});

describe('MDX Merger and Splitter', () => {
  it('should merge MDX files from a directory', async () => {
    // Merge the files
    const mergedContent = await mergeMdxDirectory(testInputDir, testOutputFile);

    expect(mergedContent).not.toBe('');

    expect(fs.existsSync(testOutputFile)).toBe(true);

    expect(mergedContent).toContain('intro.mdx');
    expect(mergedContent).toContain('basics.mdx');
    expect(mergedContent).toContain('quick-start.mdx');

    // Check that the content has the correct format with dividers
    expect(mergedContent).toMatch(/^---\n\[.*\]\(.*\)/);

    // Process the merged content to split it back into files
    const fileUpdates = splitMergedMDXContent(mergedContent);

    expect(fileUpdates.length).toBe(3);

    const filePaths = fileUpdates.map(update => update.path);
    expect(filePaths.some(path => path.includes('intro.mdx'))).toBe(true);
    expect(filePaths.some(path => path.includes('basics.mdx'))).toBe(true);
    expect(filePaths.some(path => path.includes('quick-start.mdx'))).toBe(true);
  });


  it('should correctly split content previously merged with mdx-merger', () => {
    // Read the test file
    const mergedSampleContent = fs.readFileSync(sampleMergedFilePath, 'utf-8');

    // Process the content
    const results = splitMergedMDXContent(mergedSampleContent);

    // Verify the results
    expect(results).toHaveLength(3);

    // Check the first file
    expect(results[0]?.path).toBe('./docs/intro.mdx');
    expect(results[0]?.content).toContain('# Introduction');
    expect(results[0]?.content).toContain('Welcome to our documentation!');

    // Check the second file
    expect(results[1]?.path).toBe('./docs/concepts/basics.mdx');
    expect(results[1]?.content).toContain('# Basics');
    expect(results[1]?.content).toContain('This document covers the basic concepts');

    // Check the third file
    expect(results[2]?.path).toBe('./examples/quick-start.mdx');
    expect(results[2]?.content).toContain('# Quick Start');
    expect(results[2]?.content).toContain('This is a quick start guide');
  });
});
