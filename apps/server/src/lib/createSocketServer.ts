import ws from 'ws';

export const createSocketServer = (
  options?: ws.ServerOptions,
  callback?: () => void,
): ws.Server => new ws.Server(options, callback);
