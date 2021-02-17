import evt from 'evt';

import { el } from './lib/helpers.js';

const { Evt } = evt;

const canvas = el<HTMLCanvasElement>('canvas');
if (!canvas) {
  throw new Error('Expected an HTMLCanvasElement, but found none');
}

const context = canvas?.getContext('2d');
if (!context) {
  throw new Error('Expected a CanvasRenderingContext2D, but found none');
}

Evt.from<Event>(window, 'resize').attach(() => {
  const { innerWidth, innerHeight, devicePixelRatio } = window;

  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;

  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  canvas.style.transform = `scale(${1 / devicePixelRatio})`;
});

window.dispatchEvent(new Event('resize'));
