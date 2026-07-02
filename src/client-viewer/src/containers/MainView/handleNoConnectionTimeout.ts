import { DUMMY_MY_DEVICE_DETAILS } from '../../constants/appConstants';
import type PeerConnection from '../../features/PeerConnection';

// 10s 内若仍无设备信息，需进一步判断 socket 状态：
//   - socket 仍连接中 → 说明正在等待 app 端授权，保持"等待连接中" UI，不弹错
//   - socket 未连接  → 真正失败，弹错
// 60s 兜底超时：防止 socket 假死导致永久卡在"等待连接中"
const SOFT_TIMEOUT = 10000;
const HARD_TIMEOUT = 60000;

export default (
	myDeviceDetails: DeviceDetails,
	setIsErrorDialogOpen: (_: boolean) => void,
	peer: PeerConnection | undefined,
) => {
	return () => {
		const softTimeout = setTimeout(() => {
			if (myDeviceDetails === DUMMY_MY_DEVICE_DETAILS) {
				// socket 仍连接 → 等待 app 端授权中，不弹错
				if (peer?.socket?.connected) {
					return;
				}
				setIsErrorDialogOpen(true);
			}
		}, SOFT_TIMEOUT);

		const hardTimeout = setTimeout(() => {
			if (myDeviceDetails === DUMMY_MY_DEVICE_DETAILS) {
				// 60s 仍未拿到设备信息 → 真正失败
				setIsErrorDialogOpen(true);
			}
		}, HARD_TIMEOUT);

		return () => {
			clearTimeout(softTimeout);
			clearTimeout(hardTimeout);
		};
	};
};
