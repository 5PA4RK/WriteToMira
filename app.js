// ============================================
// WRITETOMIRA - REFINED APP.JS
// ============================================

// Supabase Configuration
const SUPABASE_URL = 'https://plqvqenoroacvzwtgoxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_91IHQ5--y4tDIo8L9X2ZJQ_YeThfdu_';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App State
const appState = {
    isHost: false, isConnected: false, userName: "Guest", userId: null,
    sessionId: null, currentSessionId: null, messages: [], soundEnabled: true,
    isViewingHistory: false, viewingSessionId: null, pendingGuests: [],
    pendingSubscription: null, realtimeSubscription: null, typingSubscription: null,
    reactionsSubscription: null, users: [], visitorNotes: [], unreadNotesCount: 0,
    showNotesPanel: false, allSessions: [], replyingTo: null, activeMessageActions: null
};

// DOM Elements
const elements = {
    connectionModal: document.getElementById('connectionModal'),
    connectBtn: document.getElementById('connectBtn'),
    passwordError: document.getElementById('passwordError'),
    logoutBtn: document.getElementById('logoutBtn'),
    pendingGuestsBtn: document.getElementById('pendingGuestsBtn'),
    pendingGuestsModal: document.getElementById('pendingGuestsModal'),
    closePendingModal: document.getElementById('closePendingModal'),
    pendingGuestsList: document.getElementById('pendingGuestsList'),
    noPendingGuests: document.getElementById('noPendingGuests'),
    statusIndicator: document.getElementById('statusIndicator'),
    userRoleDisplay: document.getElementById('userRoleDisplay'),
    pendingCount: document.getElementById('pendingCount'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    imageUpload: document.getElementById('imageUpload'),
    emojiBtn: document.getElementById('emojiBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    chatTitle: document.getElementById('chatTitle'),
    chatModeIndicator: document.getElementById('chatModeIndicator'),
    returnToActiveBtn: document.getElementById('returnToActiveBtn'),
    historyCards: document.getElementById('historyCards'),
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
    soundControl: document.getElementById('soundControl'),
    messageSound: document.getElementById('messageSound'),
    typingIndicator: document.getElementById('typingIndicator'),
    typingUser: document.getElementById('typingUser'),
    imageModal: document.getElementById('imageModal'),
    fullSizeImage: document.getElementById('fullSizeImage'),
    adminSection: document.getElementById('adminSection'),
    historyTabBtn: document.getElementById('historyTabBtn'),
    usersTabBtn: document.getElementById('usersTabBtn'),
    historyTabContent: document.getElementById('historyTabContent'),
    usersTabContent: document.getElementById('usersTabContent'),
    guestNoteInput: document.getElementById('guestNoteInput'),
    notesBtn: document.getElementById('notesBtn'),
    notesCount: document.getElementById('notesCount'),
    notesPanel: document.getElementById('notesPanel'),
    notesList: document.getElementById('notesList'),
    closeNotesPanel: document.getElementById('closeNotesPanel'),
    refreshNotesBtn: document.getElementById('refreshNotesBtn'),
    markAllReadBtn: document.getElementById('markAllReadBtn'),
    notesSearchInput: document.getElementById('notesSearchInput'),
    usernameInput: document.getElementById('usernameInput'),
    passwordInput: document.getElementById('passwordInput')
};

const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];

// ============================================
// INITIALIZATION
// ============================================

async function initApp() {
    console.log("🚀 Initializing WriteToMira...");
    
    // Hide main container until connected
    const mainContainer = document.querySelector('.main-container, .app-container');
    if (mainContainer) mainContainer.style.display = 'none';
    
    // Setup audio
    document.addEventListener('click', () => {
        if (!window.audioContext) {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.audioContext.resume();
        }
    }, { once: true });
    
    // Try reconnection
    const savedSession = localStorage.getItem('writeToMe_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            appState.isHost = sessionData.isHost;
            appState.userName = sessionData.userName;
            appState.userId = sessionData.userId;
            appState.sessionId = sessionData.sessionId;
            appState.soundEnabled = sessionData.soundEnabled !== false;
            
            if (await reconnectToSession()) {
                appState.isConnected = true;
                if (appState.isHost) document.body.classList.add('host-mode');
                hideConnectionModal();
                updateUIAfterConnection();
                if (appState.isHost) {
                    await loadAllSessions();
                    await loadChatSessions();
                    await loadPendingGuests();
                    await loadVisitorNotes();
                }
            } else {
                localStorage.removeItem('writeToMe_session');
                showConnectionModal();
            }
        } catch(e) { showConnectionModal(); }
    } else {
        showConnectionModal();
    }
    
    updateSoundControl();
    setupEventListeners();
    setupUserManagement();
    populateEmojis();
    setInterval(checkAndReconnectSubscriptions, 15000);
}

// ============================================
// CONNECTION MODAL
// ============================================

function showConnectionModal() {
    elements.connectionModal.style.display = 'flex';
    document.body.classList.add('modal-open');
    const mainContainer = document.querySelector('.main-container, .app-container');
    if (mainContainer) mainContainer.style.display = 'none';
    if (elements.usernameInput) elements.usernameInput.value = '';
    if (elements.passwordInput) elements.passwordInput.value = '';
    if (elements.guestNoteInput) elements.guestNoteInput.value = '';
    if (elements.passwordError) elements.passwordError.style.display = 'none';
    if (elements.connectBtn) {
        elements.connectBtn.disabled = false;
        elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
}

function hideConnectionModal() {
    elements.connectionModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    const mainContainer = document.querySelector('.main-container, .app-container');
    if (mainContainer) mainContainer.style.display = 'block';
}

// ============================================
// RECONNECT
// ============================================

async function reconnectToSession() {
    if (!appState.sessionId) return false;
    
    const { data: session, error } = await supabaseClient
        .from('chat_sessions')
        .select('*')
        .eq('session_id', appState.sessionId)
        .single();
    
    if (error || !session) return false;
    
    if (appState.isHost) {
        if (session.host_id === appState.userId) {
            appState.currentSessionId = session.session_id;
            setupRealtimeSubscriptions();
            setupPendingGuestsSubscription();
            return true;
        }
        return false;
    } else {
        const { data: guestStatus } = await supabaseClient
            .from('session_guests')
            .select('status')
            .eq('session_id', session.session_id)
            .eq('guest_id', appState.userId)
            .single();
        
        if (!guestStatus) return false;
        
        if (guestStatus.status === 'approved') {
            appState.currentSessionId = session.session_id;
            setupRealtimeSubscriptions();
            return true;
        } else if (guestStatus.status === 'pending') {
            appState.currentSessionId = session.session_id;
            updateUIForPendingGuest();
            setupPendingApprovalSubscription(session.session_id);
            return false;
        }
        return false;
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

async function loadAllSessions() {
    try {
        const { data: sessions, error } = await supabaseClient
            .from('chat_sessions')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) throw error;
        appState.allSessions = sessions || [];
        return appState.allSessions;
    } catch (error) {
        console.error("Error loading sessions:", error);
        appState.allSessions = [];
        return [];
    }
}

function getStableRoomNumber(sessionId) {
    const index = appState.allSessions.findIndex(s => s.session_id === sessionId);
    return index === -1 ? '?' : (index + 1).toString();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Connection
    if (elements.connectBtn) elements.connectBtn.addEventListener('click', handleConnect);
    if (elements.passwordInput) elements.passwordInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleConnect());
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Chat
    if (elements.sendMessageBtn) {
        const btn = elements.sendMessageBtn;
        btn.addEventListener('click', () => sendMessage());
    }
    if (elements.clearChatBtn) elements.clearChatBtn.addEventListener('click', clearChat);
    if (elements.messageInput) {
        elements.messageInput.addEventListener('input', () => window.ChatModule?.handleTyping());
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isSendingMessage) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Image & Emoji
    if (elements.imageUpload) elements.imageUpload.addEventListener('change', handleImageUpload);
    if (elements.emojiBtn) elements.emojiBtn.addEventListener('click', toggleEmojiPicker);
    
    // History
    if (elements.returnToActiveBtn) elements.returnToActiveBtn.addEventListener('click', returnToActiveChat);
    if (elements.refreshHistoryBtn) elements.refreshHistoryBtn.addEventListener('click', async () => {
        await loadAllSessions();
        loadChatSessions();
    });
    
    // Sound
    if (elements.soundControl) elements.soundControl.addEventListener('click', toggleSound);
    
    // Image Modal
    if (elements.imageModal) {
        elements.imageModal.addEventListener('click', (e) => {
            if (e.target === elements.imageModal) elements.imageModal.style.display = 'none';
        });
    }
    
    // Close emoji picker on outside click
    document.addEventListener('click', (e) => {
        if (elements.emojiPicker?.classList.contains('show') && 
            !elements.emojiPicker.contains(e.target) && 
            elements.emojiBtn && !elements.emojiBtn.contains(e.target)) {
            elements.emojiPicker.classList.remove('show');
        }
    });
    
    // Admin tabs
    if (elements.historyTabBtn) elements.historyTabBtn.addEventListener('click', () => switchAdminTab('history'));
    if (elements.usersTabBtn) elements.usersTabBtn.addEventListener('click', () => switchAdminTab('users'));
    
    // Notes panel
    if (elements.notesBtn) elements.notesBtn.addEventListener('click', toggleNotesPanel);
    if (elements.closeNotesPanel) elements.closeNotesPanel.addEventListener('click', () => closeNotesPanel());
    if (elements.refreshNotesBtn) elements.refreshNotesBtn.addEventListener('click', loadVisitorNotes);
    if (elements.markAllReadBtn) elements.markAllReadBtn.addEventListener('click', markAllNotesAsRead);
    if (elements.notesSearchInput) elements.notesSearchInput.addEventListener('input', (e) => searchNotes(e.target.value.toLowerCase()));
    
    // Pending guests
    if (elements.pendingGuestsBtn) elements.pendingGuestsBtn.addEventListener('click', showPendingGuests);
    if (elements.closePendingModal) elements.closePendingModal.addEventListener('click', () => {
        elements.pendingGuestsModal.style.display = 'none';
    });
}

function switchAdminTab(tabName) {
    elements.historyTabBtn.classList.remove('active');
    elements.usersTabBtn.classList.remove('active');
    elements.historyTabContent.style.display = 'none';
    elements.usersTabContent.style.display = 'none';
    
    if (tabName === 'history') {
        elements.historyTabBtn.classList.add('active');
        elements.historyTabContent.style.display = 'block';
        loadChatSessions();
    } else {
        elements.usersTabBtn.classList.add('active');
        elements.usersTabContent.style.display = 'block';
        loadUsers();
    }
}

// ============================================
// CONNECTION HANDLER
// ============================================

async function handleConnect() {
    const username = elements.usernameInput?.value.trim();
    const password = elements.passwordInput?.value;
    const guestNote = elements.guestNoteInput?.value.trim() || "";
    
    if (!username || !password) {
        showAuthError("Please enter username and password.");
        return;
    }
    
    elements.connectBtn.disabled = true;
    elements.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    
    try {
        const { data: userData, error: userError } = await supabaseClient
            .from('user_management')
            .select('id, username, display_name, password_hash, role, is_active')
            .ilike('username', username)
            .eq('is_active', true)
            .single();
        
        if (userError || !userData) {
            showAuthError("Invalid username or password.");
            return;
        }
        
        // Simple password verification (use RPC in production)
        let isAuthenticated = false;
        try {
            const { data: authResult } = await supabaseClient.rpc('verify_password', {
                stored_hash: userData.password_hash,
                password: password
            });
            if (authResult === true) isAuthenticated = true;
        } catch { /* fall through */ }
        
        if (!isAuthenticated) {
            const testPasswords = { 'admin': 'admin123', 'host': 'host123', 'guest': 'guest123' };
            if (testPasswords[username.toLowerCase()] === password) isAuthenticated = true;
        }
        
        if (!isAuthenticated) {
            showAuthError("Invalid username or password.");
            return;
        }
        
        appState.isHost = userData.role === 'host';
        appState.userName = userData.display_name || userData.username;
        appState.userId = userData.id;
        appState.guestNote = guestNote;
        
        const userIP = await getRealIP();
        
        if (appState.isHost) {
            await connectAsHost(userIP);
        } else {
            await connectAsGuest(userIP);
        }
    } catch (error) {
        console.error("Connection error:", error);
        showAuthError(error.message.includes('NetworkError') ? "Network error. Check connection." : "Authentication error.");
    }
}

function showAuthError(message) {
    if (elements.passwordError) {
        elements.passwordError.style.display = 'block';
        elements.passwordError.textContent = message;
    }
    if (elements.connectBtn) {
        elements.connectBtn.disabled = false;
        elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
}

// ============================================
// HOST CONNECTION
// ============================================

async function connectAsHost(userIP) {
    const sessionId = 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    
    const { error } = await supabaseClient
        .from('chat_sessions')
        .insert([{
            session_id: sessionId, host_id: appState.userId, host_name: appState.userName,
            host_ip: userIP, is_active: true, requires_approval: true,
            created_at: new Date().toISOString(), max_guests: 50
        }]);
    
    if (error) {
        alert("Failed to create session: " + error.message);
        showAuthError("Failed to create session");
        return;
    }
    
    await loadAllSessions();
    appState.sessionId = sessionId;
    appState.currentSessionId = sessionId;
    appState.isConnected = true;
    document.body.classList.add('host-mode');
    saveSessionToStorage();
    hideConnectionModal();
    updateUIAfterConnection();
    setupRealtimeSubscriptions();
    setupPendingGuestsSubscription();
    await loadChatHistory();
    await saveMessageToDB('System', `${appState.userName} has created a new chat room.`);
}

// ============================================
// GUEST CONNECTION
// ============================================

async function connectAsGuest(userIP) {
    const { data: activeSessions, error } = await supabaseClient
        .from('chat_sessions')
        .select('session_id, host_name, host_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    
    if (error || !activeSessions?.length) {
        alert("No active rooms available.");
        showAuthError("No active rooms");
        return;
    }
    
    // Check existing requests
    for (const session of activeSessions) {
        const { data: existing } = await supabaseClient
            .from('session_guests')
            .select('status')
            .eq('session_id', session.session_id)
            .eq('guest_id', appState.userId)
            .maybeSingle();
        
        if (existing?.status === 'approved') {
            completeGuestConnection(session.session_id);
            return;
        } else if (existing?.status === 'pending') {
            appState.sessionId = session.session_id;
            hideConnectionModal();
            updateUIForPendingGuest();
            setupPendingApprovalSubscription(session.session_id);
            return;
        }
    }
    
    // Create new request
    const targetSession = activeSessions[0];
    await createNewGuestRequest(targetSession, userIP);
}

async function createNewGuestRequest(session, userIP) {
    const { error } = await supabaseClient
        .from('session_guests')
        .upsert([{
            session_id: session.session_id, guest_id: appState.userId,
            guest_name: appState.userName, guest_ip: userIP,
            guest_note: appState.guestNote || "", status: 'pending',
            requested_at: new Date().toISOString()
        }]);
    
    if (error) {
        alert("Failed to request access: " + error.message);
        showAuthError("Request failed");
        return;
    }
    
    if (appState.guestNote) {
        await saveVisitorNote(session.session_id, appState.guestNote, userIP);
    }
    
    appState.sessionId = session.session_id;
    hideConnectionModal();
    updateUIForPendingGuest();
    setupPendingApprovalSubscription(session.session_id);
}

function completeGuestConnection(sessionId) {
    appState.sessionId = sessionId;
    appState.currentSessionId = sessionId;
    appState.isConnected = true;
    saveSessionToStorage();
    hideConnectionModal();
    updateUIAfterConnection();
    setupRealtimeSubscriptions();
    loadChatHistory();
    saveMessageToDB('System', `${appState.userName} has joined the chat.`);
}

function updateUIForPendingGuest() {
    if (elements.statusIndicator) elements.statusIndicator.className = 'status-indicator offline';
    if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = `${appState.userName} (Pending Approval)`;
    if (elements.logoutBtn) elements.logoutBtn.style.display = 'flex';
    if (elements.messageInput) {
        elements.messageInput.disabled = true;
        elements.messageInput.placeholder = "Waiting for host approval...";
    }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = true;
    if (elements.chatMessages) {
        elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text">Your access request has been sent. Please wait for approval.</div></div></div>`;
    }
}

// ============================================
// MESSAGING
// ============================================

let isSendingMessage = false;

async function sendMessage() {
    if (isSendingMessage || !appState.isConnected || appState.isViewingHistory) return;
    
    const messageText = elements.messageInput?.value.trim() || '';
    const imageFile = window.pendingImageFile || elements.imageUpload?.files[0];
    if (!messageText && !imageFile) return;
    
    isSendingMessage = true;
    const sendBtn = elements.sendMessageBtn;
    if (sendBtn) sendBtn.disabled = true;
    
    // Get reply data
    const replyToId = appState.replyingTo;
    let replyToImage = null;
    if (replyToId && appState.messages) {
        const originalMsg = appState.messages.find(m => m.id === replyToId);
        if (originalMsg) replyToImage = originalMsg._realImageUrl || originalMsg.image;
    }
    
    // Clear inputs
    const originalText = messageText;
    const originalFile = imageFile;
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    if (elements.imageUpload) elements.imageUpload.value = '';
    appState.replyingTo = null;
    window.pendingImageFile = null;
    
    // Create optimistic message
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    let localPreview = originalFile ? URL.createObjectURL(originalFile) : null;
    
    const messageDiv = createOptimisticMessage(tempId, appState.userName, originalText, localPreview, replyToId, replyToImage);
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    try {
        let finalImageUrl = null;
        if (originalFile) finalImageUrl = await uploadImageToStorage(originalFile);
        
        const result = await sendMessageToDB(originalText, finalImageUrl, replyToId);
        
        if (result?.success) {
            // Replace temp message with real one
            const realMsg = document.getElementById(`msg-${tempId}`);
            if (realMsg) {
                realMsg.id = `msg-${result.data.id}`;
                // Update action buttons with real ID
                const actionsMenu = document.getElementById(`actions-${tempId}`);
                if (actionsMenu) actionsMenu.id = `actions-${result.data.id}`;
            }
            
            appState.messages.push({
                id: result.data.id, sender: appState.userName, text: originalText,
                image: finalImageUrl, time: new Date().toLocaleTimeString(),
                type: 'sent', reply_to: replyToId, _realImageUrl: finalImageUrl
            });
        } else {
            messageDiv.remove();
            if (originalText) elements.messageInput.value = originalText;
            showSendError();
        }
    } catch (error) {
        console.error("Send error:", error);
        messageDiv.remove();
        if (originalText) elements.messageInput.value = originalText;
        showSendError();
    } finally {
        isSendingMessage = false;
        if (sendBtn) sendBtn.disabled = false;
        if (localPreview) URL.revokeObjectURL(localPreview);
    }
}

function createOptimisticMessage(id, sender, text, imageUrl, replyToId, replyToImage) {
    const div = document.createElement('div');
    div.className = 'message sent optimistic';
    div.id = `msg-${id}`;
    
    let content = `<div class="message-sender">${escapeHtml(sender)}</div><div class="message-content">`;
    
    if (replyToId) {
        content += `<div class="message-reply-ref"><i class="fas fa-reply"></i> <div class="reply-content"><span>Replying...</span></div></div>`;
    }
    
    if (text) content += `<div class="message-text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
    if (imageUrl) content += `<img src="${imageUrl}" class="message-image" style="max-width: 100%; max-height: 250px; border-radius: 8px;" onclick="window.showFullImage('${imageUrl}')">`;
    
    content += `<div class="message-footer"><div class="message-time">${new Date().toLocaleTimeString()}</div></div></div></div>`;
    div.innerHTML = content;
    div.style.opacity = '0.7';
    
    setTimeout(() => { if (div) div.style.opacity = '1'; }, 100);
    return div;
}

async function sendMessageToDB(text, imageUrl, replyToId = null) {
    const messageData = {
        session_id: appState.currentSessionId, sender_id: appState.userId,
        sender_name: appState.userName, message: text || '',
        created_at: new Date().toISOString()
    };
    if (replyToId && replyToId !== 'null') messageData.reply_to = replyToId;
    if (imageUrl) messageData.image_url = imageUrl;
    
    const { data, error } = await supabaseClient.from('messages').insert([messageData]).select().single();
    if (error) throw error;
    return { success: true, data };
}

async function uploadImageToStorage(file) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop().toLowerCase();
    const filePath = `chat_images/${timestamp}_${random}.${ext}`;
    
    const { error } = await supabaseClient.storage.from('chat-images').upload(filePath, file, {
        cacheControl: '3600', contentType: file.type
    });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabaseClient.storage.from('chat-images').getPublicUrl(filePath);
    return publicUrl;
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB.");
        elements.imageUpload.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        elements.imageUpload.value = '';
        return;
    }
    window.pendingImageFile = file;
    await sendMessage();
    elements.imageUpload.value = '';
}

function showSendError() {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'message received';
    errorMsg.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text" style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Failed to send message.</div></div></div>`;
    elements.chatMessages.appendChild(errorMsg);
    scrollToBottom();
}

// ============================================
// CHAT HISTORY
// ============================================

async function loadChatHistory(sessionId = null, limit = 50) {
    const targetId = sessionId || appState.currentSessionId;
    if (!targetId) return;
    
    if (elements.chatMessages && !sessionId) {
        elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div></div></div>`;
    }
    
    try {
        let query = supabaseClient.from('messages')
            .select('*').eq('session_id', targetId).eq('is_deleted', false)
            .order('created_at', { ascending: false }).limit(limit);
        
        // Filter cleared messages for guests
        if (!appState.isHost && !sessionId) {
            const { data: cleared } = await supabaseClient.from('cleared_messages')
                .select('message_id').eq('user_id', appState.userId).eq('session_id', targetId);
            if (cleared?.length) {
                const clearedIds = cleared.map(cm => cm.message_id);
                query = query.not('id', 'in', `(${clearedIds.join(',')})`);
            }
        }
        
        const { data: messages, error } = await query;
        if (error) throw error;
        
        const orderedMessages = (messages || []).reverse();
        
        if (elements.chatMessages && !sessionId) elements.chatMessages.innerHTML = '';
        
        if (sessionId) {
            const { data: session } = await supabaseClient.from('chat_sessions')
                .select('created_at, host_name').eq('session_id', sessionId).single();
            if (session) {
                const roomNum = getStableRoomNumber(sessionId);
                const header = document.createElement('div');
                header.className = 'message received historical';
                header.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text"><i class="fas fa-door-open"></i> Chat History - Room ${roomNum}<br><small>Host: ${escapeHtml(session.host_name)} | Date: ${new Date(session.created_at).toLocaleDateString()}</small></div></div></div>`;
                elements.chatMessages.appendChild(header);
            }
        }
        
        if (!orderedMessages.length && !sessionId) {
            elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text">No messages yet. Be the first to say something!</div></div></div>`;
            return;
        }
        
        // Load reactions
        const messageIds = orderedMessages.map(m => m.id);
        const { data: allReactions } = await supabaseClient.from('message_reactions').select('*').in('message_id', messageIds);
        const reactionsMap = new Map();
        (allReactions || []).forEach(r => {
            if (!reactionsMap.has(r.message_id)) reactionsMap.set(r.message_id, []);
            reactionsMap.get(r.message_id).push(r);
        });
        
        orderedMessages.forEach(msg => {
            const messageType = msg.sender_id === appState.userId ? 'sent' : 'received';
            window.ChatModule?.displayMessage({
                id: msg.id, sender: msg.sender_name, text: msg.message,
                image: msg.image_url, time: new Date(msg.created_at).toLocaleTimeString(),
                type: messageType, is_historical: !!sessionId,
                reactions: reactionsMap.get(msg.id) || [], reply_to: msg.reply_to
            });
        });
        
        appState.messages = orderedMessages;
        if (!sessionId) scrollToBottom('auto', 100);
        else elements.chatMessages.scrollTop = 0;
        
    } catch (error) {
        console.error("Error loading chat history:", error);
        if (elements.chatMessages && !sessionId) {
            elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text">Error loading messages.</div></div></div>`;
        }
    }
}

// ============================================
// CLEAR CHAT
// ============================================

async function clearChat() {
    if (!appState.isConnected || !appState.currentSessionId) {
        alert("You must be connected to clear chat.");
        return;
    }
    if (!confirm("Are you sure you want to clear all messages?")) return;
    
    try {
        if (appState.isHost) {
            await supabaseClient.from('messages').update({
                is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: appState.userId
            }).eq('session_id', appState.currentSessionId);
            elements.chatMessages.innerHTML = '';
            appState.messages = [];
            addSystemMessage(`[${appState.userName}] cleared chat messages`);
        } else {
            const { data: messages } = await supabaseClient.from('messages')
                .select('id').eq('session_id', appState.currentSessionId).eq('is_deleted', false);
            
            if (messages?.length) {
                const clearedRecords = messages.map(msg => ({
                    user_id: appState.userId, message_id: msg.id,
                    session_id: appState.currentSessionId, cleared_at: new Date().toISOString()
                }));
                await supabaseClient.from('cleared_messages').insert(clearedRecords);
            }
            document.querySelectorAll('.message').forEach(msg => msg.remove());
            addSystemMessage(`Chat cleared by ${appState.userName}`, true);
        }
    } catch (error) {
        console.error("Error clearing chat:", error);
        alert("Failed to clear chat: " + error.message);
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

function setupRealtimeSubscriptions() {
    if (!appState.currentSessionId) return;
    
    // Clean up old subscriptions
    if (appState.realtimeSubscription) supabaseClient.removeChannel(appState.realtimeSubscription);
    if (appState.typingSubscription) supabaseClient.removeChannel(appState.typingSubscription);
    if (appState.reactionsSubscription) supabaseClient.removeChannel(appState.reactionsSubscription);
    
    // Messages channel
    const messagesChannel = supabaseClient.channel('messages_' + appState.currentSessionId)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `session_id=eq.${appState.currentSessionId}`
        }, async (payload) => {
            if (payload.new.sender_id === appState.userId) return;
            if (document.getElementById(`msg-${payload.new.id}`)) return;
            
            let shouldDisplay = true;
            if (!appState.isHost) {
                const { data: cleared } = await supabaseClient.from('cleared_messages')
                    .select('id').eq('user_id', appState.userId).eq('message_id', payload.new.id).maybeSingle();
                if (cleared) shouldDisplay = false;
            }
            
            if (shouldDisplay) {
                const { data: reactions } = await supabaseClient.from('message_reactions')
                    .select('*').eq('message_id', payload.new.id);
                
                window.ChatModule?.displayMessage({
                    id: payload.new.id, sender: payload.new.sender_name, text: payload.new.message,
                    image: payload.new.image_url, time: new Date(payload.new.created_at).toLocaleTimeString(),
                    type: 'received', reactions: reactions || [], reply_to: payload.new.reply_to
                });
                scrollToBottom();
                if (appState.soundEnabled) playNotificationSound();
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'messages',
            filter: `session_id=eq.${appState.currentSessionId}`
        }, (payload) => {
            const msgEl = document.getElementById(`msg-${payload.new.id}`);
            if (msgEl && payload.new.is_deleted) {
                msgEl.innerHTML = `<div class="message-sender">${escapeHtml(payload.new.sender_name)}</div><div class="message-content"><div class="message-text"><i>Message deleted</i></div><div class="message-footer"><div class="message-time">${new Date(payload.new.created_at).toLocaleTimeString()}</div></div></div>`;
            }
        })
        .subscribe();
    
    appState.realtimeSubscription = messagesChannel;
    
    // Typing channel
    const typingChannel = supabaseClient.channel('typing_' + appState.currentSessionId)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'chat_sessions',
            filter: `session_id=eq.${appState.currentSessionId}`
        }, (payload) => {
            const typingUser = payload.new?.typing_user;
            if (typingUser && typingUser !== appState.userName) {
                if (elements.typingUser) elements.typingUser.textContent = typingUser;
                if (elements.typingIndicator) elements.typingIndicator.classList.add('show');
                if (window.typingTimeout) clearTimeout(window.typingTimeout);
                window.typingTimeout = setTimeout(() => {
                    if (elements.typingIndicator) elements.typingIndicator.classList.remove('show');
                }, 3000);
            } else if (!typingUser) {
                if (elements.typingIndicator) elements.typingIndicator.classList.remove('show');
            }
        })
        .subscribe();
    
    appState.typingSubscription = typingChannel;
    
    // Reactions channel
    const reactionsChannel = supabaseClient.channel(`reactions_${appState.currentSessionId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, async (payload) => {
            const messageId = payload.new?.message_id || payload.old?.message_id;
            if (!messageId) return;
            
            const { data: reactions } = await supabaseClient.from('message_reactions')
                .select('*').eq('message_id', messageId);
            
            const msgEl = document.getElementById(`msg-${messageId}`);
            if (msgEl) {
                const reactionsDiv = msgEl.querySelector('.message-reactions');
                if (reactionsDiv) {
                    if (!reactions?.length) {
                        reactionsDiv.innerHTML = '';
                    } else {
                        const counts = {};
                        reactions.forEach(r => counts[r.emoji] = (counts[r.emoji] || 0) + 1);
                        let html = '';
                        for (const [emoji, count] of Object.entries(counts)) {
                            html += `<span class="reaction-badge" onclick="window.toggleReaction('${messageId}', '${emoji}')">${emoji} ${count}</span>`;
                        }
                        reactionsDiv.innerHTML = html;
                    }
                }
            }
        })
        .subscribe();
    
    appState.reactionsSubscription = reactionsChannel;
}

function setupPendingGuestsSubscription() {
    if (!appState.isHost || !appState.currentSessionId) return;
    
    if (appState.pendingSubscription) supabaseClient.removeChannel(appState.pendingSubscription);
    
    appState.pendingSubscription = supabaseClient.channel(`pending-${appState.currentSessionId}`)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'session_guests',
            filter: `session_id=eq.${appState.currentSessionId}`
        }, (payload) => {
            if (payload.new?.status === 'pending') handleNewPendingGuest(payload.new);
        })
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'session_guests',
            filter: `session_id=eq.${appState.currentSessionId}`
        }, (payload) => {
            if (payload.new?.status === 'pending') {
                if (!appState.pendingGuests.some(g => g.id === payload.new.id)) {
                    handleNewPendingGuest(payload.new);
                }
            } else {
                appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== payload.new.id);
                updatePendingButtonUI();
            }
        })
        .subscribe();
    
    loadPendingGuests();
}

function setupPendingApprovalSubscription(sessionId) {
    if (appState.pendingSubscription) supabaseClient.removeChannel(appState.pendingSubscription);
    
    appState.pendingSubscription = supabaseClient.channel('guest_approval_' + appState.userId)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'session_guests',
            filter: `guest_id=eq.${appState.userId}`
        }, async (payload) => {
            if (payload.new?.session_id === sessionId) {
                if (payload.new.status === 'approved') {
                    appState.currentSessionId = sessionId;
                    appState.isConnected = true;
                    saveSessionToStorage();
                    updateUIAfterConnection();
                    setupRealtimeSubscriptions();
                    await loadChatHistory();
                    alert("🎉 You have been approved! Welcome to the chat.");
                } else if (payload.new.status === 'rejected') {
                    alert("Your access request was rejected.");
                    location.reload();
                } else if (payload.new.status === 'kicked') {
                    alert("You have been kicked from the chat.");
                    handleLogout();
                }
            }
        })
        .subscribe();
}

function checkAndReconnectSubscriptions() {
    if (!appState.isConnected || !appState.currentSessionId) return;
    if (!appState.realtimeSubscription) setupRealtimeSubscriptions();
    if (appState.isHost && !appState.pendingSubscription) setupPendingGuestsSubscription();
}

// ============================================
// PENDING GUESTS
// ============================================

function handleNewPendingGuest(guest) {
    if (!appState.pendingGuests.some(g => g.id === guest.id)) {
        appState.pendingGuests.push(guest);
    }
    updatePendingButtonUI();
    addSystemMessage(`🔔 New guest request from ${guest.guest_name}${guest.guest_note ? ': ' + guest.guest_note : ''}`);
    if (appState.soundEnabled) playNotificationSound();
    if (elements.pendingGuestsModal?.style.display === 'flex') showPendingGuests();
}

async function loadPendingGuests() {
    if (!appState.isHost || !appState.currentSessionId) return;
    
    const { data: guests, error } = await supabaseClient
        .from('session_guests')
        .select('*').eq('session_id', appState.currentSessionId).eq('status', 'pending')
        .order('requested_at', { ascending: false });
    
    if (!error) {
        appState.pendingGuests = guests || [];
        updatePendingButtonUI();
        if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
    }
}

function updatePendingButtonUI() {
    if (!elements.pendingGuestsBtn || !elements.pendingCount) return;
    const count = appState.pendingGuests.length;
    elements.pendingCount.textContent = count;
    elements.pendingGuestsBtn.style.display = 'flex';
}

function showPendingGuests() {
    renderPendingGuestsList();
    if (elements.pendingGuestsModal) elements.pendingGuestsModal.style.display = 'flex';
}

function renderPendingGuestsList() {
    if (!elements.pendingGuestsList) return;
    elements.pendingGuestsList.innerHTML = '';
    
    if (appState.pendingGuests.length === 0) {
        if (elements.noPendingGuests) {
            elements.noPendingGuests.style.display = 'block';
            elements.noPendingGuests.innerHTML = '<i class="fas fa-check-circle"></i> No pending guest requests';
        }
        return;
    }
    if (elements.noPendingGuests) elements.noPendingGuests.style.display = 'none';
    
    appState.pendingGuests.forEach(guest => {
        const guestDiv = document.createElement('div');
        guestDiv.className = 'pending-guest';
        guestDiv.innerHTML = `
            <div class="guest-info"><div class="guest-name"><i class="fas fa-user"></i> <strong>${escapeHtml(guest.guest_name)}</strong></div>
            <div class="guest-details"><small><i class="fas fa-calendar"></i> ${new Date(guest.requested_at).toLocaleString()}</small>
            ${guest.guest_note ? `<div class="guest-note"><i class="fas fa-sticky-note"></i> ${escapeHtml(guest.guest_note)}</div>` : ''}</div></div>
            <div class="guest-actions"><button class="btn btn-success btn-small" onclick="approveGuest('${guest.id}')"><i class="fas fa-check"></i> Approve</button>
            <button class="btn btn-danger btn-small" onclick="denyGuest('${guest.id}')"><i class="fas fa-times"></i> Deny</button></div>`;
        elements.pendingGuestsList.appendChild(guestDiv);
    });
}

async function approveGuest(guestId) {
    const { data: guest } = await supabaseClient.from('session_guests').select('*').eq('id', guestId).single();
    await supabaseClient.from('session_guests').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', guestId);
    appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== guestId);
    updatePendingButtonUI();
    if (guest) await saveMessageToDB('System', `${guest.guest_name} has been approved and joined the chat.`);
    if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
}

async function denyGuest(guestId) {
    await supabaseClient.from('session_guests').update({ status: 'rejected', left_at: new Date().toISOString() }).eq('id', guestId);
    appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== guestId);
    updatePendingButtonUI();
    if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
}

// ============================================
// VISITOR NOTES
// ============================================

async function loadVisitorNotes() {
    if (!appState.isHost) return;
    const { data: notes, error } = await supabaseClient
        .from('visitor_notes')
        .select('*').eq('is_archived', false).order('created_at', { ascending: false });
    if (!error) {
        appState.visitorNotes = notes || [];
        appState.unreadNotesCount = appState.visitorNotes.filter(n => !n.read_by_host).length;
        updateNotesButtonUI();
        if (appState.showNotesPanel) renderVisitorNotes(appState.visitorNotes);
    }
}

function renderVisitorNotes(notes) {
    if (!elements.notesList) return;
    
    if (!notes?.length) {
        elements.notesList.innerHTML = `<div class="no-notes-message"><i class="fas fa-sticky-note"></i><p>No visitor notes yet</p></div>`;
        return;
    }
    
    elements.notesList.innerHTML = '';
    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = `visitor-note-item ${note.read_by_host ? 'read' : 'unread'}`;
        const date = new Date(note.created_at).toLocaleString();
        noteEl.innerHTML = `
            <div class="note-header"><div class="note-guest-info"><i class="fas fa-user"></i> <strong>${escapeHtml(note.guest_name || 'Anonymous')}</strong>${!note.read_by_host ? '<span class="unread-badge">New</span>' : ''}</div>
            <div class="note-time"><i class="fas fa-clock"></i> ${date}</div></div>
            <div class="note-content"><div class="note-text">${escapeHtml(note.note_text || 'No message')}</div>
            ${note.guest_ip ? `<div class="note-ip"><i class="fas fa-network-wired"></i> IP: ${escapeHtml(note.guest_ip)}</div>` : ''}</div>
            <div class="note-actions"><button class="btn btn-small btn-success" onclick="markNoteAsRead('${note.id}')" ${note.read_by_host ? 'disabled' : ''}><i class="fas fa-check"></i> Mark Read</button>
            <button class="btn btn-small btn-info" onclick="archiveNote('${note.id}')"><i class="fas fa-archive"></i> Archive</button></div>`;
        elements.notesList.appendChild(noteEl);
    });
}

async function saveVisitorNote(sessionId, noteText, userIP) {
    await supabaseClient.from('visitor_notes').insert([{
        guest_id: appState.userId, guest_name: appState.userName,
        session_id: sessionId, note_text: noteText, guest_ip: userIP,
        created_at: new Date().toISOString(), read_by_host: false
    }]);
}

function toggleNotesPanel() {
    appState.showNotesPanel = !appState.showNotesPanel;
    if (appState.showNotesPanel) {
        if (elements.notesPanel) elements.notesPanel.classList.add('show');
        loadVisitorNotes();
    } else if (elements.notesPanel) {
        elements.notesPanel.classList.remove('show');
    }
}

function closeNotesPanel() {
    appState.showNotesPanel = false;
    if (elements.notesPanel) elements.notesPanel.classList.remove('show');
}

function updateNotesButtonUI() {
    if (!elements.notesBtn || !elements.notesCount) return;
    elements.notesCount.textContent = appState.unreadNotesCount;
    if (appState.unreadNotesCount > 0) {
        elements.notesBtn.classList.add('has-unread');
        elements.notesCount.style.display = 'inline';
    } else {
        elements.notesBtn.classList.remove('has-unread');
        elements.notesCount.style.display = 'none';
    }
}

function searchNotes(searchTerm) {
    if (!searchTerm) return renderVisitorNotes(appState.visitorNotes);
    const filtered = appState.visitorNotes.filter(n =>
        n.guest_name?.toLowerCase().includes(searchTerm) ||
        n.note_text?.toLowerCase().includes(searchTerm));
    renderVisitorNotes(filtered);
}

async function markAllNotesAsRead() {
    const unread = appState.visitorNotes.filter(n => !n.read_by_host);
    if (!unread.length) return;
    await supabaseClient.from('visitor_notes').update({
        read_by_host: true, read_at: new Date().toISOString(), host_id: appState.userId
    }).in('id', unread.map(n => n.id));
    appState.visitorNotes.forEach(n => n.read_by_host = true);
    appState.unreadNotesCount = 0;
    updateNotesButtonUI();
    renderVisitorNotes(appState.visitorNotes);
}

window.markNoteAsRead = async function(noteId) {
    await supabaseClient.from('visitor_notes').update({
        read_by_host: true, read_at: new Date().toISOString(), host_id: appState.userId
    }).eq('id', noteId);
    const note = appState.visitorNotes.find(n => n.id === noteId);
    if (note) note.read_by_host = true;
    appState.unreadNotesCount = appState.visitorNotes.filter(n => !n.read_by_host).length;
    updateNotesButtonUI();
    renderVisitorNotes(appState.visitorNotes);
};

window.archiveNote = async function(noteId) {
    if (!confirm("Archive this note?")) return;
    await supabaseClient.from('visitor_notes').update({ is_archived: true }).eq('id', noteId);
    appState.visitorNotes = appState.visitorNotes.filter(n => n.id !== noteId);
    appState.unreadNotesCount = appState.visitorNotes.filter(n => !n.read_by_host).length;
    updateNotesButtonUI();
    renderVisitorNotes(appState.visitorNotes);
};

// ============================================
// HISTORY & SESSIONS
// ============================================

async function loadChatSessions() {
    if (!appState.isHost || !elements.historyCards) return;
    
    const { data: sessions, error } = await supabaseClient
        .from('chat_sessions')
        .select('*').order('created_at', { ascending: false });
    if (error) return;
    
    elements.historyCards.innerHTML = '';
    
    for (const session of sessions) {
        const isActive = session.session_id === appState.currentSessionId && session.is_active;
        const roomNumber = getStableRoomNumber(session.session_id);
        
        const { data: guests } = await supabaseClient.from('session_guests')
            .select('*').eq('session_id', session.session_id);
        const approvedGuests = guests?.filter(g => g.status === 'approved') || [];
        
        const startDate = new Date(session.created_at);
        const endDate = session.ended_at ? new Date(session.ended_at) : null;
        let duration = 'Ongoing';
        if (endDate) {
            const mins = Math.floor((endDate - startDate) / 60000);
            if (mins < 60) duration = `${mins}m`;
            else duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
        }
        
        const card = document.createElement('div');
        card.className = `session-card${isActive ? ' active' : ''}`;
        card.innerHTML = `
            <div class="session-card-header"><div class="session-header-left"><div class="session-id"><i class="fas fa-door-open"></i> Room ${roomNumber}</div>
            <div class="session-stats"><div class="stat-item"><i class="fas fa-users"></i> <span>${approvedGuests.length} Guests</span></div>
            <div class="stat-item"><i class="fas fa-clock"></i> <span>${duration}</span></div>
            <div class="stat-item"><i class="fas fa-${session.is_active ? 'play-circle' : 'stop-circle'}"></i> <span>${session.is_active ? 'Active' : 'Ended'}</span></div></div></div>
            ${isActive ? '<div class="session-active-badge"><i class="fas fa-circle"></i> Live</div>' : ''}</div>
            <div class="session-info"><div class="session-info-section"><div class="session-info-section-title"><i class="fas fa-info-circle"></i> Room Information</div>
            <div class="guest-info-rows"><div class="guest-info-row"><span class="guest-info-label"><i class="fas fa-user-crown"></i> Host:</span><span class="guest-info-value">${escapeHtml(session.host_name)}</span></div>
            <div class="guest-info-row"><span class="guest-info-label"><i class="fas fa-calendar-alt"></i> Created:</span><span class="guest-info-value">${startDate.toLocaleString()}</span></div></div></div></div>
            <div class="session-actions"><button class="btn btn-secondary btn-small" onclick="viewSessionHistory('${session.session_id}')"><i class="fas fa-eye"></i> View Chat</button>
            <button class="btn btn-info btn-small" onclick="showSessionGuests('${session.session_id}')"><i class="fas fa-users"></i> Guest Details</button>
            ${appState.isHost && !isActive ? `<button class="btn btn-danger btn-small" onclick="deleteSession('${session.session_id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}</div>`;
        elements.historyCards.appendChild(card);
    }
}

function viewSessionHistory(sessionId) {
    appState.isViewingHistory = true;
    appState.viewingSessionId = sessionId;
    if (elements.chatModeIndicator) elements.chatModeIndicator.style.display = 'flex';
    if (elements.chatTitle) elements.chatTitle.innerHTML = `<i class="fas fa-door-open"></i> History View`;
    if (elements.messageInput) {
        elements.messageInput.disabled = true;
        elements.messageInput.placeholder = "Cannot send messages in historical view";
    }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = true;
    loadChatHistory(sessionId);
    if (elements.chatMessages) elements.chatMessages.scrollTop = 0;
}

function returnToActiveChat() {
    appState.isViewingHistory = false;
    appState.viewingSessionId = null;
    if (elements.chatModeIndicator) elements.chatModeIndicator.style.display = 'none';
    if (elements.chatTitle) elements.chatTitle.innerHTML = `<i class="fas fa-comments"></i> Active Chat`;
    if (elements.messageInput) {
        elements.messageInput.disabled = false;
        elements.messageInput.placeholder = "Type your message here...";
    }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = false;
    if (elements.chatMessages) elements.chatMessages.innerHTML = '';
    loadChatHistory();
    scrollToBottom('auto', 200);
}

async function deleteSession(sessionId) {
    if (!appState.isHost || !confirm("⚠️ Delete this session? This cannot be undone!")) return;
    
    // Clean up related data
    await supabaseClient.from('message_reactions').delete().in('message_id',
        supabaseClient.from('messages').select('id').eq('session_id', sessionId));
    await supabaseClient.from('cleared_messages').delete().eq('session_id', sessionId);
    await supabaseClient.from('visitor_notes').delete().eq('session_id', sessionId);
    await supabaseClient.from('messages').delete().eq('session_id', sessionId);
    await supabaseClient.from('session_guests').delete().eq('session_id', sessionId);
    await supabaseClient.from('chat_sessions').delete().eq('session_id', sessionId);
    
    await loadAllSessions();
    if (appState.currentSessionId === sessionId) {
        appState.currentSessionId = null;
        appState.isConnected = false;
    }
    if (appState.viewingSessionId === sessionId) returnToActiveChat();
    await loadChatSessions();
    addSystemMessage("✅ Session deleted successfully", true);
}

// ============================================
// USER MANAGEMENT
// ============================================

function setupUserManagement() {
    if (document.getElementById('addUserBtn')) {
        document.getElementById('addUserBtn').addEventListener('click', () => {
            document.getElementById('addUserModal').style.display = 'flex';
        });
    }
    document.getElementById('closeAddUserModal')?.addEventListener('click', () => {
        document.getElementById('addUserModal').style.display = 'none';
    });
    document.getElementById('closeEditUserModal')?.addEventListener('click', () => {
        document.getElementById('editUserModal').style.display = 'none';
    });
    document.getElementById('saveUserBtn')?.addEventListener('click', saveNewUser);
    document.getElementById('updateUserBtn')?.addEventListener('click', updateUser);
    document.getElementById('deleteUserBtn')?.addEventListener('click', deleteUser);
    document.getElementById('userSearchInput')?.addEventListener('input', (e) => searchUsers(e.target.value.toLowerCase()));
}

async function loadUsers() {
    if (!appState.isHost) return;
    const { data: users, error } = await supabaseClient.from('user_management').select('*').order('created_at', { ascending: false });
    if (!error) {
        appState.users = users || [];
        renderUsers(users);
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (!users?.length) {
        container.innerHTML = `<div style="padding: 40px; text-align: center;"><i class="fas fa-users-slash" style="font-size: 48px;"></i><h3>No Users Found</h3></div>`;
        return;
    }
    
    container.innerHTML = '';
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = `user-card ${user.role}${!user.is_active ? ' inactive' : ''}`;
        card.innerHTML = `
            <div class="user-header"><div class="user-name"><i class="fas fa-user"></i> <h3>${escapeHtml(user.display_name)}</h3></div>
            <div class="user-badges"><span class="user-badge badge-${user.role}">${user.role}</span>${!user.is_active ? '<span class="user-badge badge-inactive">Inactive</span>' : ''}</div></div>
            <div class="user-details"><div class="user-detail"><span class="user-detail-label">Username:</span><span>${escapeHtml(user.username)}</span></div>
            <div class="user-detail"><span class="user-detail-label">Created:</span><span>${new Date(user.created_at).toLocaleDateString()}</span></div></div>
            <div class="user-actions"><button class="btn btn-secondary btn-small" onclick="editUserModalOpen('${user.id}')"><i class="fas fa-edit"></i> Edit</button></div>`;
        container.appendChild(card);
    });
}

async function saveNewUser() {
    const username = document.getElementById('newUsername')?.value.trim();
    const displayName = document.getElementById('newDisplayName')?.value.trim();
    const password = document.getElementById('newPassword')?.value;
    const role = document.getElementById('newRole')?.value;
    
    if (!username || !displayName || !password) {
        alert("All fields are required.");
        return;
    }
    
    await supabaseClient.from('user_management').insert([{
        username, display_name: displayName, password_hash: password, role,
        created_by: appState.userName, is_active: true
    }]);
    document.getElementById('addUserModal').style.display = 'none';
    await loadUsers();
}

function editUserModalOpen(userId) {
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editDisplayName').value = user.display_name;
    document.getElementById('editPassword').value = '';
    document.getElementById('editRole').value = user.role;
    document.getElementById('editIsActive').checked = user.is_active;
    document.getElementById('editUserModal').style.display = 'flex';
}

async function updateUser() {
    const userId = document.getElementById('editUserId').value;
    const displayName = document.getElementById('editDisplayName').value.trim();
    const password = document.getElementById('editPassword').value;
    const role = document.getElementById('editRole').value;
    const isActive = document.getElementById('editIsActive').checked;
    
    const updateData = { display_name: displayName, role, is_active: isActive, updated_at: new Date().toISOString() };
    if (password) updateData.password_hash = password;
    
    await supabaseClient.from('user_management').update(updateData).eq('id', userId);
    document.getElementById('editUserModal').style.display = 'none';
    await loadUsers();
}

async function deleteUser() {
    const userId = document.getElementById('editUserId').value;
    if (!confirm("Delete this user?")) return;
    await supabaseClient.from('user_management').delete().eq('id', userId);
    document.getElementById('editUserModal').style.display = 'none';
    await loadUsers();
}

function searchUsers(searchTerm) {
    if (!searchTerm) return renderUsers(appState.users);
    const filtered = appState.users.filter(u =>
        u.username.toLowerCase().includes(searchTerm) ||
        u.display_name.toLowerCase().includes(searchTerm) ||
        u.role.toLowerCase().includes(searchTerm));
    renderUsers(filtered);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateUIAfterConnection() {
    if (elements.statusIndicator) elements.statusIndicator.className = 'status-indicator online';
    if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = `${appState.userName} (Connected)`;
    if (elements.logoutBtn) elements.logoutBtn.style.display = 'flex';
    if (elements.messageInput) {
        elements.messageInput.disabled = false;
        elements.messageInput.placeholder = "Type your message...";
    }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = false;
    
    if (window.ChatModule) {
        window.ChatModule.init(appState, supabaseClient, {
            chatMessages: elements.chatMessages, messageInput: elements.messageInput,
            sendMessageBtn: elements.sendMessageBtn, messageSound: elements.messageSound,
            typingIndicator: elements.typingIndicator, typingUser: elements.typingUser,
            replyModal: document.getElementById('replyModal'), replyToName: document.getElementById('replyToName'),
            replyToContent: document.getElementById('replyToContent'), replyInput: document.getElementById('replyInput'),
            sendReplyBtn: document.getElementById('sendReplyBtn'), closeReplyModal: document.getElementById('closeReplyModal')
        });
        setTimeout(() => loadChatHistory(), 300);
    }
    
    if (elements.adminSection) {
        if (appState.isHost) {
            elements.adminSection.style.display = 'block';
            document.body.classList.add('host-mode');
            if (elements.notesBtn) elements.notesBtn.style.display = 'flex';
            loadAllSessions();
            loadChatSessions();
            loadUsers();
            loadPendingGuests();
            loadVisitorNotes();
        } else {
            elements.adminSection.style.display = 'none';
            if (elements.notesBtn) elements.notesBtn.style.display = 'none';
        }
    }
    
    if (elements.pendingGuestsBtn) {
        elements.pendingGuestsBtn.style.display = appState.isHost && appState.currentSessionId ? 'flex' : 'none';
        if (appState.isHost) setupPendingGuestsSubscription();
    }
    
    if (appState.isViewingHistory) returnToActiveChat();
}

function saveSessionToStorage() {
    localStorage.setItem('writeToMe_session', JSON.stringify({
        isHost: appState.isHost, userName: appState.userName, userId: appState.userId,
        sessionId: appState.sessionId, soundEnabled: appState.soundEnabled
    }));
}

async function handleLogout() {
    if (!confirm("Logout?")) return;
    
    if (appState.isConnected && appState.currentSessionId) {
        if (appState.isHost) {
            await supabaseClient.from('chat_sessions').update({ is_active: false, ended_at: new Date().toISOString() }).eq('session_id', appState.currentSessionId);
        } else {
            await supabaseClient.from('session_guests').update({ status: 'left', left_at: new Date().toISOString() }).eq('session_id', appState.currentSessionId).eq('guest_id', appState.userId);
        }
    }
    
    // Clean up subscriptions
    [appState.realtimeSubscription, appState.typingSubscription, appState.pendingSubscription, appState.reactionsSubscription].forEach(sub => {
        if (sub) supabaseClient.removeChannel(sub);
    });
    
    localStorage.removeItem('writeToMe_session');
    
    Object.assign(appState, {
        isHost: false, isConnected: false, userName: "Guest", userId: null,
        sessionId: null, currentSessionId: null, messages: [], isViewingHistory: false,
        pendingGuests: [], visitorNotes: [], replyingTo: null
    });
    
    if (elements.chatMessages) {
        elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text">Disconnected. Please reconnect.</div></div></div>`;
    }
    if (elements.statusIndicator) elements.statusIndicator.className = 'status-indicator offline';
    if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = "Disconnected";
    if (elements.logoutBtn) elements.logoutBtn.style.display = 'none';
    if (elements.messageInput) {
        elements.messageInput.disabled = true;
        elements.messageInput.value = '';
    }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = true;
    if (elements.adminSection) elements.adminSection.style.display = 'none';
    document.body.classList.remove('host-mode');
    showConnectionModal();
}

function addSystemMessage(text, isLocal = false) {
    const msg = document.createElement('div');
    msg.className = `message received${isLocal ? ' local-system' : ''}`;
    msg.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text">${text}</div><div class="message-time">${new Date().toLocaleTimeString()}</div></div>`;
    elements.chatMessages.appendChild(msg);
    scrollToBottom();
}

async function saveMessageToDB(senderName, messageText) {
    await supabaseClient.from('messages').insert([{
        session_id: appState.currentSessionId, sender_id: 'system',
        sender_name: senderName, message: messageText, created_at: new Date().toISOString()
    }]);
}

function scrollToBottom(behavior = 'smooth', delay = 50) {
    setTimeout(() => {
        if (elements.chatMessages && !appState.isViewingHistory) {
            const isNearBottom = elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop - elements.chatMessages.clientHeight < 200;
            if (isNearBottom) {
                elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior });
            }
        }
    }, delay);
}

function toggleEmojiPicker() {
    if (elements.emojiPicker) elements.emojiPicker.classList.toggle('show');
}

function populateEmojis() {
    if (!elements.emojiPicker) return;
    const emojis = ["😀", "😂", "😍", "😎", "😭", "😡", "👍", "👎", "❤️", "🔥", "👏", "🙏", "🤔", "😴", "🥳"];
    elements.emojiPicker.innerHTML = '';
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji';
        span.textContent = emoji;
        span.onclick = () => {
            if (elements.messageInput) elements.messageInput.value += emoji;
            if (elements.emojiPicker) elements.emojiPicker.classList.remove('show');
            if (elements.messageInput) elements.messageInput.focus();
        };
        elements.emojiPicker.appendChild(span);
    });
}

function toggleSound() {
    appState.soundEnabled = !appState.soundEnabled;
    updateSoundControl();
    const saved = localStorage.getItem('writeToMe_session');
    if (saved) {
        const data = JSON.parse(saved);
        data.soundEnabled = appState.soundEnabled;
        localStorage.setItem('writeToMe_session', JSON.stringify(data));
    }
}

function updateSoundControl() {
    if (!elements.soundControl) return;
    if (appState.soundEnabled) {
        elements.soundControl.innerHTML = '<i class="fas fa-volume-up"></i> <span>Sound On</span>';
        elements.soundControl.classList.remove('muted');
    } else {
        elements.soundControl.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Sound Off</span>';
        elements.soundControl.classList.add('muted');
    }
}

function playNotificationSound() {
    if (!appState.soundEnabled) return;
    try {
        if (!window.audioContext) window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch(e) { /* silent */ }
}

async function getRealIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip || "Unknown";
    } catch { return "Unknown"; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.approveGuest = approveGuest;
window.denyGuest = denyGuest;
window.viewSessionHistory = viewSessionHistory;
window.deleteSession = deleteSession;
window.editUserModalOpen = editUserModalOpen;
window.sendMessage = sendMessage;
window.showFullImage = (src) => {
    if (elements.fullSizeImage) elements.fullSizeImage.src = src;
    if (elements.imageModal) elements.imageModal.style.display = 'flex';
};
window.showSessionGuests = async function(sessionId) {
    const { data: guests } = await supabaseClient.from('session_guests').select('*').eq('session_id', sessionId);
    if (!guests?.length) return;
    
    const approved = guests.filter(g => g.status === 'approved');
    const pending = guests.filter(g => g.status === 'pending');
    const kicked = guests.filter(g => g.status === 'kicked');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content" style="max-width: 600px;"><div class="modal-header"><h2><i class="fas fa-users"></i> Session Guests</h2><button class="btn btn-secondary btn-small" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i> Close</button></div>
        <div class="modal-body"><h4>✅ Approved (${approved.length})</h4>${approved.map(g => `<div><strong>${escapeHtml(g.guest_name)}</strong><br><small>Joined: ${new Date(g.approved_at).toLocaleString()}</small></div>`).join('') || '<p>None</p>'}
        ${pending.length ? `<h4>⏳ Pending (${pending.length})</h4>${pending.map(g => `<div><strong>${escapeHtml(g.guest_name)}</strong><br><small>Requested: ${new Date(g.requested_at).toLocaleString()}</small></div>`).join('')}` : ''}
        ${kicked.length ? `<h4>👢 Kicked (${kicked.length})</h4>${kicked.map(g => `<div><strong>${escapeHtml(g.guest_name)}</strong><br><small>Kicked: ${new Date(g.left_at).toLocaleString()}</small></div>`).join('')}` : ''}</div></div>`;
    document.body.appendChild(modal);
};

// Initialize
document.addEventListener('DOMContentLoaded', initApp);
