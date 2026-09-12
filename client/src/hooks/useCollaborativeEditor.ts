import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';
import { useAuthStore } from '../stores/authStore';

export interface RemoteUser {
  clientId: number;
  username: string;
  color: string;
  cursor: { lineNumber: number; column: number } | null;
  selection: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

interface UseCollaborativeEditorOptions {
  roomCode: string;
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
  editorReady: boolean;
}

export function useCollaborativeEditor({ roomCode, editorRef, editorReady }: UseCollaborativeEditorOptions) {
  const { user } = useAuthStore();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [connected, setConnected] = useState(false);

  // Initialize Yjs + WebSocket provider once the editor is mounted.
  // `editorReady` flips true in Editor's onMount, which is what lets this run
  // (the editor ref is null on the first render).
  useEffect(() => {
    const ed = editorRef.current;
    if (!roomCode || !editorReady || !ed) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

    // Every client in a room connects to the same URL, so they share one doc.
    const wsUrl = (import.meta.env.VITE_API_URL || 'ws://localhost:4000').replace('http', 'ws');
    const provider = new WebsocketProvider(wsUrl, `sync/room/${roomCode}`, ydoc);
    providerRef.current = provider;

    const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
    provider.awareness.setLocalStateField('user', {
      username: user?.username || 'Anonymous',
      color,
      avatar: user?.avatar_url,
    });

    provider.on('status', (event: { status: string }) => {
      setConnected(event.status === 'connected');
    });

    // Track awareness changes (remote users, excluding ourselves).
    const updateRemoteUsers = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      setRemoteUsers(
        states
          .filter(([clientId]) => clientId !== provider.awareness.clientID)
          .map(([clientId, state]: [number, any]) => ({
            clientId,
            username: state?.user?.username || 'Anonymous',
            color: state?.user?.color || '#888',
            cursor: state?.cursor || null,
            selection: state?.selection || null,
          }))
      );
    };
    provider.awareness.on('change', updateRemoteUsers);

    // Bind Monaco's model to the shared Yjs text.
    const model = ed.getModel();
    if (model) {
      bindingRef.current = new MonacoBinding(ytext, model, new Set([ed]), provider.awareness);
    }

    // Publish local cursor / selection through awareness.
    const cursorDisposable = ed.onDidChangeCursorPosition((e) => {
      provider.awareness.setLocalStateField('cursor', {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
    const selectionDisposable = ed.onDidChangeCursorSelection((e) => {
      provider.awareness.setLocalStateField('selection', {
        startLineNumber: e.selection.startLineNumber,
        startColumn: e.selection.startColumn,
        endLineNumber: e.selection.endLineNumber,
        endColumn: e.selection.endColumn,
      });
    });

    return () => {
      cursorDisposable.dispose();
      selectionDisposable.dispose();
      provider.awareness.off('change', updateRemoteUsers);
      bindingRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      bindingRef.current = null;
    };
  }, [roomCode, editorReady, user?.username, user?.avatar_url]);

  // Render remote cursors / selections as Monaco decorations.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];
    remoteUsers.forEach((remoteUser) => {
      if (remoteUser.selection) {
        newDecorations.push({
          range: {
            startLineNumber: remoteUser.selection.startLineNumber,
            startColumn: remoteUser.selection.startColumn,
            endLineNumber: remoteUser.selection.endLineNumber,
            endColumn: remoteUser.selection.endColumn,
          },
          options: {
            className: 'remote-selection',
            beforeContentClassName: 'remote-selection-before',
            afterContentClassName: 'remote-selection-after',
            stickiness: 1,
          },
        });
      }
      if (remoteUser.cursor) {
        newDecorations.push({
          range: {
            startLineNumber: remoteUser.cursor.lineNumber,
            startColumn: remoteUser.cursor.column,
            endLineNumber: remoteUser.cursor.lineNumber,
            endColumn: remoteUser.cursor.column,
          },
          options: {
            className: 'remote-cursor-line',
            beforeContentClassName: 'remote-cursor',
            before: {
              content: remoteUser.username,
              inlineClassName: 'remote-cursor-label',
              inlineClassNameAffectsLetterSpacing: true,
            },
            stickiness: 1,
          },
        });
      }
    });

    const existing = (ed as any).__remoteDecorations || [];
    (ed as any).__remoteDecorations = ed.deltaDecorations(existing, newDecorations);
  }, [remoteUsers, editorRef]);

  return { remoteUsers, connected };
}
