import nodeStatic from 'node-static';

export const createStaticServer = (
  root: string,
  options?: nodeStatic.Options,
): nodeStatic.Server => new nodeStatic.Server(root, options);
