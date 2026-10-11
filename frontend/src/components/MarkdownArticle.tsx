import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MarkdownArticle = ({ content }: { content: string }) => (
  <div className="article-body markdown-article">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...props }) => (
          <a
            {...props}
            href={href}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            target={href?.startsWith('http') ? '_blank' : undefined}
          >
            {children}
          </a>
        ),
        img: ({ src, alt, title, ...props }) => (
          <span className="article-figure">
            <img {...props} src={src} alt={alt || ''} title={title} loading="lazy" decoding="async" />
            {title && <span className="article-caption">{title}</span>}
          </span>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
