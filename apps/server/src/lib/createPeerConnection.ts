const defaultConfiguration: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:global.stun.twilio.com:3478',
      ],
    },
  ],
};

export const createPeerConnection = (
  Ctor: typeof RTCPeerConnection,
  configuration?: RTCConfiguration,
): RTCPeerConnection =>
  new Ctor({
    ...defaultConfiguration,
    ...configuration,
  });

// const factory = <T, U extends { new (...args: any[]): T }>(
//   Ctor: U,
//   args: ConstructorParameters<U>,
// ): T => new Ctor(...args);
