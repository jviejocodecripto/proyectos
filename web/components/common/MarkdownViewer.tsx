'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export default function MarkdownViewer({
  content,
  className = ''
}: MarkdownViewerProps) {
  return (
    <div
      className={`prose prose-sm max-w-none 
        prose-headings:text-gray-900 prose-headings:font-bold
        prose-h1:text-xl prose-h1:mb-2 prose-h1:mt-4
        prose-h2:text-lg prose-h2:mb-2 prose-h2:mt-3
        prose-h3:text-base prose-h3:mb-1 prose-h3:mt-2
        prose-p:text-gray-700 prose-p:my-2
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-gray-900 prose-strong:font-semibold
        prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-gray-900 prose-pre:text-gray-100
        prose-ul:my-2 prose-ul:list-disc
        prose-ol:my-2 prose-ol:list-decimal
        prose-li:text-gray-700 prose-li:my-1
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
        prose-table:border-collapse prose-table:w-full
        prose-th:bg-gray-100 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2
        prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

