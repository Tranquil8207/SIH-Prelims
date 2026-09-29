import katex, { type KatexOptions } from "katex";

/**
 * Shared symbols. Add a macro here once and every visual can use it.
 * Example: `\R` renders as the real-number set.
 */
export const mathMacros: NonNullable<KatexOptions["macros"]> = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\C": "\\mathbb{C}",
};

const baseOptions = {
  throwOnError: false,
  trust: false,
  output: "htmlAndMathml",
  macros: mathMacros,
} satisfies Omit<KatexOptions, "displayMode">;

type EquationProps = {
  tex: string;
  /** Render as a centered block equation. Omit for inline math. */
  display?: boolean;
  className?: string;
};

export function Equation({ tex, display = false, className }: EquationProps) {
  const html = katex.renderToString(tex, {
    ...baseOptions,
    displayMode: display,
  });

  if (display) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
