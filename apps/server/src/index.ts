import { createServer } from 'http';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import evt from 'evt';
import ws from 'ws';

/**
 * need the `*.js` extension here
 * @see https://github.com/nodejs/node/issues/32103#issuecomment-595806356
 */
import { createPeerConnection } from './lib/createPeerConnection.js';
import { createSocketServer } from './lib/createSocketServer.js';
import { createStaticServer } from './lib/createStaticServer.js';

const { Evt } = evt;

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticServer = createStaticServer(resolve(__dirname, '../public'));

const server = createServer((req, res) => {
  staticServer.serve(req, res, (err) => {
    console.log(req.url, err);
    if (!err) {
      return;
    }

    /**
     * n.b. the `Callback` is mis-typed in `@types/node-static`
     * @see https://github.com/cloudhead/node-static#intercepting-errors--listening
     */
    // @ts-expect-error
    res.writeHead(err.status, err.headers);
    res.end();
  });
});
const socketServer = createSocketServer({ server });
const connections: Map<ws, RTCPeerConnection> = new Map();

Evt.from<ws>(socketServer, 'connection').attach((socket) => {
  connections.set(socket, createPeerConnection());
  console.log(connections);
});

server.listen(8080);
