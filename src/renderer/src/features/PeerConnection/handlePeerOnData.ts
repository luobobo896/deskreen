import DesktopCapturerSourceType from '../../../../common/DesktopCapturerSourceType';
import prepareDataMessageToSendScreenSourceType from './prepareDataMessageToSendScreenSourceType';
import NullSimplePeer from './NullSimplePeer';

export default async function handlePeerOnData(
	peerConnection: PeerConnection,
	data: string,
): Promise<void> {
	const dataJSON = JSON.parse(data);

	if (dataJSON.type === 'set_video_quality') {
		const maxVideoQualityMultiplier = dataJSON.payload.value;

		if (
			!peerConnection.desktopCapturerSourceID.includes(
				DesktopCapturerSourceType.SCREEN,
			)
		)
			return;

		// Apply quality change via track constraints instead of creating
		// a new stream — avoids re-triggering screen capture permission dialog
		const videoTrack = peerConnection.localStream?.getVideoTracks()[0];
		if (!videoTrack) return;

		const sourceWidth = peerConnection.sourceDisplaySize?.width ?? 1920;
		const sourceHeight = peerConnection.sourceDisplaySize?.height ?? 1080;
		const targetWidth = Math.round(sourceWidth * maxVideoQualityMultiplier);
		const targetHeight = Math.round(sourceHeight * maxVideoQualityMultiplier);

		try {
			await videoTrack.applyConstraints({
				width: { ideal: targetWidth },
				height: { ideal: targetHeight },
				frameRate: { ideal: 60 },
			});
		} catch (e) {
			console.warn('applyConstraints failed, ignoring quality change', e);
		}
	}

	if (dataJSON.type === 'get_sharing_source_type') {
		const sourceType = peerConnection.desktopCapturerSourceID.includes(
			DesktopCapturerSourceType.SCREEN,
		)
			? DesktopCapturerSourceType.SCREEN
			: DesktopCapturerSourceType.WINDOW;

		peerConnection.peer.send(
			prepareDataMessageToSendScreenSourceType(sourceType),
		);
	}
}
