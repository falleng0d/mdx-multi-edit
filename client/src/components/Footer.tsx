export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          MDX Multi Edit &copy; {new Date().getFullYear()} | Built with React, MDXEditor, and Tailwind CSS
        </p>
      </div>
    </footer>
  )
}
