export function Instructions() {
  return (
    <div className="mt-6 bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Instructions</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            How to use the MDX Multi Editor
          </p>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2">
          <div className="prose dark:prose-invert max-w-none">
            <h4>File Structure</h4>
            <p>
              Files are displayed with headers that indicate their path. For example:
            </p>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <code>
                ---<br/>
                [intro](./docs/intro.mdx)
              </code>
            </pre>
            <p>Edit the content below each file header. When you save, changes will be written to the appropriate files.</p>

            <h4>Keyboard Shortcuts</h4>
            <ul>
              <li><strong>Ctrl+S</strong> - Save changes</li>
              <li><strong>Ctrl+B</strong> - Bold text</li>
              <li><strong>Ctrl+I</strong> - Italic text</li>
              <li><strong>Ctrl+K</strong> - Create link</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
