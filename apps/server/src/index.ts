import { createServer } from 'http';

import { Evt } from 'evt';
import WebSocket from 'ws';

import { createPeerConnection } from './lib/createPeerConnection';
import { createSocketServer } from './lib/createSocketServer';

const server = createServer();
const socketServer = createSocketServer({ server });
const connections: Map<WebSocket, RTCPeerConnection> = new Map();

Evt.from<WebSocket>(socketServer, 'connection').attach((socket) => {
  connections.set(socket, createPeerConnection());
  console.log(connections);
});

server.listen(8080);
