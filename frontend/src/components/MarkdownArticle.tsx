import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingId } from '../lib/learning';

const nodeText = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(nodeText).join('');
  if (value && typeof value === 'object' && 'props' in value)
    return nodeText((value as { props?: { children?: unknown } }).props?.children);
  return '';
};

export const MarkdownArticle = ({ content }: { content: string }) => (
  <div className="article-body markdown-article">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children, ...props }) => (
          <h2 {...props} id={headingId(nodeText(children))} className="scroll-mt-28">
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 {...props} id={headingId(nodeText(children))} className="scroll-mt-28">
            {children}
          </h3>
        ),
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
