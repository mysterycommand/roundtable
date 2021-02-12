import { Server, ServerOptions } from 'ws';

export const createSocketServer = (
  options?: ServerOptions,
  callback?: () => void,
): Server => new Server(options, callback);
