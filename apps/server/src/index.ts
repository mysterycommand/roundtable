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
const channels: Map<ws, RTCDataChannel> = new Map();

Evt.from<ws>(socketServer, 'connection').attach((socket) => {
  // TODO: do something with `Evt.newCtx()`
  const connection = createPeerConnection();

  Evt.from<ws.CloseEvent>(socket, 'close').attachOnce(() => {
    connection.close();
    channels.delete(socket);
  });

  Evt.from<RTCDataChannelEvent>(connection, 'datachannel').attach(
    ({ channel }) => {
      channels.set(socket, channel);

      Evt.merge([
        Evt.from<Event>(channel, 'close'),
        Evt.from<RTCErrorEvent>(channel, 'error'),
      ]).attach(() => {
        socket.close();

        // TODO: this might not be necessary?
        connection.close();
        channels.delete(socket);
      });

      Evt.from<MessageEvent<string>>(channel, 'message').attach(({ data }) => {
        console.log({ data });
        channels.forEach((peerChannel, peerSocket) => {
          if (peerSocket === socket) {
            return;
          }

          peerChannel.send(data);
        });
      });
    },
  );

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_ICE_candidates
   */
  Evt.from<RTCPeerConnectionIceEvent>(connection, 'icecandidate').attach(
    ({ candidate }) => {
      socket.send(JSON.stringify({ candidate }));
    },
  );

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_messages_on_the_signaling_channel
   */
  Evt.from<ws.MessageEvent>(socket, 'message').attach(async (data) => {
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
