import ReactMarkdown, { type Components } from 'react-markdown'

/*
 * Mapeo de elementos markdown a la escala tipográfica del vault. El título
 * de la nota ya es el h1 de la página (text-title), así que los encabezados
 * del contenido bajan un nivel visual: # → text-2xl, ## → text-xl, etc.
 * Los enlaces usan musgo (accionable) y abren en pestaña nueva porque el
 * contenido solo puede apuntar afuera del vault.
 */
const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h2 className="mt-8 font-serif text-2xl font-medium">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-7 font-serif text-xl font-medium">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 font-serif text-lg font-medium">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mt-6 font-serif text-reading font-medium">{children}</h5>
  ),
  p: ({ children }) => <p className="mt-4">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-1 pl-6">{children}</ol>
  ),
  li: ({ children }) => <li className="[&>ol]:mt-1 [&>ul]:mt-1">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-musgo underline decoration-musgo/50 underline-offset-2 hover:decoration-musgo"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-trazo pl-4 text-sepia italic [&>p]:mt-2 [&>p:first-child]:mt-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="mt-6 border-trazo" />,
  code: ({ children }) => (
    <code className="rounded-xs bg-pizarra px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-xs border border-trazo bg-pizarra p-3 text-sm [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
}

/** Contenido de nota renderizado desde markdown plano, en la medida de lectura. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="font-serif text-reading [&>:first-child]:mt-0">
      <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
    </div>
  )
}
