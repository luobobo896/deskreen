import optimizeSdpForLowLatency from './optimizeSdpForLowLatency';

export default (sdp: string): string => {
	return optimizeSdpForLowLatency(sdp);
};
