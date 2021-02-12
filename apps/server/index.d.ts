/// <reference lib="dom" />

declare module 'wrtc' {
  /**
   * @see https://github.com/node-webrtc/node-webrtc/issues/605#issuecomment-759172283
   */
  // eslint-disable-next-line no-var
  var RTCPeerConnection: {
    prototype: RTCPeerConnection;
    new (configuration?: RTCConfiguration): RTCPeerConnection;
    generateCertificate(
      keygenAlgorithm: AlgorithmIdentifier,
    ): Promise<RTCCertificate>;
    getDefaultIceServers(): RTCIceServer[];
  };
}
