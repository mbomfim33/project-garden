import { useCallback, useRef, useState } from 'react';
import type { Action, EditorDoc } from './editorReducer';
import { reducer } from './editorReducer';

const LIMIT = 60;

/**
 * The document plus its history. `apply` keeps the canvas live during a gesture
 * without recording anything; `commit` runs the action and records the result as
 * one step, so undo rewinds a gesture rather than a pixel.
 */
export function useEditor(initial: EditorDoc) {
  const [doc, setDoc] = useState<EditorDoc>(initial);
  const past = useRef<EditorDoc[]>([]);
  const future = useRef<EditorDoc[]>([]);
  const [depth, setDepth] = useState({ back: 0, forward: 0 });

  const sync = useCallback(() => {
    setDepth({ back: past.current.length, forward: future.current.length });
  }, []);

  const apply = useCallback((action: Action) => {
    setDoc((d) => reducer(d, action));
  }, []);

  const commit = useCallback(
    (action: Action) => {
      setDoc((d) => {
        const next = reducer(d, action);
        if (next === d) return d;
        past.current.push(d);
        if (past.current.length > LIMIT) past.current.shift();
        future.current = [];
        sync();
        return next;
      });
    },
    [sync],
  );

  /** Records the state from before an in-flight gesture began. */
  const commitFrom = useCallback(
    (before: EditorDoc, action: Action) => {
      setDoc((d) => {
        const next = reducer(d, action);
        past.current.push(before);
        if (past.current.length > LIMIT) past.current.shift();
        future.current = [];
        sync();
        return next;
      });
    },
    [sync],
  );

  const undo = useCallback(() => {
    setDoc((d) => {
      const prev = past.current.pop();
      if (!prev) return d;
      future.current.push(d);
      sync();
      return prev;
    });
  }, [sync]);

  const redo = useCallback(() => {
    setDoc((d) => {
      const next = future.current.pop();
      if (!next) return d;
      past.current.push(d);
      sync();
      return next;
    });
  }, [sync]);

  const replace = useCallback(
    (doc: EditorDoc) => {
      past.current = [];
      future.current = [];
      sync();
      setDoc(doc);
    },
    [sync],
  );

  return {
    doc,
    apply,
    commit,
    commitFrom,
    undo,
    redo,
    replace,
    canUndo: depth.back > 0,
    canRedo: depth.forward > 0,
  };
}
