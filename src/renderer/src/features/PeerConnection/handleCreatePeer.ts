// import SimplePeer from 'simple-peer';
import createDesktopCapturerStream from './createDesktopCapturerStream';
import handlePeerOnData from './handlePeerOnData';
import NullSimplePeer from './NullSimplePeer';
import simplePeerHandleSdpTransform from './simplePeerHandleSdpTransform';

export default function handleCreatePeer(
	peerConnection: PeerConnection,
): Promise<void> {
	return new Promise((resolve, reject) => {
		// cleanup existing peer before creating new one
		if (peerConnection.peer !== NullSimplePeer) {
			try {
				peerConnection.peer.removeAllListeners();
				peerConnection.peer.destroy();
			} catch (error) {
				console.error('Error cleaning up existing peer:', error);
			}
			peerConnection.peer = NullSimplePeer;
		}

		// cleanup existing stream before creating new one
		if (peerConnection.localStream) {
			peerConnection.localStream.getTracks().forEach((track) => {
				track.stop();
			});
			peerConnection.localStream = null;
		}

		// clear old signals and reset call state when recreating peer
		peerConnection.signalsDataToCallUser = [];
		peerConnection.isCallStarted = false;

		createDesktopCapturerStream(
			peerConnection,
			peerConnection.desktopCapturerSourceID,
		)
			.then(() => {
				// if (peerConnection.peer === NullSimplePeer) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				peerConnection.peer = new SimplePeer({
					initiator: true,
					// trickle: false,
					// wrtc: window.api.wrtc,
					config: { iceServers: [] },
					sdpTransform: simplePeerHandleSdpTransform,
				});
				// }

				// TODO: basically here we need a client side simple peer, but we get a nodejs side simple peer
				if (peerConnection.localStream !== null) {
					peerConnection.peer.addStream(peerConnection.localStream);
				}

				peerConnection.peer.on('signal', (data: string) => {
					// fired when simple peer and webrtc done preparation to start call on peerConnection machine
					peerConnection.signalsDataToCallUser.push(data);
				});

				peerConnection.peer.on('connect', () => {
					// Apply low-latency encoding parameters after connection
					try {
						const pc = peerConnection.peer._pc as RTCPeerConnection;
						const sender = pc?.getSenders()?.find((s) => s.track?.kind === 'video');
						if (sender) {
							const params = sender.getParameters();
							if (params.encodings && params.encodings.length > 0) {
								params.encodings[0].maxBitrate = 50_000_000; // 50Mbps cap
								params.encodings[0].maxFramerate = 60;
								params.encodings[0].scaleResolutionDownBy = 1; // never downscale
								// @ts-ignore priority exists in Chrome
								params.encodings[0].priority = 'high';
								// @ts-ignore networkPriority exists in Chrome
								params.encodings[0].networkPriority = 'high';
								sender.setParameters(params).catch(() => {});
							}
							// @ts-ignore degradationPreference exists in Chrome
							if (sender.setDegradationPreference) {
								// @ts-ignore
								sender.setDegradationPreference('maintain-framerate').catch(() => {});
							}
						}
					} catch (e) {
						console.warn('Failed to set encoding params', e);
					}
				});
				peerConnection.peer.on('data', (data) => {
					handlePeerOnData(peerConnection, data);
				});

				// ensure cleanup on peer end/error to prevent dangling helper window
				peerConnection.peer.on('close', () => {
					peerConnection.selfDestroy();
				});

				peerConnection.peer.on('error', (e: Error) => {
					console.error('peerConnection peer error', e);
					peerConnection.selfDestroy();
				});
				resolve(undefined);
			})
			.catch((e) => {
				console.error(e);
				reject();
			});
	});
}
