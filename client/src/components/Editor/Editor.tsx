import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor, IDisposable } from 'monaco-editor';
import { useAuthStore } from '../../stores/authStore';
import { socketService } from '../../services/socket';
import { roomApi } from '../../services/api';
import { useCollaborativeEditor } from '../../hooks/useCollaborativeEditor';
import VersionHistory from './VersionHistory';

interface RemoteUser {
  id: string;
  username: string;
  color: string;
}

export default function EditorPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const contentListenerRef = useRef<IDisposable | null>(null);
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorReady, setEditorReady] = useState(false);

  // Use the collaborative editor hook (Yjs + Monaco binding).
  // `editorReady` gates it until Monaco has actually mounted (the ref is null
  // on first render, so the hook can't bind before then).
  const { remoteUsers, connected: yjsConnected } = useCollaborativeEditor({
    roomCode: code || '',
    editorRef,
    editorReady,
  });

  useEffect(() => {
    if (!code) return;

    // Connect socket for room presence (non-Yjs events)
    socketService.connect();
    socketService.joinRoom(code, user?.id);

    // Set up event listeners
    socketService.onRoomJoined((data: any) => {
      setUsers(data.users || []);
      setConnected(true);
      setLoading(false);
    });

    socketService.onUserJoined((data: any) => {
      setUsers((prev: RemoteUser[]) => [...prev, {
        id: data.id,
        username: data.username,
        color: data.color,
      }]);
    });

    socketService.onUserLeft((data: any) => {
      setUsers((prev: RemoteUser[]) => prev.filter((u) => u.id !== data.id));
    });

    socketService.onLanguageChange((data: any) => {
      setLanguage(data.language);
    });

    // Load room info
    loadRoomInfo();

    return () => {
      socketService.leaveRoom(code);
      socketService.off('room-joined');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('language-change');
    };
  }, [code, user?.id]);

  // Dispose the Monaco content listener when the page unmounts.
  useEffect(() => () => contentListenerRef.current?.dispose(), []);

  const loadRoomInfo = async () => {
    if (!code) return;
    try {
      const response = await roomApi.getRoomByCode(code);
      setLanguage(response.data.room.language || 'javascript');
    } catch (error) {
      console.error('Failed to load room:', error);
    }
  };

  const handleEditorMount: OnMount = (ed) => {
    editorRef.current = ed;
    setEditorReady(true);

    // Track content changes for version saving / export.
    contentListenerRef.current = ed.onDidChangeModelContent(() => {
      setEditorContent(ed.getModel()?.getValue() ?? '');
    });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    if (code) {
      socketService.sendLanguageChange(code, newLanguage);
    }
  };

  const copyRoomCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
    }
  };

  const handleSaveVersion = async () => {
    if (!code || !editorContent) return;
    try {
      await roomApi.createVersion(code, editorContent, `Save ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error('Failed to save version:', err);
    }
  };

  // Load a restored version's content into the editor (Yjs propagates it to peers).
  const handleRestore = useCallback((content: string) => {
    editorRef.current?.getModel()?.setValue(content);
  }, []);

  const handleExport = () => {
    if (!editorContent) return;
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-${code || 'export'}.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Merge Socket.IO presence with Yjs awareness users, excluding ourselves,
  // deduped by username. We render ourselves separately (avatar), so the
  // online count is remotes + 1.
  const remoteUserList = useMemo(() => {
    const merged = [
      ...users.map((u) => ({ id: u.id, username: u.username, color: u.color })),
      ...remoteUsers.map((u) => ({ id: String(u.clientId), username: u.username, color: u.color })),
    ];
    return merged.filter(
      (u, i, arr) =>
        u.username !== user?.username &&
        arr.findIndex((x) => x.username === u.username) === i
    );
  }, [users, remoteUsers, user?.username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Toolbar */}
      <div className="bg-dark-100 border-b border-gray-700 p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/room/${code}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Room
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Room:</span>
            <span className="text-white font-mono bg-dark-200 px-3 py-1 rounded">
              {code}
            </span>
            <button
              onClick={copyRoomCode}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleSaveVersion}
              className="px-3 py-2 bg-dark-200 text-gray-300 hover:bg-dark-300 rounded-md text-sm font-medium transition-colors"
              title="Save version snapshot"
            >
              💾 Save
            </button>
            <button
              onClick={() => setShowVersionHistory(true)}
              className="px-3 py-2 bg-dark-200 text-gray-300 hover:bg-dark-300 rounded-md text-sm font-medium transition-colors"
              title="Version history"
            >
              📋 History
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-dark-200 text-gray-300 hover:bg-dark-300 rounded-md text-sm font-medium transition-colors"
              title="Export code"
            >
              ⬇ Export
            </button>
          </div>

          {/* Language selector */}
          <select
            value={language}
            onChange={handleLanguageChange}
            className="bg-dark-200 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>

          {/* Connected users */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">
              {remoteUserList.length + 1} online
            </span>
            <div className="flex -space-x-2">
              {remoteUserList.map((u) => (
                <div
                  key={u.id}
                  className="w-8 h-8 rounded-full border-2 border-dark-100 flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: u.color }}
                  title={u.username}
                >
                  {u.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border-2 border-dark-100"
                />
              )}
            </div>
          </div>

          {/* Connection status indicators */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 text-xs">Socket</span>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-500 text-xs">Yjs</span>
            <div className={`w-3 h-3 rounded-full ${yjsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            autoIndent: 'full',
            cursorSmoothCaretAnimation: 'on',
            renderWhitespace: 'selection',
          }}
        />
      </div>

      {/* Version history modal */}
      <VersionHistory
        roomCode={code || ''}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={handleRestore}
      />
    </div>
  );
}
