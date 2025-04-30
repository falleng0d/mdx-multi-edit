# MDX Multi Edit

## Introduction

MDX Multi Edit is a web application that allows users to edit multiple MDX files at once
as if they were a single file.

The application is built with a React frontend and an Express backend, both written in
TypeScript. The backend server handles saving changes to the file system and serving API
endpoints, while the frontend provides a simple editor for users to edit files.

Both the client and server are started together using `concurrently`.

The application is started in the folder the user wants to work on, and all interactions
are relative to that folder.

## Endpoints

### GET /api/mdx

Returns a list of all mdx files using the glob pattern `./**/*.{md,mdx}`

```json
[
  {
    "file": "./content/jobs/sample.mdx",
    "content": "# Sample"
  }
]
```

### POST /api/mdx

Saves the changes to the file system

```json
{
  "file": "./content/jobs/sample.mdx",
  "content": "# Sample"
}
```

## Architecture

The application consists of two main parts:

- **Frontend:** A React application for editing MDX files in the browser.
- **Backend:** An Express server that exposes API endpoints for reading and writing MDX
  files on disk.

Both are started together with `concurrently` for a seamless development experience.

## Frontend Design

The frontend fetches all relevant MDX files via the `/api/mdx` endpoint and presents them
in a single editable view. While appearing merged, the files are visually separated by
automatically generated markdown headers that indicate the file and folder structure.

### Merged View Structure

The combined content follows this pattern:

1. **File Dividers:** Before each file's content, a markdown divider (`---`) is inserted,
   followed by a link to the file on the next line.

    - The format is:
      ```
      ---
      [fileNameNoExtension](${filePath})
      ```
    - Example (file `intro.mdx` in `./docs`):
      ```
      ---
      [intro](./docs/intro.mdx)
      ```

2. **File Content:** The raw content of the MDX file follows the file link, separated by a
   blank line.

### Example Combined View

```markdown
---
[intro](./docs/intro.mdx)

Content of intro.mdx...

---
[basics](./docs/concepts/basics.mdx)

Content of basics.mdx...

---
[quick-start](./examples/quick-start.mdx)

Content of quick-start.mdx...
```

This structure allows users to understand the context of each content block while editing
them together. When changes are saved via `POST /api/mdx`, the frontend needs to parse
this structure back into individual file contents before sending the data (or the backend
handles parsing the combined content).

## Parsing & Saving Changes

Once the user submits the edited merged view, we need to split it back into individual MDX
files and overwrite each on disk. There are two main approaches—regex-based or AST-based.
Below outlines both.

### 1. Regex-based Parser

1. **Locate all file dividers**
   Use a global regex that matches markdown dividers followed by a link to an .md/`.mdx`
   path:
   ```js
   const FILE_DIVIDER_RE = /^---\s*\n\s*\[([^\]]+)\]\((\.\/[^\)]+\.(?:md|mdx))\)/gm;
   ```
    - Captures
        - `name` (e.g. `intro`)
        - `path` (e.g. `./docs/intro.mdx`)

2. **Split sections**
    - Scan the merged markdown from top to bottom, finding each file divider match.
    - For each match, record its `index` in the text, and `path`.
    - After collecting all dividers, slice the text between the end of the file link line
      and the next divider (or EOF for the last one).
    - Trim leading/trailing blank lines.

3. **Build file-content map**
   ```ts
   type FileUpdate = { path: string, content: string }
   function splitMerged(text: string): FileUpdate[] { … }
   ```

4. **POST updates**
   For each `{path, content}`, call `POST /api/mdx`:
   ```jsonc
   {
     "file": "./docs/intro.mdx",
     "content": "<new MDX>"
   }
   ```

### 2. AST-based Parser (recommended for robustness)

1. **Parse to MDX AST**
   ```ts
   import { unified } from 'unified'
   import remarkParse from 'remark-parse'
   import remarkStringify from 'remark-stringify'
   import remarkMdx from 'remark-mdx'

   const tree = unified()
     .use(remarkParse)
     .use(remarkMdx)
     .parse(mergedMd)
   ```

2. **Traverse AST**
    - Walk through top-level nodes.
    - Look for a pattern of a thematic break node (`type: 'thematicBreak'`) followed by a
      paragraph node (`type: 'paragraph'`) containing a link (`type: 'link'`) pointing to
      `*.md(x)`. Treat this pattern as a file boundary.

3. **Group nodes**
    - Accumulate nodes after each file header into an array until the next file header.
    - For each group, build a new AST:
      ```ts
      const fileTree = {
        type: 'root',
        children: [ headingNode, ...groupedNodes ]
      }
      ```
    - Serialize with `remarkStringify`:
      ```ts
      const fileContent = unified()
        .use(remarkStringify)
        .stringify(fileTree)
      ```

4. **Save to disk**
    - For each `{path, fileContent}`, use Node's `fs.writeFileSync(path, fileContent)` (or
      async)
    - Return success/failure per file.

### Error Handling & Edge Cases

- **Missing or duplicate headers**: Validate header uniqueness; reject save if two headers
  reference the same path.
- **Parser failures**: Fall back to regex-split if AST parse errors.
- **Empty sections**: If content is empty, still write an empty file (or prompt user).
- **Concurrent edits**: Lock files while writing or queue writes to avoid race conditions.

---

With this design, frontend simply hands the merged string to the backend. The backend runs
one of the above parsers, writes each file, and returns a summary of saved paths or
errors.
