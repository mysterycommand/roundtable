import evt from 'evt';

import { el, rtcp, ws } from './lib/helpers.js';

/**
 * @see https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/966
 */
declare global {
  interface RTCPeerConnection {
    setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void>;
  }
}

const {
  devicePixelRatio: dpr,
  // requestAnimationFrame: raf,
  // cancelAnimationFrame: caf,
} = window;
const { Evt } = evt;

const canvas = el<HTMLCanvasElement>('canvas');
if (!canvas) {
  throw new Error('Expected an HTMLCanvasElement, but found none');
}

const context = canvas?.getContext('2d');
if (!context) {
  throw new Error('Expected a CanvasRenderingContext2D, but found none');
}

const socket = ws('ws://localhost:8080');
const connection = rtcp();
const channel = connection.createDataChannel('@rnd/state');

Evt.merge([
  Evt.from<Event>(connection, 'connectionstatechange'),
  Evt.from<Event>(connection, 'signalingstatechange'),
]).attach(() => {
  console.log('connection.connectionState', connection.connectionState);
  console.log('connection.signalingState', connection.signalingState);
});

const isMessageEvent = (
  event: Event | RTCErrorEvent | MessageEvent,
): event is MessageEvent => event.type === 'message';

Evt.merge([
  Evt.from<Event>(channel, 'open'),
  Evt.from<Event>(channel, 'close'),
  Evt.from<RTCErrorEvent>(channel, 'error'),
  Evt.from<MessageEvent<string>>(channel, 'message'),
]).attach((event) => {
  console.log('event.type', event.type);

  if (isMessageEvent(event) && event.data) {
    console.log('event.data', event.data);
  }

  console.log('channel.bufferedAmount', channel.bufferedAmount);
  console.log('channel.id', channel.id);
  console.log('channel.label', channel.label);
  console.log('channel.maxPacketLifeTime', channel.maxPacketLifeTime);
  console.log('channel.maxRetransmits', channel.maxRetransmits);
  console.log('channel.negotiated', channel.negotiated);
  console.log('channel.ordered', channel.ordered);
  console.log('channel.priority', channel.priority);
  console.log('channel.protocol', channel.protocol);
  console.log('channel.readyState', channel.readyState);
});

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_the_negotiationneeded_event
 */
Evt.from<Event>(connection, 'negotiationneeded').attach(async () => {
  try {
    await connection.setLocalDescription();
    socket.send(JSON.stringify({ description: connection.localDescription }));
  } catch (error) {
    console.error(error);
  }
});

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
Evt.from<MessageEvent<string>>(socket, 'message').attach(async ({ data }) => {
  const { candidate, description } = JSON.parse(data);
  console.log({ candidate, description });

  try {
    candidate && (await connection.addIceCandidate(candidate));

    description &&
      description.type !== 'offer' &&
      (await connection.setRemoteDescription(description));
  } catch (error) {
    console.error(error);
  }
});

Evt.from<Event>(window, 'resize').attach(() => {
  const { innerWidth, innerHeight } = window;

  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;

  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.transform = `scale(${1 / dpr})`;
});

window.dispatchEvent(new Event('resize'));
