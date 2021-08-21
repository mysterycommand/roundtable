import { createServer } from 'http';

import { Evt } from 'evt';
import { applyPatches, enablePatches, produceWithPatches } from 'immer';
import { v4 as uuid } from 'uuid';
import wrtc from 'wrtc';
import WebSocket from 'ws';
/**
 * need the `*.js` extension here
 * @see https://github.com/nodejs/node/issues/32103#issuecomment-595806356
 */
import { createPeerConnection } from './lib/createPeerConnection.js';
import { createSocketServer } from './lib/createSocketServer.js';

/**
 * @see https://immerjs.github.io/immer/patches
 */
enablePatches();

const { RTCPeerConnection } = wrtc;

const server = createServer();
const socketServer = createSocketServer({ server });
const channels: Map<WebSocket, RTCDataChannel> = new Map();

interface PointerData {
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';
  pressure: number;
  x: number;
  y: number;
}

interface ClientData {
  clientId: string;
  hue: number;
  pointers: EntityState<PointerData>;
}

interface Dictionary<T> {
  [id: string]: T;
}

interface EntityState<T> {
  ids: (string | number)[];
  entities: Dictionary<T>;
}
let state: EntityState<ClientData> = {
  ids: [],
  entities: {},
};

Evt.from<WebSocket>(socketServer, 'connection').attach((socket) => {
  const clientId = uuid();
  const hue = Math.floor(Math.random() * 360);
  const connection = createPeerConnection(RTCPeerConnection);

  Evt.from<RTCDataChannelEvent>(connection, 'datachannel').attach(
    ({ channel }) => {
      channels.set(socket, channel);

      Evt.merge([
        Evt.from<Event>(channel, 'close'),
        Evt.from<RTCErrorEvent>(channel, 'error'),
      ]).attach(() => {
        socket.close();
        connection.close();
        channels.delete(socket);
      });

      Evt.from<MessageEvent<string>>(channel, 'message').attach(({ data }) => {
        const parsedData: PointerData = JSON.parse(data);

        channels.forEach((clientChannel /* , clientSocket */) => {
          const [, patches] = produceWithPatches(state, (draft) => {
            draft.entities[clientId] = {
              clientId,
              hue,
              pointers: {
                ...draft.entities[clientId]?.pointers,
                entities: {
                  ...draft.entities[clientId]?.pointers?.entities,
                  [parsedData.pointerId]: parsedData,
                },
                ids: [
                  ...new Set(
                    draft.entities[clientId]?.pointers?.ids?.concat(
                      parsedData.pointerId,
                    ) ?? [parsedData.pointerId],
                  ),
                ],
              },
            };
            draft.ids = [...new Set(draft.ids.concat(clientId))];
          });

          state = applyPatches(state, patches);
          // console.log(`\n\n${JSON.stringify(state, null, 2)}`);
          clientChannel.send(JSON.stringify(patches));
        });
      });
    },
  );

  /**
   * Perfect Negotiation
   */
  Evt.from<RTCPeerConnectionIceEvent>(connection, 'icecandidate').attach(
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_ICE_candidates
     */
    ({ candidate }) => {
      socket.send(JSON.stringify({ candidate }));
    },
  );

  Evt.from<WebSocket.MessageEvent>(socket, 'message').attach(async (data) => {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_messages_on_the_signaling_channel
     */
    if (typeof data !== 'string' || data === 'null') {
      return;
    }

    const { candidate, description } = JSON.parse(data);
    console.log({ candidate, description });

    try {
      candidate &&
        candidate.candidate !== '' &&
        (await connection.addIceCandidate(candidate));

      if (description && description.type === 'offer') {
        /**
         * @see https://github.com/node-webrtc/node-webrtc/issues/674
         * @see https://github.com/node-webrtc/node-webrtc/issues/677
         */
        await connection.setRemoteDescription(description);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        socket.send(
          JSON.stringify({ description: connection.localDescription }),
        );
      }
    } catch (error) {
      console.error(error);
    }
  });
});

server.listen(8080);
