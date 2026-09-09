import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders CMS Markdown (GitHub flavoured) with Owlyn typography. Everything
 * passes through rehype-sanitize's default schema, so raw HTML and scripts in
 * page bodies never reach the browser. Body headings are demoted one level
 * because the page template owns the h1.
 */
const components: Components = {
  h1: ({ node: _node, ...props }) => <h2 className="pt-6 text-xl md:text-2xl" {...props} />,
  h2: ({ node: _node, ...props }) => <h2 className="pt-6 text-xl md:text-2xl" {...props} />,
  h3: ({ node: _node, ...props }) => <h3 className="pt-3 text-lg" {...props} />,
  h4: ({ node: _node, ...props }) => (
    <h4
      className="pt-2 font-sans text-base font-medium tracking-normal [font-stretch:normal]"
      {...props}
    />
  ),
  p: ({ node: _node, ...props }) => <p className="leading-relaxed" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="list-disc space-y-1.5 pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="list-decimal space-y-1.5 pl-5" {...props} />,
  li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node: _node, ...props }) => (
    <strong className="font-medium text-foreground" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="border-l-2 border-talon pl-4 text-muted-foreground" {...props} />
  ),
  hr: () => <hr className="border-border" />,
  code: ({ node: _node, ...props }) => (
    <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.9em]" {...props} />
  ),
  a: ({ node: _node, href, children, ...props }) => {
    const url = href ?? "#";
    const internal = url.startsWith("/") && !url.startsWith("//");
    const className = "underline underline-offset-4 hover:text-primary";
    return internal ? (
      <Link href={url} className={className}>
        {children}
      </Link>
    ) : (
      <a href={url} className={className} rel="noreferrer" {...props}>
        {children}
      </a>
    );
  },
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead className="text-left" {...props} />,
  th: ({ node: _node, ...props }) => (
    <th className="border-b border-border py-2 pr-4 align-top font-medium" {...props} />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border-b border-border py-2 pr-4 align-top text-muted-foreground" {...props} />
  ),
};

/** HTML comments (editorial notes such as review markers) never leave the server. */
function stripComments(markdown: string): string {
  return markdown.replace(/<!--[sS]*?-->/g, "");
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 text-base text-foreground/90", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {stripComments(content)}
      </ReactMarkdown>
    </div>
  );
}
