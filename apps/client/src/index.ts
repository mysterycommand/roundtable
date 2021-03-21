import evt from 'evt';
import { produce } from 'immer';

import { el, isReady, rtcp, ws } from './lib/helpers.js';

/**
 * @see https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/966
 */
declare global {
  interface RTCPeerConnection {
    setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void>;
  }
}

const { Evt } = evt;

const {
  devicePixelRatio: dpr,
  requestAnimationFrame: raf,
  // cancelAnimationFrame: caf,
} = window;

const canvas = el<HTMLCanvasElement>('canvas');
if (!canvas) {
  throw new Error('Expected an HTMLCanvasElement, but found none');
}

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Expected a CanvasRenderingContext2D, but found none');
}

const { hostname, protocol } = location;
const socketProtocol = protocol === 'https:' ? 'wss' : 'ws';
const socketPort = protocol === 'https:' ? '' : ':8080';
const socket = ws(`${socketProtocol}://${hostname}${socketPort}`);
const connection = rtcp();
const channel = connection.createDataChannel('@rnd/state');

const isMessageEvent = (
  event: Event | RTCErrorEvent | MessageEvent,
): event is MessageEvent => event.type === 'message';

/**
 * Connection Logging
 */
Evt.merge([
  Evt.from<Event>(connection, 'connectionstatechange'),
  Evt.from<Event>(connection, 'signalingstatechange'),
]).attach(() => {
  console.log('connection.connectionState', connection.connectionState);
  console.log('connection.signalingState', connection.signalingState);
});

/**
 * Data Channel Logging
 */
Evt.merge([
  Evt.from<Event>(channel, 'open'),
  Evt.from<Event>(channel, 'close'),
  Evt.from<RTCErrorEvent>(channel, 'error'),
  Evt.from<MessageEvent<string>>(channel, 'message'),
]).attach((event) => {
  if (isMessageEvent(event) && event.data) {
    console.log('event.data', event.data);
    return;
  }

  console.log('event.type', event.type);
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
 * Perfect Negotiation
 */
Evt.from<Event>(connection, 'negotiationneeded').attach(async () => {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_the_negotiationneeded_event
   */
  try {
    // can't to "perfect negotiation" because of Safari/Mobile Safari
    const offer = await connection.createOffer();
    await connection.setLocalDescription(new RTCSessionDescription(offer));
    await isReady(socket);
    socket.send(JSON.stringify({ description: connection.localDescription }));
  } catch (error) {
    console.error(error);
  }
});

Evt.from<RTCPeerConnectionIceEvent>(connection, 'icecandidate').attach(
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_ICE_candidates
   */
  async ({ candidate }) => {
    await isReady(socket);
    socket.send(JSON.stringify({ candidate }));
  },
);

Evt.from<MessageEvent<string>>(socket, 'message').attach(async ({ data }) => {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_messages_on_the_signaling_channel
   */
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

/**
 * Window Resizing
 */
Evt.from<Event>(window, 'resize').attach(() => {
  const { innerWidth, innerHeight } = window;

  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;

  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.transform = `scale(${1 / dpr})`;
});

window.dispatchEvent(new Event('resize'));

/**
 * Pointer Events
 */
const moveCtx = Evt.newCtx();
const moveEvt = Evt.from<PointerEvent>(canvas, 'pointermove');

Evt.from<PointerEvent>(canvas, 'pointerdown').attach(() => {
  moveEvt.attach(
    moveCtx,
    ({ type, pointerId, pointerType, pressure, x, y }) => {
      channel.send(
        JSON.stringify({ type, pointerId, pointerType, pressure, x, y }),
      );
    },
  );
});

Evt.from<PointerEvent>(canvas, 'pointerup').attach(() => {
  moveCtx.done();
});

interface ClientData {
  clientId: string;
  hue: number;
  type: string;
  pointerId: number;
  pointerType: 'mouse' | 'pen' | 'touch';
  pressure: number;
  x: number;
  y: number;
}

interface Dictionary<T> {
  [id: string]: T;
}

interface EntityState<T> {
  ids: string[];
  entities: Dictionary<T>;
}

let state: EntityState<ClientData> = {
  ids: [],
  entities: {},
};

Evt.from<MessageEvent<string>>(channel, 'message').attach(({ data }) => {
  const parsedData: ClientData = JSON.parse(data);
  state = produce(state, (draft) => {
    draft.entities[parsedData.clientId] = parsedData;
    draft.ids = Object.keys(draft.entities);
  });
});

/**
 * Animation Frames
 */
const frameCtx = Evt.newCtx();
const frameEvt = Evt.create<DOMHighResTimeStamp>();

const frame = (t: DOMHighResTimeStamp) => {
  raf(frame);
  frameEvt.post(t);
};
raf(frame);

frameEvt.attach(frameCtx, (t) => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  Object.values(state.entities).forEach(({ hue, x, y, pressure }) => {
    context.fillStyle = `hsl(${hue}, 80%, 50%)`;

    context.beginPath();

    const p = 10 * pressure;
    const r = (p * 2 + Math.sin(t / 400) * p) * dpr;
    context.ellipse(x * dpr, y * dpr, r, r, 0, 0, Math.PI * 2);

    context.fill();
  });
});
