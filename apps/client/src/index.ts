import { Evt } from 'evt';

Evt.from<Event>(window, 'resize').attach(() => {
  const { innerWidth, innerHeight } = window;
  console.log(innerWidth, innerHeight);
});

window.dispatchEvent(new Event('resize'));
