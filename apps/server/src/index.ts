import { createServer } from 'http';

import evt from 'evt';
import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';

/**
 * need the `*.js` extension here
 * @see https://github.com/nodejs/node/issues/32103#issuecomment-595806356
 */
import { createPeerConnection } from './lib/createPeerConnection.js';
import { createSocketServer } from './lib/createSocketServer.js';

const { Evt } = evt;

const server = createServer();
const socketServer = createSocketServer({ server });
const channels: Map<WebSocket, RTCDataChannel> = new Map();

Evt.from<WebSocket>(socketServer, 'connection').attach((socket) => {
  const clientId = uuid();
  const connection = createPeerConnection();

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
        const parsedData = JSON.parse(data);

        channels.forEach((clientChannel /* , clientSocket */) => {
          // // only broadcast to "other" clients
          // if (clientSocket === socket) {
          //   return;
          // }

          clientChannel.send(
            JSON.stringify({
              clientId,
              ...parsedData,
            }),
          );
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
