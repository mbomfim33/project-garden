import { NEEDS_SHAPE, TOOL_HINT, type Tool } from './tools';

type Group = { name: string; tools: { key: Tool; label: string; shortcut: string }[] };

const GROUPS: Group[] = [
  {
    name: 'Shape',
    tools: [
      { key: 'select', label: 'Select', shortcut: 'V' },
      { key: 'draw', label: 'Draw', shortcut: 'D' },
      { key: 'insert', label: 'Add corner', shortcut: 'A' },
    ],
  },
  {
    name: 'Build',
    tools: [
      { key: 'wall', label: 'Walls', shortcut: 'W' },
      { key: 'door', label: 'Door', shortcut: 'R' },
      { key: 'box', label: 'Structure', shortcut: 'B' },
      { key: 'tree', label: 'Tree', shortcut: 'T' },
      { key: 'overhead', label: 'Roof', shortcut: 'O' },
      { key: 'overheadTrace', label: 'Trace roof', shortcut: 'G' },
    ],
  },
];

/**
 * Tools live over the drawing, not in the inspector — they're what you do, not
 * what you're looking at.
 */
export function EditorToolbar({
  tool,
  setTool,
  closed,
  undo,
  redo,
  canUndo,
  canRedo,
  fitView,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  closed: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  fitView: () => void;
}) {
  return (
    <div className="toolbar">
      {GROUPS.map((group) => (
        <div className="tgroup" key={group.name}>
          <span className="tlabel">{group.name}</span>
          <div className="seg">
            {group.tools.map((t) => (
              <button
                key={t.key}
                aria-pressed={tool === t.key}
                disabled={NEEDS_SHAPE.includes(t.key) && !closed}
                onClick={() => setTool(t.key)}
                title={`${TOOL_HINT[t.key]} (${t.shortcut})`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <span className="tspacer" />

      <div className="tgroup">
        <div className="seg">
          <button onClick={undo} disabled={!canUndo} title="Undo (Cmd-Z)">
            Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Shift-Cmd-Z)">
            Redo
          </button>
          <button onClick={fitView} title="Frame the whole space">
            Fit
          </button>
        </div>
      </div>
    </div>
  );
}
