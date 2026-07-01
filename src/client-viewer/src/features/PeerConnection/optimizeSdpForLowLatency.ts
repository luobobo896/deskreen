import setSdpMediaBitrate from './setSdpMediaBitrate';

/**
 * Optimize SDP for minimum latency + maximum compression (viewer side).
 * Codec priority: AV1 > VP9 > VP8 > H264 (all open/royalty-free).
 * Bitrate: adaptive 2-50Mbps.
 */
export default function optimizeSdpForLowLatency(sdp: string): string {
	let optimized = sdp;

	optimized = setSdpMediaBitrate(optimized, 'video', 50000000);
	optimized = addGoogleBitrateParams(optimized);
	optimized = preferOpenCodecs(optimized);

	return optimized;
}

function addGoogleBitrateParams(sdp: string): string {
	const lines = sdp.split('\n');
	const result: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		result.push(lines[i]);
		if (lines[i].startsWith('m=video')) {
			result.push('a=x-google-min-bitrate=2000');
			result.push('a=x-google-start-bitrate=5000');
			result.push('a=x-google-max-bitrate=50000');
		}
	}

	return result.join('\n');
}

function preferOpenCodecs(sdp: string): string {
	const lines = sdp.split('\n');
	const result: string[] = [...lines];

	const codecOrder = ['AV1', 'VP9', 'VP8', 'H264'];
	const codecPriority = new Map<string, number>();

	for (let i = 0; i < result.length; i++) {
		const match = result[i].match(/^a=rtpmap:(\d+)\s+(\w+)/);
		if (match) {
			const pt = match[1];
			const codecName = match[2].toUpperCase();
			for (let j = 0; j < codecOrder.length; j++) {
				if (codecName === codecOrder[j]) {
					codecPriority.set(pt, j);
					break;
				}
			}
		}
	}

	if (codecPriority.size === 0) return sdp;

	for (let i = 0; i < result.length; i++) {
		if (result[i].startsWith('m=video')) {
			const parts = result[i].split(' ');
			const payloadTypes = parts.slice(3);

			payloadTypes.sort((a, b) => {
				const pa = codecPriority.get(a);
				const pb = codecPriority.get(b);
				if (pa !== undefined && pb !== undefined) return pa - pb;
				if (pa !== undefined) return -1;
				if (pb !== undefined) return 1;
				return 0;
			});

			result[i] = `m=video ${parts[1]} ${parts[2]} ${payloadTypes.join(' ')}`;
		}
	}

	return result.join('\n');
}
