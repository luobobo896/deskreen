export default (
	peerConnection: PeerConnection,
	payload: { users: PartnerPeerUser[] },
): void => {
	// 多 viewer 场景：找到非 owner 的 viewer 作为 partner（过滤掉自己和 owner）
	const viewerPartner = (payload.users || []).find(
		(user: PartnerPeerUser) =>
			user.username !== peerConnection.user.username && !user.isOwner,
	);

	if (!viewerPartner) return;

	[peerConnection.partner] = [viewerPartner];

	if (peerConnection.partner.username !== '') {
		peerConnection.toggleLockRoom(true);
		peerConnection.emitUserEnter();
	}
};
