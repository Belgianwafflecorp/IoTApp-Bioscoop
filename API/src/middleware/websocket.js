import { WebSocketServer } from 'ws';

const clientsByScreening = new Map(); // { screeningId => Set of WebSocket clients }

export default function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let screeningId;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe' && data.screeningId) {
          screeningId = data.screeningId;
          if (!clientsByScreening.has(screeningId)) {
            clientsByScreening.set(screeningId, new Set());
          }
          clientsByScreening.get(screeningId).add(ws);
        }
      } catch (err) {
        console.error('Invalid WebSocket message:', message);
      }
    });

    ws.on('close', () => {
      if (screeningId && clientsByScreening.has(screeningId)) {
        clientsByScreening.get(screeningId).delete(ws);
      }
    });
  });

  // Broadcast update
  function broadcastUpdate(screeningId, data) {
    const clients = clientsByScreening.get(screeningId);
    if (clients) {
      for (const client of clients) {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'update', data }));
        }
      }
    }
  }

  // Expose broadcaster
  setupWebSocket.broadcastUpdate = broadcastUpdate;
}
