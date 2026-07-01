import { IpcEvents } from '../common/IpcEvents.enum';
import { getDeskreenGlobal } from '../main/helpers/getDeskreenGlobal';
import { deskreenApp } from '../main';
import { Device } from '../common/Device';

export function onDeviceConnectedCallback(device: Device): void {
	const deskreenGlobal = getDeskreenGlobal();
	// Multi-device support: always accept new connections
	deskreenGlobal.connectedDevicesService.setPendingConnectionDevice(device);
	deskreenApp.mainWindow?.webContents.send(
		IpcEvents.SetPendingConnectionDevice,
		device,
	);
}
