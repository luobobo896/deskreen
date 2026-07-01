import setSdpMediaBitrate from './setSdpMediaBitrate';

/**
 * Optimize SDP for minimum latency + maximum compression efficiency.
 * 
 * Codec priority (all open/royalty-free):
 *   1. AV1  — best compression (30% better than VP9, 50% better than H264)
 *   2. VP9  — excellent compression, broad Chrome support
 *   3. VP8  — good compression, universal WebRTC support
 *   4. H264 — fallback (hardware-accelerated, broad compatibility)
 *
 * Bitrate strategy: adaptive 2-50Mbps, encoder auto-adjusts based on content.
 */
export default function optimizeSdpForLowLatency(sdp: string): string {
	let optimized = sdp;

	// 1. Set video bitrate ceiling to 50Mbps (LAN, effectively uncapped)
	optimized = setSdpMediaBitrate(optimized, 'video', 50000000);

	// 2. Add Chrome adaptive bitrate hints
	optimized = addGoogleBitrateParams(optimized);

	// 3. Reorder codecs: AV1 > VP9 > VP8 > H264
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

/**
 * Reorder payload types in m=video line to prefer open codecs.
 * AV1 (best compression) → VP9 → VP8 → H264 (fallback).
 * The browser will pick the first mutually-supported codec.
 */
function preferOpenCodecs(sdp: string): string {
	const lines = sdp.split('\n');
	const result: string[] = [...lines];

	// Build codec priority map: codec name → priority (lower = better)
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

	// Reorder m=video payload types by codec priority
	for (let i = 0; i < result.length; i++) {
		if (result[i].startsWith('m=video')) {
			const parts = result[i].split(' ');
			const payloadTypes = parts.slice(3);

			// Sort: known codecs by priority, unknown codecs last
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
