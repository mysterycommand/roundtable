import { RTCPeerConnection } from 'wrtc';

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
  configuration?: RTCConfiguration,
): RTCPeerConnection =>
  new RTCPeerConnection({
    ...defaultConfiguration,
    ...configuration,
  });
