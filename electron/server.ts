import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

export interface PeerInfo {
  userId: string;
  name: string;
  handle: string;
  role: string;
  avatar: string;
  status: 'online' | 'away' | 'busy';
}

export interface ChannelMeta {
  id: string;
  name: string;
  topic: string;
}

interface ConnectedClient {
  ws: WebSocket;
  peer: PeerInfo | null;
}

const DEFAULT_PORT = 4120;

let wss: WebSocketServer | null = null;
const clients = new Set<ConnectedClient>();
const channels = new Map<string, ChannelMeta>([
  [
    'ch-general',
    {
      id: 'ch-general',
      name: 'general',
      topic: 'Team-wide workspace channel',
    },
  ],
]);

function broadcast(payload: unknown, excludeWs?: WebSocket) {
  const raw = JSON.stringify(payload);
  for (const client of clients) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

function sendToUser(userId: string, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const client of clients) {
    if (client.peer?.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

function broadcastPeerList() {
  const peersMap = new Map<string, PeerInfo>();
  for (const client of clients) {
    if (client.peer) {
      peersMap.set(client.peer.userId, client.peer);
    }
  }
  broadcast({
    type: 'peers:list',
    peers: Array.from(peersMap.values()),
  });
}

export function startRelayServer(port = DEFAULT_PORT): Promise<{
  hosting: boolean;
  port: number;
}> {
  if (wss) {
    return Promise.resolve({ hosting: true, port });
  }

  return new Promise((resolve) => {
    const server = new WebSocketServer({ host: '0.0.0.0', port });

    server.once('listening', () => {
      wss = server;
      console.log(`[LemChat Relay] Listening on ws://0.0.0.0:${port}`);
      resolve({ hosting: true, port });
    });

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(
          `[LemChat Relay] Port ${port} already in use; connecting as peer client.`
        );
        resolve({ hosting: false, port });
      } else {
        console.error('[LemChat Relay] Server error:', err);
        resolve({ hosting: false, port });
      }
    });

    server.on('connection', (ws) => {
      const client: ConnectedClient = { ws, peer: null };
      clients.add(client);

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          switch (msg.type) {
            case 'hello': {
              client.peer = msg.peer as PeerInfo;
              ws.send(
                JSON.stringify({
                  type: 'channels:sync',
                  channels: Array.from(channels.values()),
                })
              );
              broadcastPeerList();
              break;
            }

            case 'status:update': {
              if (client.peer) {
                client.peer = { ...client.peer, status: msg.status };
                broadcastPeerList();
              }
              break;
            }

            case 'channel:create': {
              const ch = msg.channel as ChannelMeta;
              if (ch?.id && ch?.name && !channels.has(ch.id)) {
                channels.set(ch.id, ch);
                broadcast({ type: 'channel:created', channel: ch });
              }
              break;
            }

            case 'message:send': {
              if (msg.targetType === 'dm' && msg.recipientId) {
                sendToUser(msg.recipientId, msg);
              } else {
                broadcast(msg, ws);
              }
              break;
            }

            case 'message:edit':
            case 'message:delete':
            case 'message:react': {
              if (msg.targetType === 'dm' && msg.recipientId) {
                sendToUser(msg.recipientId, msg);
              } else {
                broadcast(msg, ws);
              }
              break;
            }

            case 'typing:start':
            case 'typing:stop': {
              if (msg.targetType === 'dm' && msg.recipientId) {
                sendToUser(msg.recipientId, msg);
              } else {
                broadcast(msg, ws);
              }
              break;
            }

            case 'rtc:signal': {
              if (msg.toUserId) {
                sendToUser(msg.toUserId, msg);
              }
              break;
            }
          }
        } catch (err) {
          console.error('[LemChat Relay] Invalid message:', err);
        }
      });

      ws.on('close', () => {
        clients.delete(client);
        broadcastPeerList();
      });
    });
  });
}

export function stopRelayServer() {
  if (wss) {
    wss.close();
    wss = null;
    clients.clear();
  }
}

export function getLocalLanIPs(): string[] {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}
