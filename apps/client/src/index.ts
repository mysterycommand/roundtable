import evt from 'evt';

import { el, isReady, rtcp, ws } from './lib/helpers.js';

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
  requestAnimationFrame: raf,
  // cancelAnimationFrame: caf,
} = window;
const { Evt } = evt;

const canvas = el<HTMLCanvasElement>('canvas');
if (!canvas) {
  throw new Error('Expected an HTMLCanvasElement, but found none');
}

const context = canvas.getContext('2d');
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
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_the_negotiationneeded_event
 */
Evt.from<Event>(connection, 'negotiationneeded').attach(async () => {
  try {
    await connection.setLocalDescription();
    await isReady(socket);
    socket.send(JSON.stringify({ description: connection.localDescription }));
  } catch (error) {
    console.error(error);
  }
});

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#Handling_incoming_ICE_candidates
 */
Evt.from<RTCPeerConnectionIceEvent>(connection, 'icecandidate').attach(
  async ({ candidate }) => {
    await isReady(socket);
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

const moveCtx = Evt.newCtx();
const moveEvt = Evt.from<PointerEvent>(canvas, 'pointermove');

/**
 * interface Event {
 *   readonly bubbles: boolean;
 *   readonly cancelable: boolean;
 *   readonly composed: boolean;
 *   readonly defaultPrevented: boolean;
 *   readonly eventPhase: number;
 *   readonly isTrusted: boolean;
 *   readonly timeStamp: number;
 *   readonly type: string;
 * }
 *
 * interface UIEvent extends Event {
 *   readonly detail: number;
 * }
 *
 * interface MouseEvent extends UIEvent {
 *   readonly altKey: boolean;
 *   readonly button: number;
 *   readonly buttons: number;
 *   readonly clientX: number;
 *   readonly clientY: number;
 *   readonly ctrlKey: boolean;
 *   readonly metaKey: boolean;
 *   readonly movementX: number;
 *   readonly movementY: number;
 *   readonly offsetX: number;
 *   readonly offsetY: number;
 *   readonly pageX: number;
 *   readonly pageY: number;
 *   readonly screenX: number;
 *   readonly screenY: number;
 *   readonly shiftKey: boolean;
 *   readonly x: number;
 *   readonly y: number;
 * }
 *
 * interface PointerEvent extends MouseEvent {
 *   readonly height: number;
 *   readonly isPrimary: boolean;
 *   readonly pointerId: number;
 *   readonly pointerType: string;
 *   readonly pressure: number;
 *   readonly tangentialPressure: number;
 *   readonly tiltX: number;
 *   readonly tiltY: number;
 *   readonly twist: number;
 *   readonly width: number;
 * }
 */
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

const frameEvt = Evt.create<DOMHighResTimeStamp>();
const frame = (t: DOMHighResTimeStamp) => {
  raf(frame);
  frameEvt.post(t);
};
raf(frame);
frameEvt.attach((/* t */) => {
  // console.log(t);
});

/**
 * drawing
 */
// context.clearRect(0, 0, canvas.width, canvas.height);
// context.fillStyle = `hsl(${hue}, 80%, 50%)`;
// const r = 10 + Math.sin(Date.now()) * 10;
// context.beginPath();
// context.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
// context.fill();
