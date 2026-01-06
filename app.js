function setupPendingApprovalSubscription(sessionId) {
    if (appState.pendingSubscription) {
        supabaseClient.removeChannel(appState.pendingSubscription);
    }
    
    appState.pendingSubscription = supabaseClient
        .channel('pending-approval-channel-' + sessionId)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'sessions',
                filter: 'session_id=eq.' + sessionId
            },
            async (payload) => {
                console.log('Pending approval payload:', payload);
                
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    const session = payload.new || {};
                    
                    console.log("Guest ID in session:", session.guest_id, "Our ID:", appState.userId);
                    
                    if (session.guest_id === appState.userId) {
                        console.log("Guest has been approved!");
                        
                        // Check if we've already processed this approval
                        if (appState.currentSessionId === sessionId && appState.isConnected) {
                            return; // Already connected, ignore duplicate update
                        }
                        
                        appState.currentSessionId = sessionId;
                        appState.isConnected = true;
                        
                        localStorage.setItem('writeToMe_session', JSON.stringify({
                            isHost: appState.isHost,
                            userName: appState.userName,
                            userId: appState.userId,
                            sessionId: appState.sessionId,
                            connectionTime: appState.connectionTime,
                            soundEnabled: appState.soundEnabled
                        }));
                        
                        updateUIAfterConnection();
                        setupRealtimeSubscriptions();
                        await loadChatHistory();
                        
                        if (appState.pendingSubscription) {
                            supabaseClient.removeChannel(appState.pendingSubscription);
                            appState.pendingSubscription = null;
                        }
                        
                        // Only add join message if this is the first connection
                        // and we're not already in an active chat
                        if (!appState.isViewingHistory) {
                            await saveMessageToDB('System', `${appState.userName} has joined the chat.`);
                        }
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('Pending approval subscription status:', status);
        });
}
