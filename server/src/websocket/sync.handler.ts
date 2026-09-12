import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
// y-websocket ships this Node helper without type declarations.
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

/**
 * Yjs real-time sync server.
 *
 * Uses y-websocket's battle-tested `setupWSConnection` (correct wire protocol,
 * awareness handling and cleanup) instead of a hand-rolled implementation.
 *
 * The WebSocket server runs in `noServer` mode and we route the HTTP `upgrade`
 * event ourselves so it can share the port with Socket.IO: only `/sync/*`
 * upgrades are handled here, everything else (e.g. `/socket.io/`) is left for
 * Socket.IO's own upgrade listener.
 */
export function setupSyncServer(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (conn, req) => {
    // Room comes from the URL path, e.g. `/sync/room/ABC123`.
    // All clients in a room connect to the same URL, so they share one doc.
    const docName = (req.url || '').slice(1).split('?')[0] || 'default';
    console.log(`[Yjs Sync] New connection for: ${docName}`);
    setupWSConnection(conn, req, { docName, gc: true });
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = (request.url || '').split('?')[0];
    // Only handle Yjs sync upgrades; leave others for Socket.IO.
    if (pathname.startsWith('/sync')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  console.log('✅ Yjs WebSocket sync server running on /sync path');
}
