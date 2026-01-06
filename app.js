// Supabase Configuration
const SUPABASE_URL = 'https://plqvqenoroacvzwtgoxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_91IHQ5--y4tDIo8L9X2ZJQ_YeThfdu_';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App State
const appState = {
    isHost: false,
    isConnected: false,
    userName: "Guest",
    userId: null,
    sessionId: null,
    currentSessionId: null,
    messages: [],
    currentImage: null,
    typingTimeout: null,
    connectionTime: null,
    realtimeSubscription: null,
    typingSubscription: null,
    pendingSubscription: null,
    soundEnabled: true,
    isViewingHistory: false,
    viewingSessionId: null,
    pendingGuests: [],
    emojis: ["😀", "😂", "😍", "😎", "😭", "😡", "👍", "👎", "❤️", "🔥", "👏", "🙏", "🤔", "😴", "🥳"],
    users: [],
    isViewingUsers: false
};

// DOM Elements
const connectionModal = document.getElementById('connectionModal');
const connectBtn = document.getElementById('connectBtn');
const passwordError = document.getElementById('passwordError');
const logoutBtn = document.getElementById('logoutBtn');
const pendingGuestsBtn = document.getElementById('pendingGuestsBtn');
const pendingGuestsModal = document.getElementById('pendingGuestsModal');
const closePendingModal = document.getElementById('closePendingModal');
const pendingGuestsList = document.getElementById('pendingGuestsList');
const noPendingGuests = document.getElementById('noPendingGuests');

const statusIndicator = document.getElementById('statusIndicator');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const pendingCount = document.getElementById('pendingCount');

const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const imageUpload = document.getElementById('imageUpload');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');

const chatTitle = document.getElementById('chatTitle');
const chatModeIndicator = document.getElementById('chatModeIndicator');
const returnToActiveBtn = document.getElementById('returnToActiveBtn');

const historyCards = document.getElementById('historyCards');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');

const soundControl = document.getElementById('soundControl');
const messageSound = document.getElementById('messageSound');

const typingIndicator = document.getElementById('typingIndicator');
const typingUser = document.getElementById('typingUser');

const imageModal = document.getElementById('imageModal');
const fullSizeImage = document.getElementById('fullSizeImage');

// User Management DOM Elements
const userManagementSection = document.getElementById('userManagementSection');
const backToHistoryBtn = document.getElementById('backToHistoryBtn');
const addUserBtn = document.getElementById('addUserBtn');
const userSearchInput = document.getElementById('userSearchInput');
const usersList = document.getElementById('usersList');
const addUserModal = document.getElementById('addUserModal');
const closeAddUserModal = document.getElementById('closeAddUserModal');
const editUserModal = document.getElementById('editUserModal');
const closeEditUserModal = document.getElementById('closeEditUserModal');
const newUsername = document.getElementById('newUsername');
const newDisplayName = document.getElementById('newDisplayName');
const newPassword = document.getElementById('newPassword');
const newRole = document.getElementById('newRole');
const addUserError = document.getElementById('addUserError');
const saveUserBtn = document.getElementById('saveUserBtn');
const editUserId = document.getElementById('editUserId');
const editUsername = document.getElementById('editUsername');
const editDisplayName = document.getElementById('editDisplayName');
const editPassword = document.getElementById('editPassword');
const editRole = document.getElementById('editRole');
const editIsActive = document.getElementById('editIsActive');
const editUserError = document.getElementById('editUserError');
const updateUserBtn = document.getElementById('updateUserBtn');
const deleteUserBtn = document.getElementById('deleteUserBtn');

const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');

// Modal control functions
function showConnectionModal() {
    connectionModal.style.display = 'flex';
    connectionModal.classList.add('show');
    document.body.classList.add('modal-open');
    
    const mainContainer = document.querySelector('.main-container') || document.querySelector('.app-container');
    if (mainContainer) {
        mainContainer.style.display = 'none';
    }
    
    // Reset inputs
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (passwordError) passwordError.style.display = 'none';
    
    const passwordHint = document.getElementById('passwordHint');
    if (passwordHint) passwordHint.style.display = 'none';
    
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
    
    clearSensitiveData();
}

function hideConnectionModal() {
    connectionModal.style.display = 'none';
    connectionModal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    const mainContainer = document.querySelector('.main-container') || document.querySelector('.app-container');
    if (mainContainer) {
        mainContainer.style.display = 'block';
    }
}

function clearSensitiveData() {
    const ipElements = document.querySelectorAll('[class*="ip"], [class*="IP"]');
    ipElements.forEach(el => {
        if (el.textContent.includes('IP:') || el.textContent.includes('ip:')) {
            el.textContent = 'IP: ***';
        }
    });
    
    if (!appState.isHost) {
        historyCards.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-lock" style="font-size: 24px; margin-bottom: 10px;"></i>
                <div>History view requires host privileges</div>
            </div>
        `;
    }
}

// Update password hint based on username
function updatePasswordHint(username) {
    const passwordHint = document.getElementById('passwordHint');
    if (!passwordHint) return;
    
    if (username === 'guest') {
        passwordHint.textContent = "Hint: Use 'guest123' for testing";
        passwordHint.style.display = 'block';
    } else if (username === 'host') {
        passwordHint.textContent = "Hint: Use 'host123' for testing";
        passwordHint.style.display = 'block';
    } else {
        passwordHint.style.display = 'none';
    }
}

// Initialize the app
async function initApp() {
    const mainContainer = document.querySelector('.main-container') || document.querySelector('.app-container');
    if (mainContainer) {
        mainContainer.style.display = 'none';
    }
    
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
                hideConnectionModal();
                updateUIAfterConnection();
                loadChatHistory();
                loadPendingGuests();
            } else {
                localStorage.removeItem('writeToMe_session');
                showConnectionModal();
            }
        } catch (e) {
            localStorage.removeItem('writeToMe_session');
            showConnectionModal();
        }
    } else {
        showConnectionModal();
    }

    updateSoundControl();
    setupEventListeners();
    setupUserManagementListeners();
    populateEmojis();
    loadChatSessions();
}

// Set up all event listeners
function setupEventListeners() {
    // Connection modal
    if (usernameInput) {
        usernameInput.addEventListener('input', function() {
            if (passwordError) passwordError.style.display = 'none';
            updatePasswordHint(this.value.toLowerCase());
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleConnect();
        });
    }
    
    if (connectBtn) {
        connectBtn.addEventListener('click', handleConnect);
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Pending guests
    if (pendingGuestsBtn) {
        pendingGuestsBtn.addEventListener('click', showPendingGuests);
    }
    
    if (closePendingModal) {
        closePendingModal.addEventListener('click', () => {
            pendingGuestsModal.style.display = 'none';
        });
    }
    
    // Chat functionality
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', handleTyping);
    }
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }
    
    // Image upload
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
    
    // Emoji picker
    if (emojiBtn) {
        emojiBtn.addEventListener('click', toggleEmojiPicker);
    }
    
    // Return to active chat
    if (returnToActiveBtn) {
        returnToActiveBtn.addEventListener('click', returnToActiveChat);
    }
    
    // History
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', loadChatSessions);
    }
    
    // Sound control
    if (soundControl) {
        soundControl.addEventListener('click', toggleSound);
    }
    
    // Image modal
    if (imageModal) {
        imageModal.addEventListener('click', () => {
            imageModal.style.display = 'none';
        });
    }
    
    // Click outside emoji picker to close
    document.addEventListener('click', (e) => {
        if (emojiPicker && !emojiPicker.contains(e.target) && emojiBtn && !emojiBtn.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });
    
    // Prevent background scrolling when modal is open
    document.addEventListener('touchmove', function(e) {
        if (connectionModal && (connectionModal.style.display === 'flex' || connectionModal.classList.contains('show'))) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Handle connection
async function handleConnect() {
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    
    // Reset error
    passwordError.style.display = 'none';
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    
    // Validate inputs
    if (!username) {
        passwordError.style.display = 'block';
        passwordError.textContent = "Please enter a username.";
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        return;
    }
    
    // Validate that username is either 'guest' or 'host'
    if (username !== 'guest' && username !== 'host') {
        passwordError.style.display = 'block';
        passwordError.textContent = "Username must be 'guest' or 'host'.";
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        return;
    }
    
    if (!password) {
        passwordError.style.display = 'block';
        passwordError.textContent = "Please enter a password.";
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        return;
    }
    
    try {
        console.log("Attempting authentication for username:", username);
        
        // Set isHost based on username
        appState.isHost = username === 'host';
        appState.userName = appState.isHost ? "Host" : "Guest";
        
        // Generate a unique user ID
        appState.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log("User authenticated:", appState.userName, "ID:", appState.userId, "Is Host:", appState.isHost);
        
        // Continue with connection process
        appState.connectionTime = new Date();
        
        // Get user IP
        const userIP = await getRealIP();
        
        if (appState.isHost) {
            await connectAsHost(userIP);
        } else {
            await connectAsGuest(userIP);
        }
        
    } catch (error) {
        console.error("Error in authentication process:", error);
        passwordError.style.display = 'block';
        passwordError.textContent = "Connection error: " + error.message;
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
}

// Connect as host
async function connectAsHost(userIP) {
    try {
        const sessionId = 'session_' + Date.now().toString(36);
        
        // Create the session
        const { data, error } = await supabaseClient
            .from('sessions')
            .insert([
                {
                    session_id: sessionId,
                    host_id: appState.userId,
                    host_name: appState.userName,
                    host_ip: userIP,
                    is_active: true,
                    requires_approval: true,
                    created_at: new Date().toISOString(),
                    pending_guests: []
                }
            ])
            .select()
            .single();
        
        if (error) {
            console.error("Error creating session:", error);
            alert("Failed to create session: " + error.message);
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        appState.sessionId = sessionId;
        appState.currentSessionId = sessionId;
        appState.isConnected = true;
        
        // Save session to localStorage
        localStorage.setItem('writeToMe_session', JSON.stringify({
            isHost: appState.isHost,
            userName: appState.userName,
            userId: appState.userId,
            sessionId: appState.sessionId,
            connectionTime: appState.connectionTime,
            soundEnabled: appState.soundEnabled
        }));
        
        hideConnectionModal();
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        updateUIAfterConnection();
        
        // Add connection message to chat
        await saveMessageToDB('System', `${appState.userName} has connected to the chat.`);
        
        // Setup real-time subscriptions
        setupRealtimeSubscriptions();
        
        // If host, show pending guests button
        pendingGuestsBtn.style.display = 'flex';
        loadPendingGuests();
        setupPendingGuestsSubscription();
        
        // Load chat history
        loadChatHistory();
        
        // Load chat sessions
        if (appState.isHost) {
            loadChatSessions();
        }
        
    } catch (error) {
        console.error("Error in host connection:", error);
        alert("An error occurred: " + error.message);
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
}

// Connect as guest
async function connectAsGuest(userIP) {
    try {
        // First check if there's an active session
        const { data: activeSessions, error: sessionsError } = await supabaseClient
            .from('sessions')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (sessionsError) {
            console.error("Error fetching sessions:", sessionsError);
            alert("Error checking for active sessions: " + sessionsError.message);
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        if (!activeSessions || activeSessions.length === 0) {
            alert("No active session found. Please ask the host to create a session first.");
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        const session = activeSessions[0];
        console.log("Found active session:", session.session_id);
        
        // Check if this guest is already the approved guest
        if (session.guest_id && session.guest_id === appState.userId) {
            // Guest is already approved - direct connection
            console.log("Guest already approved, connecting directly");
            appState.sessionId = session.session_id;
            appState.currentSessionId = session.session_id;
            appState.isConnected = true;
            
            localStorage.setItem('writeToMe_session', JSON.stringify({
                isHost: appState.isHost,
                userName: appState.userName,
                userId: appState.userId,
                sessionId: appState.sessionId,
                connectionTime: appState.connectionTime,
                soundEnabled: appState.soundEnabled
            }));
            
            hideConnectionModal();
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            updateUIAfterConnection();
            setupRealtimeSubscriptions();
            loadChatHistory();
            loadChatSessions();
            return;
        }
        
        // Check if already in pending list
        const currentPending = session.pending_guests || [];
        const isAlreadyPending = currentPending.some(g => g.guest_id === appState.userId);
        
        if (isAlreadyPending) {
            // Already pending
            console.log("Guest already pending");
            appState.sessionId = session.session_id;
            hideConnectionModal();
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            updateUIForPendingGuest();
            setupPendingApprovalSubscription(session.session_id);
            return;
        }
        
        // If there's already an approved guest, show message
        if (session.guest_id && session.guest_id !== appState.userId) {
            alert("There is already a guest connected to this session. Please wait for them to disconnect or ask the host to create a new session.");
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        // Add to pending guests
        const pendingGuest = {
            guest_id: appState.userId,
            guest_name: appState.userName,
            guest_ip: userIP,
            requested_at: new Date().toISOString(),
            status: 'pending'
        };
        
        currentPending.push(pendingGuest);
        
        const { error: updateError } = await supabaseClient
            .from('sessions')
            .update({ 
                pending_guests: currentPending
            })
            .eq('session_id', session.session_id);
        
        if (updateError) {
            console.error("Error adding to pending:", updateError);
            alert("Failed to request access: " + updateError.message);
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        console.log("Guest added to pending list");
        appState.sessionId = session.session_id;
        hideConnectionModal();
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        updateUIForPendingGuest();
        setupPendingApprovalSubscription(session.session_id);
        
    } catch (error) {
        console.error("Error in guest connection:", error);
        alert("An error occurred: " + error.message);
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
}

// Set up subscription for pending guests (for host)
function setupPendingGuestsSubscription() {
    if (appState.pendingSubscription) {
        supabaseClient.removeChannel(appState.pendingSubscription);
    }
    
    appState.pendingSubscription = supabaseClient
        .channel('pending-guests-channel-' + appState.currentSessionId)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'sessions',
                filter: 'session_id=eq.' + appState.currentSessionId
            },
            (payload) => {
                if (payload.new) {
                    appState.pendingGuests = payload.new.pending_guests || [];
                    pendingCount.textContent = appState.pendingGuests.length;
                    pendingGuestsBtn.style.display = appState.pendingGuests.length > 0 ? 'flex' : 'none';
                } else {
                    loadPendingGuests();
                }
            }
        )
        .subscribe((status) => {
            console.log('Pending guests subscription status:', status);
        });
}

// Set up subscription for pending approval (for guest)
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
                        
                        await saveMessageToDB('System', `${appState.userName} has joined the chat.`);
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('Pending approval subscription status:', status);
        });
}

// Get real IP address
async function getRealIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || "Unknown";
    } catch (error) {
        console.error("Error getting IP:", error);
        return "Unknown";
    }
}

// Reconnect to existing session
async function reconnectToSession() {
    try {
        const { data: session, error } = await supabaseClient
            .from('sessions')
            .select('*')
            .eq('session_id', appState.sessionId)
            .single();
        
        if (error || !session) {
            console.log("Session not found or error:", error);
            return false;
        }
        
        console.log("Reconnecting - Session found:", session.session_id);
        console.log("Our user ID:", appState.userId);
        console.log("Session host ID:", session.host_id);
        console.log("Session guest ID:", session.guest_id);
        
        if (appState.isHost) {
            if (session.host_id === appState.userId) {
                appState.currentSessionId = session.session_id;
                setupRealtimeSubscriptions();
                return true;
            }
            return false;
        } else {
            if (session.guest_id === appState.userId) {
                appState.currentSessionId = session.session_id;
                setupRealtimeSubscriptions();
                return true;
            } else {
                const isPending = session.pending_guests?.some(g => g.guest_id === appState.userId);
                if (isPending) {
                    updateUIForPendingGuest();
                    setupPendingApprovalSubscription(session.session_id);
                    return false;
                }
                return false;
            }
        }
    } catch (error) {
        console.error("Error reconnecting:", error);
        return false;
    }
}

// Update UI for pending guest (not yet approved)
function updateUIForPendingGuest() {
    statusIndicator.className = 'status-indicator offline';
    userRoleDisplay.textContent = `${appState.userName} (Pending Approval)`;
    logoutBtn.style.display = 'flex';
    pendingGuestsBtn.style.display = 'none';
    
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
    messageInput.placeholder = "Waiting for host approval...";
    
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = 'none';
    }
    
    chatMessages.innerHTML = `
        <div class="message received">
            <div class="message-sender">System</div>
            <div class="message-content">
                <div class="message-text">Your access request has been sent to the host. Please wait for approval.</div>
                <div class="message-time">Just now</div>
            </div>
        </div>
    `;
}

// Update UI after connection
function updateUIAfterConnection() {
    statusIndicator.className = 'status-indicator';
    statusIndicator.classList.add('online');
    userRoleDisplay.textContent = `${appState.userName} (Connected)`;
    logoutBtn.style.display = 'flex';
    
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
    messageInput.placeholder = "Type your message here... (Press Enter to send, Shift+Enter for new line)";
    messageInput.focus();
    
    const systemMessages = document.querySelectorAll('.message .message-sender');
    systemMessages.forEach(msg => {
        if (msg.textContent === 'System') {
            const messageDiv = msg.closest('.message');
            if (messageDiv && messageDiv.textContent.includes('waiting for host approval')) {
                messageDiv.remove();
            }
        }
    });
    
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = appState.isHost ? 'block' : 'none';
    }
}

// Handle logout
async function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        // Clear sensitive data from UI first
        chatMessages.innerHTML = `
            <div class="message received">
                <div class="message-sender">System</div>
                <div class="message-content">
                    <div class="message-text">Disconnected. Please reconnect to continue.</div>
                    <div class="message-time">Just now</div>
                </div>
            </div>
        `;
        
        // Clear history section
        historyCards.innerHTML = '';
        
        // Reset all UI elements
        statusIndicator.className = 'status-indicator offline';
        userRoleDisplay.textContent = "Disconnected";
        logoutBtn.style.display = 'none';
        pendingGuestsBtn.style.display = 'none';
        pendingCount.textContent = '0';
        messageInput.disabled = true;
        sendMessageBtn.disabled = true;
        messageInput.value = '';
        messageInput.placeholder = "Please connect to start chatting";
        chatModeIndicator.style.display = 'none';
        chatTitle.innerHTML = '<i class="fas fa-comments"></i> Chat';
        
        // Hide main content and show modal
        const mainContainer = document.querySelector('.main-container') || document.querySelector('.app-container');
        if (mainContainer) {
            mainContainer.style.display = 'none';
        }
        
        // Update session status in database
        if (appState.isConnected && appState.currentSessionId) {
            try {
                if (appState.isHost) {
                    await supabaseClient
                        .from('sessions')
                        .update({ 
                            is_active: false,
                            ended_at: new Date().toISOString()
                        })
                        .eq('session_id', appState.currentSessionId);
                } else {
                    await supabaseClient
                        .from('sessions')
                        .update({ 
                            guest_id: null,
                            guest_name: null,
                            guest_connected_at: null,
                            guest_ip: null
                        })
                        .eq('session_id', appState.currentSessionId);
                }
            } catch (error) {
                console.error("Error updating session on logout:", error);
            }
        }
        
        // Remove subscriptions
        if (appState.realtimeSubscription) {
            supabaseClient.removeChannel(appState.realtimeSubscription);
        }
        if (appState.typingSubscription) {
            supabaseClient.removeChannel(appState.typingSubscription);
        }
        if (appState.pendingSubscription) {
            supabaseClient.removeChannel(appState.pendingSubscription);
        }
        
        // Clear local storage
        localStorage.removeItem('writeToMe_session');
        
        // Reset app state
        appState.isHost = false;
        appState.isConnected = false;
        appState.userName = "Guest";
        appState.userId = null;
        appState.sessionId = null;
        appState.currentSessionId = null;
        appState.messages = [];
        appState.isViewingHistory = false;
        appState.viewingSessionId = null;
        appState.pendingGuests = [];
        appState.isViewingUsers = false;
        appState.users = [];
        
        // Reset modal inputs
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (passwordError) passwordError.style.display = 'none';
        
        // Show connection modal
        showConnectionModal();
    }
}

// Setup real-time subscriptions
function setupRealtimeSubscriptions() {
    if (appState.realtimeSubscription) {
        supabaseClient.removeChannel(appState.realtimeSubscription);
    }
    if (appState.typingSubscription) {
        supabaseClient.removeChannel(appState.typingSubscription);
    }
    
    // Messages subscription
    appState.realtimeSubscription = supabaseClient
        .channel('messages-channel-' + appState.currentSessionId)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: 'session_id=eq.' + appState.currentSessionId
            },
            (payload) => {
                if (payload.new.sender_id !== appState.userId) {
                    displayMessage({
                        id: payload.new.id,
                        sender: payload.new.sender_name,
                        text: payload.new.message,
                        image: payload.new.image_url,
                        time: new Date(payload.new.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        type: 'received',
                        is_historical: false
                    });
                    
                    if (appState.soundEnabled && !appState.isViewingHistory) {
                        messageSound.currentTime = 0;
                        messageSound.play().catch(e => console.log("Audio play failed:", e));
                    }
                }
            }
        )
        .subscribe();
    
    // Typing indicator subscription
    appState.typingSubscription = supabaseClient
        .channel('typing-channel-' + appState.currentSessionId)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'sessions',
                filter: 'session_id=eq.' + appState.currentSessionId
            },
            (payload) => {
                if (payload.new.typing_user && payload.new.typing_user !== appState.userName) {
                    typingUser.textContent = payload.new.typing_user;
                    typingIndicator.classList.add('show');
                    
                    setTimeout(() => {
                        typingIndicator.classList.remove('show');
                    }, 3000);
                }
            }
        )
        .subscribe();
}

// Handle typing
async function handleTyping() {
    if (appState.currentSessionId && !appState.isViewingHistory && appState.isConnected) {
        try {
            await supabaseClient
                .from('sessions')
                .update({ typing_user: appState.userName })
                .eq('session_id', appState.currentSessionId);
            
            if (appState.typingTimeout) {
                clearTimeout(appState.typingTimeout);
            }
            appState.typingTimeout = setTimeout(() => {
                supabaseClient
                    .from('sessions')
                    .update({ typing_user: null })
                    .eq('session_id', appState.currentSessionId)
                    .catch(e => console.log("Error clearing typing indicator:", e));
            }, 1000);
        } catch (error) {
            console.log("Typing indicator error:", error);
        }
    }
}

// Send a chat message
async function sendMessage() {
    if (!appState.isConnected || appState.isViewingHistory) {
        alert("You cannot send messages right now.");
        return;
    }
    
    const messageText = messageInput.value.trim();
    const imageFile = imageUpload.files[0];
    
    if (!messageText && !imageFile) return;
    
    let imageUrl = null;
    
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            imageUrl = e.target.result;
            await sendMessageToDB(messageText, imageUrl);
        };
        reader.readAsDataURL(imageFile);
        imageUpload.value = '';
    } else {
        await sendMessageToDB(messageText, null);
    }
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

// Send message to database
async function sendMessageToDB(text, imageUrl) {
    try {
        const messageData = {
            session_id: appState.currentSessionId,
            sender_id: appState.userId,
            sender_name: appState.userName,
            message: text || '',
            created_at: new Date().toISOString()
        };
        
        if (imageUrl) {
            messageData.image_url = imageUrl;
        }
        
        const { error } = await supabaseClient
            .from('messages')
            .insert([messageData]);
        
        if (error) throw error;
        
        displayMessage({
            id: 'temp_' + Date.now(),
            sender: appState.userName,
            text: text,
            image: imageUrl,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: 'sent',
            is_historical: false
        });
        
        return { success: true };
        
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message: " + error.message);
        return null;
    }
}

// Display a message in the chat
function displayMessage(message) {
    if (appState.isViewingHistory && message.is_historical === false) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    if (message.is_historical) {
        messageDiv.classList.add('historical');
    }
    messageDiv.id = `msg-${message.id}`;
    
    let messageContent = message.text || '';
    if (message.image) {
        messageContent += `<img src="${message.image}" class="message-image" onclick="showFullImage('${message.image}')">`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-content">
            <div class="message-text">${messageContent}</div>
            <div class="message-time">${message.time}</div>
        </div>
        ${message.type === 'sent' && !message.is_historical ? `
        <div class="message-actions">
            <button class="message-action-btn" onclick="editMessage('${message.id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="message-action-btn" onclick="deleteMessage('${message.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
            <button class="message-action-btn" onclick="replyToMessage('${message.id}')">
                <i class="fas fa-reply"></i> Reply
            </button>
        </div>
        ` : ''}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Edit a message
async function editMessage(messageId) {
    const newText = prompt("Edit your message:");
    if (newText !== null && newText.trim() !== '') {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({
                    message: newText.trim(),
                    edited_at: new Date().toISOString()
                })
                .eq('id', messageId)
                .eq('sender_id', appState.userId);
            
            if (error) throw error;
            
            const messageElement = document.getElementById(`msg-${messageId}`);
            if (messageElement) {
                const textElement = messageElement.querySelector('.message-text');
                if (textElement) {
                    textElement.innerHTML = `${newText.trim()} <small style="opacity:0.7;">(edited)</small>`;
                }
            }
        } catch (error) {
            console.error("Error editing message:", error);
            alert("Failed to edit message.");
        }
    }
}

// Delete a message
async function deleteMessage(messageId) {
    if (confirm("Are you sure you want to delete this message?")) {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: appState.userId
                })
                .eq('id', messageId);
            
            if (error) throw error;
            
            const messageElement = document.getElementById(`msg-${messageId}`);
            if (messageElement) {
                messageElement.innerHTML = `
                    <div class="message-sender">${appState.userName}</div>
                    <div class="message-content">
                        <div class="message-text"><i>Message deleted</i></div>
                        <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message.");
        }
    }
}

// Reply to a message
function replyToMessage(messageId) {
    const messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
        const sender = messageElement.querySelector('.message-sender').textContent;
        const text = messageElement.querySelector('.message-text').textContent;
        messageInput.value = `Replying to ${sender}: ${text}\n`;
        messageInput.focus();
    }
}

// Show full size image
function showFullImage(src) {
    fullSizeImage.src = src;
    imageModal.style.display = 'flex';
}

// Load chat history
async function loadChatHistory(sessionId = null) {
    const targetSessionId = sessionId || appState.currentSessionId;
    if (!targetSessionId) return;
    
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('session_id', targetSessionId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        chatMessages.innerHTML = '';
        appState.messages = [];
        
        if (sessionId) {
            const { data: session } = await supabaseClient
                .from('sessions')
                .select('created_at')
                .eq('session_id', sessionId)
                .single();
            
            const historyHeader = document.createElement('div');
            historyHeader.className = 'message received historical';
            historyHeader.innerHTML = `
                <div class="message-sender">System</div>
                <div class="message-content">
                    <div class="message-text">Historical Chat - ${new Date(session.created_at).toLocaleDateString()}</div>
                    <div class="message-time"></div>
                </div>
            `;
            chatMessages.appendChild(historyHeader);
        }
        
        messages.forEach(msg => {
            const messageType = msg.sender_id === appState.userId ? 'sent' : 'received';
            displayMessage({
                id: msg.id,
                sender: msg.sender_name,
                text: msg.message,
                image: msg.image_url,
                time: new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                type: messageType,
                is_historical: !!sessionId
            });
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error("Error loading chat history:", error);
    }
}

// Clear chat history
async function clearChat() {
    if (!appState.isConnected) {
        alert("You must be connected to clear chat.");
        return;
    }
    
    if (confirm("Are you sure you want to clear the chat? " + 
        (appState.isHost ? "This will clear for everyone." : "This will only clear your view."))) {
        
        if (appState.isHost) {
            try {
                const { error } = await supabaseClient
                    .from('messages')
                    .delete()
                    .eq('session_id', appState.currentSessionId);
                
                if (error) throw error;
                
                chatMessages.innerHTML = '';
                addSystemMessage("Chat history has been cleared by the host.");
            } catch (error) {
                console.error("Error clearing chat:", error);
                alert("Error clearing chat. Please try again.");
            }
        } else {
            chatMessages.innerHTML = '';
            addSystemMessage("Your chat view has been cleared.");
        }
    }
}

// Add a system message
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message received';
    
    messageDiv.innerHTML = `
        <div class="message-sender">System</div>
        <div class="message-content">
            <div class="message-text">${text}</div>
            <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Load pending guests
async function loadPendingGuests() {
    if (!appState.isHost || !appState.currentSessionId) return;
    
    try {
        const { data: session, error } = await supabaseClient
            .from('sessions')
            .select('pending_guests')
            .eq('session_id', appState.currentSessionId)
            .single();
        
        if (error) throw error;
        
        appState.pendingGuests = session.pending_guests || [];
        pendingCount.textContent = appState.pendingGuests.length;
        pendingGuestsBtn.style.display = appState.pendingGuests.length > 0 ? 'flex' : 'none';
    } catch (error) {
        console.error("Error loading pending guests:", error);
    }
}

// Show pending guests modal
async function showPendingGuests() {
    pendingGuestsList.innerHTML = '';
    
    if (appState.pendingGuests.length === 0) {
        noPendingGuests.style.display = 'block';
    } else {
        noPendingGuests.style.display = 'none';
        
        appState.pendingGuests.forEach((guest, index) => {
            const guestDiv = document.createElement('div');
            guestDiv.className = 'pending-guest';
            guestDiv.innerHTML = `
                <div class="guest-info">
                    <strong>${guest.guest_name}</strong>
                    <small>IP: ${guest.guest_ip || 'Unknown'}</small>
                    <small>Requested: ${new Date(guest.requested_at).toLocaleTimeString()}</small>
                </div>
                <div class="guest-actions">
                    <button class="btn btn-success btn-small" onclick="approveGuest(${index})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-small" onclick="denyGuest(${index})">
                        <i class="fas fa-times"></i> Deny
                    </button>
                </div>
            `;
            pendingGuestsList.appendChild(guestDiv);
        });
    }
    
    pendingGuestsModal.style.display = 'flex';
}

// Approve a guest
async function approveGuest(index) {
    const guest = appState.pendingGuests[index];
    
    try {
        const updateData = {
            guest_id: guest.guest_id,
            guest_name: guest.guest_name,
            guest_ip: guest.guest_ip,
            guest_connected_at: new Date().toISOString(),
            pending_guests: appState.pendingGuests.filter((_, i) => i !== index)
        };
        
        console.log("Approving guest:", guest.guest_name, "ID:", guest.guest_id);
        
        const { error } = await supabaseClient
            .from('sessions')
            .update(updateData)
            .eq('session_id', appState.currentSessionId);
        
        if (error) throw error;
        
        appState.pendingGuests = appState.pendingGuests.filter((_, i) => i !== index);
        pendingCount.textContent = appState.pendingGuests.length;
        
        showPendingGuests();
        
        await saveMessageToDB('System', `${guest.guest_name} has been approved and joined the chat.`);
        
    } catch (error) {
        console.error("Error approving guest:", error);
        alert("Failed to approve guest: " + error.message);
    }
}

// Deny a guest
async function denyGuest(index) {
    const guest = appState.pendingGuests[index];
    
    try {
        const updateData = {
            pending_guests: appState.pendingGuests.filter((_, i) => i !== index)
        };
        
        const { error } = await supabaseClient
            .from('sessions')
            .update(updateData)
            .eq('session_id', appState.currentSessionId);
        
        if (error) throw error;
        
        appState.pendingGuests = appState.pendingGuests.filter((_, i) => i !== index);
        pendingCount.textContent = appState.pendingGuests.length;
        
        showPendingGuests();
        
    } catch (error) {
        console.error("Error denying guest:", error);
        alert("Failed to deny guest: " + error.message);
    }
}

// Load chat sessions for history panel
async function loadChatSessions() {
    try {
        // Hide history for non-hosts
        if (!appState.isHost) {
            historyCards.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-lock" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <div>History view requires host privileges</div>
                </div>
            `;
            return;
        }
        
        const { data: sessions, error } = await supabaseClient
            .from('sessions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error loading sessions:", error);
            historyCards.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Could not load sessions</div>';
            return;
        }
        
        historyCards.innerHTML = '';
        
        sessions.forEach(session => {
            const isActive = session.session_id === appState.currentSessionId && session.is_active;
            const card = document.createElement('div');
            card.className = 'session-card';
            if (isActive) {
                card.classList.add('active');
            }
            
            // Only show full IP info to host
            const hostIP = appState.isHost ? (session.host_ip || 'N/A') : '***';
            const guestIP = appState.isHost ? (session.guest_ip || 'N/A') : '***';
            
            card.innerHTML = `
            <div class="session-card-header">
                <div class="session-id">${session.session_id.substring(0, 10)}...</div>
                ${isActive ? '<div class="session-active-badge">Active Now</div>' : ''}
            </div>
            <div class="session-info">
                <div class="session-info-item">
                    <div class="session-info-row">
                        <span class="session-info-label">Host:</span>
                        <span class="session-info-value">${session.host_name || 'Unknown'}</span>
                    </div>
                    <div class="session-info-row">
                        <span class="session-info-label">Host IP:</span>
                        <span class="session-info-value">${hostIP}</span>
                    </div>
                </div>
                <div class="session-info-item">
                    <div class="session-info-row">
                        <span class="session-info-label">Guest:</span>
                        <span class="session-info-value">${session.guest_name || 'None'}</span>
                    </div>
                    <div class="session-info-row">
                        <span class="session-info-label">Guest IP:</span>
                        <span class="session-info-value">${guestIP}</span>
                    </div>
                </div>
                <div class="session-info-item">
                    <span class="session-info-label">Started:</span>
                    <span class="session-info-value">${new Date(session.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="session-actions">
                <button class="btn btn-secondary btn-small" onclick="viewSessionHistory('${session.session_id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-success btn-small" onclick="downloadSession('${session.session_id}')">
                    <i class="fas fa-download"></i> Download
                </button>
                ${appState.isHost ? `
                <button class="btn btn-danger btn-small" onclick="deleteSession('${session.session_id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
                ` : ''}
            </div>
        `;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.session-actions')) {
                    viewSessionHistory(session.session_id);
                }
            });
            
            historyCards.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading sessions:", error);
        historyCards.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Error loading sessions</div>';
    }
}

// View session history
async function viewSessionHistory(sessionId) {
    appState.isViewingHistory = true;
    appState.viewingSessionId = sessionId;
    
    chatModeIndicator.style.display = 'flex';
    chatTitle.innerHTML = '<i class="fas fa-history"></i> Historical Chat';
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
    messageInput.placeholder = "Cannot send messages in historical view";
    
    await loadChatHistory(sessionId);
    
    chatMessages.scrollTop = 0;
}

// Return to active chat
function returnToActiveChat() {
    appState.isViewingHistory = false;
    appState.viewingSessionId = null;
    
    chatModeIndicator.style.display = 'none';
    chatTitle.innerHTML = '<i class="fas fa-comments"></i> Active Chat';
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
    messageInput.placeholder = "Type your message here... (Press Enter to send, Shift+Enter for new line)";
    messageInput.focus();
    
    loadChatHistory();
}

// Download session data
async function downloadSession(sessionId) {
    try {
        const { data: session, error: sessionError } = await supabaseClient
            .from('sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        const { data: messages, error: messagesError } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
        
        if (messagesError) throw messagesError;
        
        const downloadData = {
            session: session,
            messages: messages,
            exported_at: new Date().toISOString(),
            exported_by: appState.userName
        };
        
        const dataStr = JSON.stringify(downloadData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `WriteToMe_Session_${sessionId}_${new Date().getTime()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
    } catch (error) {
        console.error("Error downloading session:", error);
        alert("Failed to download session data.");
    }
}

// Delete session
async function deleteSession(sessionId) {
    if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
        try {
            const { error: messagesError } = await supabaseClient
                .from('messages')
                .delete()
                .eq('session_id', sessionId);
            
            if (messagesError) throw messagesError;
            
            const { error: sessionError } = await supabaseClient
                .from('sessions')
                .delete()
                .eq('session_id', sessionId);
            
            if (sessionError) throw sessionError;
            
            loadChatSessions();
            
            if (appState.viewingSessionId === sessionId) {
                returnToActiveChat();
            }
            
        } catch (error) {
            console.error("Error deleting session:", error);
            alert("Failed to delete session.");
        }
    }
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB.");
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        messageInput.value = `[Image: ${file.name}]`;
        sendMessage();
    };
    reader.readAsDataURL(file);
}

// Toggle emoji picker
function toggleEmojiPicker() {
    emojiPicker.classList.toggle('show');
}

// Populate emojis
function populateEmojis() {
    emojiPicker.innerHTML = '';
    appState.emojis.forEach(emoji => {
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji';
        emojiSpan.textContent = emoji;
        emojiSpan.onclick = () => {
            messageInput.value += emoji;
            emojiPicker.classList.remove('show');
            messageInput.focus();
        };
        emojiPicker.appendChild(emojiSpan);
    });
}

// Toggle sound
function toggleSound() {
    appState.soundEnabled = !appState.soundEnabled;
    updateSoundControl();
    
    const savedSession = localStorage.getItem('writeToMe_session');
    if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        sessionData.soundEnabled = appState.soundEnabled;
        localStorage.setItem('writeToMe_session', JSON.stringify(sessionData));
    }
}

// Update sound control UI
function updateSoundControl() {
    if (appState.soundEnabled) {
        soundControl.innerHTML = '<i class="fas fa-volume-up"></i> <span>Sound On</span>';
        soundControl.classList.remove('muted');
    } else {
        soundControl.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Sound Off</span>';
        soundControl.classList.add('muted');
    }
}

// Save message to database (system messages)
async function saveMessageToDB(senderName, messageText) {
    try {
        const messageData = {
            session_id: appState.currentSessionId,
            sender_id: 'system',
            sender_name: senderName,
            message: messageText,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('messages')
            .insert([messageData]);
        
        if (error) {
            console.error("Error saving system message:", error);
            return null;
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving system message:", error);
        return null;
    }
}

// Auto-resize textarea
if (messageInput) {
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

// Add event listeners for user management
function setupUserManagementListeners() {
    // User management navigation
    const manageUsersBtn = document.createElement('button');
    manageUsersBtn.className = 'btn btn-small';
    manageUsersBtn.innerHTML = '<i class="fas fa-users-cog"></i> Manage Users';
    manageUsersBtn.style.marginLeft = '10px';
    
    manageUsersBtn.addEventListener('click', () => {
        if (appState.isHost) {
            showUserManagement();
        } else {
            alert("Only hosts can manage users.");
        }
    });
    
    // Add button to history section header
    const historyHeader = document.querySelector('.history-section .section-header');
    if (historyHeader) {
        historyHeader.appendChild(manageUsersBtn);
    }
    
    // Back to history
    if (backToHistoryBtn) {
        backToHistoryBtn.addEventListener('click', showHistory);
    }
    
    // Add user button
    if (addUserBtn) {
        addUserBtn.addEventListener('click', showAddUserModal);
    }
    
    // Close modals
    if (closeAddUserModal) {
        closeAddUserModal.addEventListener('click', () => {
            addUserModal.style.display = 'none';
        });
    }
    
    if (closeEditUserModal) {
        closeEditUserModal.addEventListener('click', () => {
            editUserModal.style.display = 'none';
        });
    }
    
    // Save new user
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveNewUser);
    }
    
    // Update user
    if (updateUserBtn) {
        updateUserBtn.addEventListener('click', updateUser);
    }
    
    // Delete user
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', deleteUser);
    }
    
    // Search users
    if (userSearchInput) {
        userSearchInput.addEventListener('input', function() {
            searchUsers(this.value.toLowerCase());
        });
    }
}

// Show user management section
function showUserManagement() {
    if (!appState.isHost) {
        alert("Only hosts can manage users.");
        return;
    }
    
    appState.isViewingUsers = true;
    historyCards.style.display = 'none';
    userManagementSection.style.display = 'block';
    
    loadUsers();
}

// Show history section
function showHistory() {
    appState.isViewingUsers = false;
    historyCards.style.display = 'block';
    userManagementSection.style.display = 'none';
    loadChatSessions();
}

// Show add user modal
function showAddUserModal() {
    if (!appState.isHost) return;
    
    // Clear form
    if (newUsername) newUsername.value = '';
    if (newDisplayName) newDisplayName.value = '';
    if (newPassword) newPassword.value = '';
    if (newRole) newRole.value = 'guest';
    if (addUserError) addUserError.style.display = 'none';
    
    addUserModal.style.display = 'flex';
}

// Load all users
async function loadUsers() {
    if (!appState.isHost) return;
    
    try {
        const { data: users, error } = await supabaseClient
            .from('user_management')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        appState.users = users || [];
        renderUsers(users);
        
    } catch (error) {
        console.error("Error loading users:", error);
        if (usersList) {
            usersList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--danger-red);">
                    <i class="fas fa-exclamation-circle"></i>
                    <div>Error loading users: ${error.message}</div>
                </div>
            `;
        }
    }
}

// Render users list
function renderUsers(users) {
    if (!usersList) return;
    
    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h3>No Users Found</h3>
                <p>Click "Add New User" to create your first user.</p>
            </div>
        `;
        return;
    }
    
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = `user-card ${user.role} ${user.is_active ? '' : 'inactive'}`;
        userCard.dataset.userId = user.id;
        
        const lastLogin = user.last_login 
            ? new Date(user.last_login).toLocaleString() 
            : 'Never';
        
        userCard.innerHTML = `
            <div class="user-header">
                <div class="user-name">
                    <i class="fas fa-user"></i>
                    <h3>${user.display_name}</h3>
                </div>
                <div class="user-badges">
                    <span class="user-badge badge-${user.role}">${user.role}</span>
                    ${!user.is_active ? '<span class="user-badge badge-inactive">Inactive</span>' : ''}
                </div>
            </div>
            <div class="user-details">
                <div class="user-detail">
                    <span class="user-detail-label">Username:</span>
                    <span class="user-detail-value">${user.username}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail-label">Created:</span>
                    <span class="user-detail-value">${new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail-label">Last Login:</span>
                    <span class="user-detail-value">${lastLogin}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail-label">Created By:</span>
                    <span class="user-detail-value">${user.created_by || 'System'}</span>
                </div>
            </div>
            <div class="user-actions">
                <button class="btn btn-secondary btn-small" onclick="editUserModalOpen('${user.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="confirmDeleteUser('${user.id}', '${user.username}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        usersList.appendChild(userCard);
    });
}

// Search users
function searchUsers(searchTerm) {
    if (!searchTerm) {
        renderUsers(appState.users);
        return;
    }
    
    const filteredUsers = appState.users.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.display_name.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm)
    );
    
    renderUsers(filteredUsers);
}

// Open edit user modal
function editUserModalOpen(userId) {
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;
    
    if (editUserId) editUserId.value = user.id;
    if (editUsername) editUsername.value = user.username;
    if (editDisplayName) editDisplayName.value = user.display_name;
    if (editPassword) editPassword.value = '';
    if (editRole) editRole.value = user.role;
    if (editIsActive) editIsActive.checked = user.is_active;
    if (editUserError) editUserError.style.display = 'none';
    
    editUserModal.style.display = 'flex';
}

// Confirm delete user
function confirmDeleteUser(userId, username) {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        deleteUser(userId);
    }
}

// Save new user
async function saveNewUser() {
    if (!appState.isHost) return;
    
    const username = newUsername.value.trim();
    const displayName = newDisplayName.value.trim();
    const password = newPassword.value;
    const role = newRole.value;
    
    // Validation
    if (!username || !displayName || !password) {
        if (addUserError) {
            addUserError.textContent = "All fields are required.";
            addUserError.style.display = 'block';
        }
        return;
    }
    
    if (username.length < 3) {
        if (addUserError) {
            addUserError.textContent = "Username must be at least 3 characters.";
            addUserError.style.display = 'block';
        }
        return;
    }
    
    if (password.length < 6) {
        if (addUserError) {
            addUserError.textContent = "Password must be at least 6 characters.";
            addUserError.style.display = 'block';
        }
        return;
    }
    
    try {
        // Check if username already exists
        const { data: existingUser } = await supabaseClient
            .from('user_management')
            .select('id')
            .eq('username', username)
            .single();
        
        if (existingUser) {
            if (addUserError) {
                addUserError.textContent = "Username already exists.";
                addUserError.style.display = 'block';
            }
            return;
        }
        
        // Create new user
        const { error } = await supabaseClient
            .from('user_management')
            .insert([{
                username: username,
                display_name: displayName,
                password_hash: password, // This will be hashed by the database function
                role: role,
                created_by: appState.userName,
                is_active: true
            }]);
        
        if (error) throw error;
        
        // Close modal and refresh list
        addUserModal.style.display = 'none';
        await loadUsers();
        
        // Show success message
        alert(`User "${username}" created successfully!`);
        
    } catch (error) {
        console.error("Error creating user:", error);
        if (addUserError) {
            addUserError.textContent = `Error: ${error.message}`;
            addUserError.style.display = 'block';
        }
    }
}

// Update user
async function updateUser() {
    if (!appState.isHost) return;
    
    const userId = editUserId.value;
    const displayName = editDisplayName.value.trim();
    const password = editPassword.value;
    const role = editRole.value;
    const isActive = editIsActive.checked;
    
    if (!userId) return;
    
    try {
        const updateData = {
            display_name: displayName,
            role: role,
            is_active: isActive,
            updated_at: new Date().toISOString()
        };
        
        // Only update password if provided
        if (password) {
            updateData.password_hash = password;
        }
        
        const { error } = await supabaseClient
            .from('user_management')
            .update(updateData)
            .eq('id', userId);
        
        if (error) throw error;
        
        // Close modal and refresh list
        editUserModal.style.display = 'none';
        await loadUsers();
        
        // Show success message
        alert("User updated successfully!");
        
    } catch (error) {
        console.error("Error updating user:", error);
        if (editUserError) {
            editUserError.textContent = `Error: ${error.message}`;
            editUserError.style.display = 'block';
        }
    }
}

// Delete user
async function deleteUser(userId = null) {
    if (!appState.isHost) return;
    
    const targetUserId = userId || editUserId.value;
    if (!targetUserId) return;
    
    try {
        // Check if user is trying to delete themselves
        const { data: currentUser } = await supabaseClient
            .from('user_management')
            .select('username')
            .eq('username', appState.userName.toLowerCase())
            .single();
        
        if (currentUser) {
            const { data: targetUser } = await supabaseClient
                .from('user_management')
                .select('username')
                .eq('id', targetUserId)
                .single();
            
            if (targetUser && targetUser.username === currentUser.username) {
                alert("You cannot delete your own account!");
                return;
            }
        }
        
        // Delete the user
        const { error } = await supabaseClient
            .from('user_management')
            .delete()
            .eq('id', targetUserId);
        
        if (error) throw error;
        
        // Close modal if open
        editUserModal.style.display = 'none';
        
        // Refresh list
        await loadUsers();
        
        // Show success message
        alert("User deleted successfully!");
        
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("Error deleting user: " + error.message);
    }
}

// Make functions available globally
window.showFullImage = showFullImage;
window.editMessage = editMessage;
window.deleteMessage = deleteMessage;
window.replyToMessage = replyToMessage;
window.approveGuest = approveGuest;
window.denyGuest = denyGuest;
window.viewSessionHistory = viewSessionHistory;
window.downloadSession = downloadSession;
window.deleteSession = deleteSession;
window.editUserModalOpen = editUserModalOpen;
window.confirmDeleteUser = confirmDeleteUser;

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);
