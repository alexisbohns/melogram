import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Prose.module.css";

/**
 * Long-form markdown — a track's or album's `story`. Headings are demoted by
 * one level so the surrounding page keeps a single h1, and raw HTML is escaped
 * rather than rendered (no rehype-raw): liner notes have no need for it.
 */
export default function Prose({ markdown }: { markdown: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
