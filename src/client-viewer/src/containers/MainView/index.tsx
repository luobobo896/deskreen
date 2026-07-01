import { useEffect, useState, useCallback } from 'react';
import { Grid } from 'react-flexbox-grid';
import {
	Button,
	Card,
	Elevation,
	FormGroup,
	InputGroup,
	Intent,
	H3,
	Text,
} from '@blueprintjs/core';
import screenfull from 'screenfull';
import './index.css';
import PeerConnection from '../../features/PeerConnection';
import {
	VideoQuality,
	type VideoQualityType,
} from '../../features/VideoAutoQualityOptimizer/VideoQualityEnum';
import ErrorDialog from '../../components/ErrorDialog';
import {
	ErrorMessage,
	type ErrorMessageType,
} from '../../components/ErrorDialog/ErrorMessageEnum';
import ConnectionPropmpts from '../../containers/ConnectionPrompts';
import PlayerView from '../../containers/PlayerView';
import handleSetVideoQuality from './handleSetVideoQuality';
import { DUMMY_MY_DEVICE_DETAILS } from '../../constants/appConstants';
import handleNoConnectionTimeout from './handleNoConnectionTimeout';
import handleCreatePeerConnection from './handleCreatePeerConnection';
import handleRemoveDanglingReactRevealContainer from './handleRemoveDanglingReactRevealContainer';
import handleDisplayingLoadingSharingIconLoop from './handleDisplayingLoadingSharingIconLoop';
import { ScreenSharingSource } from '../../features/PeerConnection/ScreenSharingSourceEnum';
import ConnectionIcon from './ConnectionIconEnum';
import { LoadingSharingIconEnum } from './LoadingSharingIconEnum';
import { useScreenViewingTracker } from './useScreenViewingTracker';

function MainView() {
	const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

	const [promptStep, setPromptStep] = useState(1);
	const [dialogErrorMessage, setDialogErrorMessage] =
		useState<ErrorMessageType>(ErrorMessage.UNKNOWN_ERROR);
	const [connectionIconType, setConnectionIconType] =
		useState<ConnectionIconType>(ConnectionIcon.FEED);
	const [myDeviceDetails, setMyDeviceDetails] = useState<DeviceDetails>(
		DUMMY_MY_DEVICE_DETAILS,
	);

	const [playing, setPlaying] = useState(true);
	const [url, setUrl] = useState<MediaStream | null>(null);
	const [screenSharingSourceType, setScreenSharingSourceType] =
		useState<ScreenSharingSourceType>(ScreenSharingSource.SCREEN);
	const [isWithControls, setIsWithControls] = useState(true); // Use native <video> by default — better WebRTC MediaStream compatibility
	const [isShownTextPrompt, setIsShownTextPrompt] = useState(false);
	const [isShownLoadingSharingIcon, setIsShownLoadingSharingIcon] =
		useState(false);
	const [loadingSharingIconType, setLoadingSharingIconType] =
		useState<LoadingSharingIconType>(LoadingSharingIconEnum.DESKTOP);
	const [videoQuality, setVideoQuality] = useState<VideoQualityType>(
		VideoQuality.Q_100_PERCENT,
	);
	const [peer, setPeer] = useState<undefined | PeerConnection>();
	const [connectionRoomId, setConnectionRoomId] = useState<string>('');
	const [roomInputValue, setRoomInputValue] = useState('');
	const [isRoomSubmitted, setIsRoomSubmitted] = useState(false);

	const handleRoomSubmit = useCallback(() => {
		const trimmed = roomInputValue.trim();
		if (trimmed) {
			setConnectionRoomId(trimmed);
			setIsRoomSubmitted(true);
		}
	}, [roomInputValue]);

	const handleRoomKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				handleRoomSubmit();
			}
		},
		[handleRoomSubmit],
	);

	useEffect(() => {
		const { pathname } = window.location;
		const normalizedPath = pathname.startsWith('/')
			? pathname.slice(1)
			: pathname;
		const extractedRoomId = normalizedPath.split('/').filter(Boolean)[0] || '';

		if (extractedRoomId !== '') {
			setConnectionRoomId(extractedRoomId);
			setIsRoomSubmitted(true);
			return;
		}

		// No room ID in URL — show input form
		setConnectionRoomId('');
		setIsRoomSubmitted(false);
	}, []);

	useEffect(handleSetVideoQuality(videoQuality, peer), [videoQuality, peer]);

	useEffect(handleNoConnectionTimeout(myDeviceDetails, setIsErrorDialogOpen), [
		myDeviceDetails,
	]);

	useEffect(
		handleCreatePeerConnection({
			peer,
			connectionRoomId,
			setMyDeviceDetails,
			setConnectionIconType,
			setIsShownTextPrompt,
			setPromptStep,
			setScreenSharingSourceType,
			setDialogErrorMessage,
			setIsErrorDialogOpen,
			setUrl,
			setPeer,
		}),
		[connectionRoomId],
	);

	const handlePlayPause = useCallback(() => {
		setPlaying(!playing);
	}, [playing]);

	useEffect(handleRemoveDanglingReactRevealContainer(url), [url]);

	useEffect(
		handleDisplayingLoadingSharingIconLoop({
			promptStep,
			url,
			setIsShownLoadingSharingIcon,
			loadingSharingIconType,
			isShownLoadingSharingIcon,
			setLoadingSharingIconType,
		}),
		[promptStep, url],
	);

	useScreenViewingTracker({
		streamUrl: url,
		isPlaying: playing,
		isErrorDialogOpen,
		dialogErrorMessage,
	});

	return (
		<Grid>
			{!isRoomSubmitted && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100vh',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: '#1c2127',
						zIndex: 100,
					}}
				>
					<Card
						elevation={Elevation.FOUR}
						style={{
							maxWidth: 480,
							width: '90%',
							padding: 32,
							textAlign: 'center',
						}}
					>
						<img
							src="/img/logo512.png"
							alt="Deskreen"
							style={{ height: 80, marginBottom: 16 }}
						/>
						<H3 style={{ marginBottom: 8 }}>Deskreen Viewer</H3>
						<Text className="bp3-text-muted" style={{ marginBottom: 24 }}>
							Enter the connection code shown on the host computer
						</Text>
						<FormGroup
							label="Connection Code"
							labelFor="room-input"
							style={{ marginBottom: 16 }}
						>
							<InputGroup
								id="room-input"
								large
								placeholder="e.g. 100391"
								value={roomInputValue}
								onChange={(e) => setRoomInputValue(e.target.value)}
								onKeyDown={handleRoomKeyDown}
								intent={Intent.PRIMARY}
								autoFocus
								style={{ textAlign: 'center', fontSize: 20 }}
							/>
						</FormGroup>
						<Button
							intent={Intent.PRIMARY}
							large
							fill
							onClick={handleRoomSubmit}
							disabled={!roomInputValue.trim()}
							style={{ height: 44, fontSize: 16 }}
						>
							Connect
						</Button>
					</Card>
				</div>
			)}
			<ConnectionPropmpts
				myDeviceDetails={myDeviceDetails}
				isShownTextPrompt={isShownTextPrompt}
				promptStep={promptStep}
				connectionIconType={connectionIconType}
				spinnerIconType={loadingSharingIconType}
				isShownSpinnerIcon={isShownLoadingSharingIcon}
			/>
			<PlayerView
				streamUrl={url}
				screenSharingSourceType={screenSharingSourceType}
				setIsWithControls={setIsWithControls}
				isWithControls={isWithControls}
				handlePlayPause={handlePlayPause}
				isPlaying={playing}
				setPlaying={setPlaying}
				setVideoQuality={setVideoQuality}
				videoQuality={videoQuality}
			/>
			<ErrorDialog
				errorMessage={dialogErrorMessage}
				isOpen={isErrorDialogOpen}
				setIsOpen={setIsErrorDialogOpen}
			/>
		</Grid>
	);
}

export default MainView;
