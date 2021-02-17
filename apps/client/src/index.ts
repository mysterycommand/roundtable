import evt from 'evt';

import { el, rtcp, ws } from './lib/helpers.js';

const { Evt } = evt;
const {
  devicePixelRatio: dpr,
  // requestAnimationFrame: raf,
  // cancelAnimationFrame: caf,
} = window;

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

Evt.from<Event>(window, 'resize').attach(() => {
  const { innerWidth, innerHeight } = window;

  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;

  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.transform = `scale(${1 / dpr})`;
});

window.dispatchEvent(new Event('resize'));
