import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Texto em markdown (títulos, listas, tabelas, links) no estilo do Superflow. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn(
      "space-y-2 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
      "[&_h1]:font-heading [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-heading [&_h3]:font-semibold",
      "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold",
      "[&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:bg-muted [&_th]:p-1.5 [&_th]:text-left",
      className,
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children: c }) => <a href={href} target="_blank" rel="noreferrer">{c}</a> }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
