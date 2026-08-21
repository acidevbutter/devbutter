import { Fragment, isValidElement, type ReactNode, cloneElement } from "react";
import styles from "./StreamingText.module.scss";

/** Roughly the cadence of a model streaming tokens without being slow to read. */
const PER_WORD_MS = 30;

export function countWords(text: string) {
  return text.trim().split(/\s+/).length;
}

type Cursor = { index: number };

/**
 * Splits text nodes into one span per word while leaving every wrapping element intact,
 * so coloured spans inside a headline keep working.
 */
function tokenise(
  node: ReactNode,
  cursor: Cursor,
  startMs: number,
  perWordMs: number
): ReactNode {
  if (typeof node === "string") {
    // The capture group keeps the whitespace, so words don't run together.
    return node.split(/(\s+)/).map((chunk, i) => {
      if (!chunk || !chunk.trim()) return chunk;
      const delay = startMs + cursor.index * perWordMs;
      cursor.index += 1;
      return (
        <span key={i} className={styles.word} style={{ animationDelay: `${delay}ms` }}>
          {chunk}
        </span>
      );
    });
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <Fragment key={i}>{tokenise(child, cursor, startMs, perWordMs)}</Fragment>
    ));
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return cloneElement(
      node,
      undefined,
      tokenise(node.props.children, cursor, startMs, perWordMs)
    );
  }

  return node;
}

type Props = {
  children: ReactNode;
  /** When this block starts arriving, measured from first paint. */
  startMs: number;
  perWordMs?: number;
  /** Blinking block cursor, for the block that finishes last. */
  caret?: boolean;
};

/**
 * Reveals its children a word at a time, the way a model streams tokens.
 *
 * The full text is rendered up front and only its opacity is animated, so the layout
 * never reflows, search engines and screen readers get the whole copy on first paint,
 * and the effect needs no JavaScript to run — it is CSS the server already sent.
 */
export default function StreamingText({
  children,
  startMs,
  perWordMs = PER_WORD_MS,
  caret = false,
}: Props) {
  const cursor: Cursor = { index: 0 };
  const content = tokenise(children, cursor, startMs, perWordMs);
  const endMs = startMs + cursor.index * perWordMs;

  return (
    <>
      {content}
      {caret && (
        <span
          className={styles.caret}
          aria-hidden="true"
          style={{
            // Blink from this block's first token until its last, then switch off.
            animationDelay: `${startMs}ms, ${endMs}ms`,
          }}
        >
          ▮
        </span>
      )}
    </>
  );
}

export { PER_WORD_MS };
