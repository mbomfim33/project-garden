import type { ReactNode } from 'react';

/**
 * One card in the inspector. The header carries a summary so a shut panel
 * still tells you what's in it.
 */
export function Panel({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={open ? 'panel open' : 'panel'}>
      <button className="phead" onClick={onToggle} aria-expanded={open}>
        <span className="caret" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        <span className="ptitle">{title}</span>
        {summary != null ? <span className="psum">{summary}</span> : null}
      </button>
      {open ? <div className="pbody">{children}</div> : null}
    </section>
  );
}
