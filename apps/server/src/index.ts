import { createServer } from 'http';

import evt from 'evt';
import ws from 'ws';

/**
 * need the `*.js` extension here
 * @see https://github.com/nodejs/node/issues/32103#issuecomment-595806356
 */
import { createPeerConnection } from './lib/createPeerConnection.js';
import { createSocketServer } from './lib/createSocketServer.js';

const { Evt } = evt;

const server = createServer();
const socketServer = createSocketServer({ server });
const connections: Map<ws, RTCPeerConnection> = new Map();

Evt.from<ws>(socketServer, 'connection').attach((socket) => {
  connections.set(socket, createPeerConnection());
  console.log(connections);
});

server.listen(8080);
