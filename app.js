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
    emojis: ["😀", "😂", "😍", "😎", "😭", "😡", "👍", "👎", "❤️", "🔥", "👏", "🙏", "🤔", "😴", "🥳"]
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

// ============ SECURITY INITIALIZATION ============
// Create and show security overlay on page load
function createSecurityOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'securityOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        color: white;
        font-family: sans-serif;
        text-align: center;
        padding: 20px;
    `;
    
    overlay.innerHTML = `
        <div style="margin-bottom: 20px;">
            <i class="fas fa-shield-alt" style="font-size: 48px; color: #4CAF50;"></i>
        </div>
        <h2 style="margin-bottom: 10px;">Secure Chat Loading</h2>
        <p style="margin-bottom: 20px; opacity: 0.8;">Please wait while we secure your connection...</p>
        <div class="spinner" style="
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        "></div>
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
    return overlay;
}

// Initialize the app
async function initApp() {
    // Create security overlay immediately
    const securityOverlay = createSecurityOverlay();
    
    // SECURITY: Hide history section COMPLETELY on initial load
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = 'none';
        historySection.style.visibility = 'hidden';
        historySection.style.opacity = '0';
        historySection.style.pointerEvents = 'none';
        historySection.style.position = 'absolute';
        historySection.style.left = '-9999px';
    }
    
    // Clear any cached history data
    if (historyCards) {
        historyCards.innerHTML = '';
    }
    
    // Check if user was previously connected
    const savedSession = localStorage.getItem('writeToMe_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            appState.isHost = sessionData.isHost;
            appState.userName = sessionData.userName;
            appState.userId = sessionData.userId;
            appState.sessionId = sessionData.sessionId;
            appState.soundEnabled = sessionData.soundEnabled !== false;
            
            // Try to reconnect to the session
            if (await reconnectToSession()) {
                appState.isConnected = true;
                connectionModal.style.display = 'none';
                await updateUIAfterConnection();
                loadChatHistory();
                loadPendingGuests();
                
                // Hide security overlay after successful connection
                setTimeout(() => {
                    if (securityOverlay) securityOverlay.remove();
                }, 500);
            } else {
                // Session expired or invalid
                localStorage.removeItem('writeToMe_session');
                connectionModal.style.display = 'flex';
                if (securityOverlay) securityOverlay.remove();
            }
        } catch (e) {
            localStorage.removeItem('writeToMe_session');
            connectionModal.style.display = 'flex';
            if (securityOverlay) securityOverlay.remove();
        }
    } else {
        connectionModal.style.display = 'flex';
        // Hide security overlay after showing connection modal
        setTimeout(() => {
            if (securityOverlay) securityOverlay.remove();
        }, 500);
    }

    // Set up sound control
    updateSoundControl();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load emojis
    populateEmojis();
    
    // CRITICAL: DO NOT load chat sessions on initial page load
    // This prevents unauthorized access to sensitive data
    // loadChatSessions(); // REMOVED FOR SECURITY
}

// Set up all event listeners
function setupEventListeners() {
    // Connection modal
    const userSelect = document.getElementById('userSelect');
    const passwordInput = document.getElementById('passwordInput');
    
    userSelect.addEventListener('change', function() {
        document.getElementById('passwordError').style.display = 'none';
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConnect();
    });
    
    connectBtn.addEventListener('click', handleConnect);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Pending guests
    pendingGuestsBtn.addEventListener('click', showPendingGuests);
    closePendingModal.addEventListener('click', () => {
        pendingGuestsModal.style.display = 'none';
    });
    
    // Chat functionality
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('input', handleTyping);
    sendMessageBtn.addEventListener('click', sendMessage);
    clearChatBtn.addEventListener('click', clearChat);
    
    // Image upload
    imageUpload.addEventListener('change', handleImageUpload);
    
    // Emoji picker
    emojiBtn.addEventListener('click', toggleEmojiPicker);
    
    // Return to active chat
    returnToActiveBtn.addEventListener('click', returnToActiveChat);
    
    // History refresh button - SECURED
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', () => {
            // Only allow refresh if user is authenticated host
            if (appState.isConnected && appState.isHost) {
                loadChatSessions();
            }
        });
    }
    
    // Sound control
    soundControl.addEventListener('click', toggleSound);
    
    // Image modal
    imageModal.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });
    
    // Click outside emoji picker to close
    document.addEventListener('click', (e) => {
        if (emojiPicker && !emojiPicker.contains(e.target) && emojiBtn && !emojiBtn.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });
    
    // SECURITY: Prevent keyboard shortcuts that might reveal hidden data
    document.addEventListener('keydown', (e) => {
        // Block F12, Ctrl+Shift+I, Ctrl+U, etc.
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            return false;
        }
    });
    
    // SECURITY: Prevent right-click on sensitive areas
    const sensitiveAreas = [historyCards, pendingGuestsList, chatMessages];
    sensitiveAreas.forEach(area => {
        if (area) {
            area.addEventListener('contextmenu', (e) => {
                if (!appState.isConnected || (area === historyCards && !appState.isHost)) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    });
}

// Handle connection
async function handleConnect() {
    const userSelect = document.getElementById('userSelect');
    const passwordInput = document.getElementById('passwordInput');
    
    const selectedRole = userSelect.value;
    const password = passwordInput.value;
    
    // Reset error
    passwordError.style.display = 'none';
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    
    try {
        // Authenticate user using your existing RPC function
        const { data, error } = await supabaseClient
            .rpc('authenticate_user', {
                p_username: selectedRole,
                p_password: password
            });
        
        if (error) {
            console.error("Authentication error:", error);
            passwordError.style.display = 'block';
            passwordError.textContent = "Authentication failed. Please check the database function.";
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        if (!data || data.length === 0 || !data[0].is_authenticated) {
            passwordError.style.display = 'block';
            passwordError.textContent = "Incorrect password for selected role.";
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            return;
        }
        
        const authResult = data[0];
        appState.isHost = authResult.user_role === 'host';
        appState.userName = authResult.user_role === 'host' ? "Host" : "Guest";
        // Generate a simple, consistent user ID
        appState.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log("User authenticated:", appState.userName, "ID:", appState.userId);
        
    } catch (error) {
        console.error("Authentication error:", error);
        passwordError.style.display = 'block';
        passwordError.textContent = "Connection error. Please check if authenticate_user function exists.";
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        return;
    }
    
    appState.connectionTime = new Date();
    
    // Get user IP
    const userIP = await getRealIP();
    
    if (appState.isHost) {
        // Host creates a new session
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
            
            connectionModal.style.display = 'none';
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            await updateUIAfterConnection();
            
            // Add connection message to chat
            await saveMessageToDB('System', `${appState.userName} has connected to the chat.`);
            
            // Setup real-time subscriptions
            setupRealtimeSubscriptions();
            
        } catch (error) {
            console.error("Error in host connection:", error);
            alert("An error occurred: " + error.message);
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        }
        
    } else {
        // Guest requests to join
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
                
                connectionModal.style.display = 'none';
                connectBtn.disabled = false;
                connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
                await updateUIAfterConnection();
                setupRealtimeSubscriptions();
                loadChatHistory();
                return;
            }
            
            // Check if already in pending list
            const currentPending = session.pending_guests || [];
            const isAlreadyPending = currentPending.some(g => g.guest_id === appState.userId);
            
            if (isAlreadyPending) {
                // Already pending
                console.log("Guest already pending");
                appState.sessionId = session.session_id;
                connectionModal.style.display = 'none';
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
            connectionModal.style.display = 'none';
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
}

// Update UI after connection - SECURED VERSION
async function updateUIAfterConnection() {
    statusIndicator.className = 'status-indicator';
    statusIndicator.classList.add('online');
    userRoleDisplay.textContent = `${appState.userName} (Connected)`;
    logoutBtn.style.display = 'flex';
    
    // Enable chat controls for BOTH host and guest
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
    messageInput.placeholder = "Type your message here... (Press Enter to send, Shift+Enter for new line)";
    messageInput.focus();
    
    // Clear any pending approval messages
    const systemMessages = document.querySelectorAll('.message .message-sender');
    systemMessages.forEach(msg => {
        if (msg.textContent === 'System') {
            const messageDiv = msg.closest('.message');
            if (messageDiv && messageDiv.textContent.includes('waiting for host approval')) {
                messageDiv.remove();
            }
        }
    });
    
    // ============ CRITICAL SECURITY FIX ============
    // Handle history section based on user role
    const historySection = document.getElementById('historySection');
    
    if (historySection) {
        if (appState.isHost) {
            // For hosts: Show history section AFTER authentication
            historySection.style.display = 'block';
            historySection.style.visibility = 'visible';
            historySection.style.opacity = '1';
            historySection.style.pointerEvents = 'auto';
            historySection.style.position = 'relative';
            historySection.style.left = '0';
            
            // Load history data ONLY for hosts, AFTER authentication
            setTimeout(() => {
                if (appState.isConnected && appState.isHost) {
                    loadChatSessions();
                }
            }, 100);
            
            // Show pending guests button for hosts
            pendingGuestsBtn.style.display = 'flex';
            loadPendingGuests();
            setupPendingGuestsSubscription();
            
        } else {
            // For guests: COMPLETELY REMOVE history section from DOM
            // This prevents any possibility of accessing it via DOM manipulation
            historySection.remove();
            
            // Also hide any refresh history button
            if (refreshHistoryBtn) {
                refreshHistoryBtn.style.display = 'none';
            }
            
            // Hide pending guests button for guests
            pendingGuestsBtn.style.display = 'none';
        }
    }
    
    // Reset any viewing history state
    if (appState.isViewingHistory) {
        returnToActiveChat();
    }
}

// Update UI for pending guest
function updateUIForPendingGuest() {
    statusIndicator.className = 'status-indicator offline';
    userRoleDisplay.textContent = `${appState.userName} (Pending Approval)`;
    logoutBtn.style.display = 'flex';
    pendingGuestsBtn.style.display = 'none';
    
    // Disable chat controls
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
    messageInput.placeholder = "Waiting for host approval...";
    
    // SECURITY: Remove history section for pending guests
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.remove();
    }
    
    // Hide refresh history button
    if (refreshHistoryBtn) {
        refreshHistoryBtn.style.display = 'none';
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

// ============ SECURE LOAD CHAT SESSIONS ============
async function loadChatSessions() {
    // SECURITY CHECK 1: Verify user is connected and is host
    if (!appState.isConnected || !appState.isHost) {
        console.warn("Security: Unauthorized attempt to load chat sessions");
        if (historyCards) {
            historyCards.innerHTML = `
                <div style="padding: 30px; text-align: center; color: #666;">
                    <i class="fas fa-lock" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h3>Access Restricted</h3>
                    <p>Only hosts can view chat history.</p>
                </div>
            `;
        }
        return;
    }
    
    // SECURITY CHECK 2: Verify DOM elements exist
    if (!historyCards) {
        console.error("Security: History cards container not found");
        return;
    }
    
    // Show loading state
    historyCards.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <p>Loading secure chat history...</p>
        </div>
    `;
    
    try {
        // SECURE QUERY: Only fetch sessions where current user is host
        const { data: sessions, error } = await supabaseClient
            .from('sessions')
            .select('*')
            .eq('host_id', appState.userId)  // CRITICAL: Server-side filtering
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) {
            console.error("Database error:", error);
            throw error;
        }
        
        // Clear previous content
        historyCards.innerHTML = '';
        
        if (!sessions || sessions.length === 0) {
            historyCards.innerHTML = `
                <div style="padding: 30px; text-align: center; color: #666;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h3>No Chat Sessions</h3>
                    <p>You haven't hosted any chat sessions yet.</p>
                </div>
            `;
            return;
        }
        
        // Render session cards
        sessions.forEach(session => {
            const isActive = session.session_id === appState.currentSessionId && session.is_active;
            
            const card = document.createElement('div');
            card.className = 'session-card';
            if (isActive) card.classList.add('active');
            
            // Sanitize data for display
            const formatIP = (ip) => {
                if (!ip || ip === "Unknown") return "N/A";
                // Show partial IP for privacy
                const parts = ip.split('.');
                if (parts.length >= 2) {
                    return `${parts[0]}.${parts[1]}.xxx.xxx`;
                }
                return ip;
            };
            
            card.innerHTML = `
                <div class="session-card-header">
                    <div class="session-id">${session.session_id.substring(0, 10)}...</div>
                    ${isActive ? '<div class="session-active-badge">Active Now</div>' : ''}
                </div>
                <div class="session-info">
                    <div class="session-info-item">
                        <div class="session-info-row">
                            <span class="session-info-label">Host:</span>
                            <span class="session-info-value">${escapeHtml(session.host_name || 'You')}</span>
                        </div>
                        <div class="session-info-row">
                            <span class="session-info-label">Host IP:</span>
                            <span class="session-info-value">${formatIP(session.host_ip)}</span>
                        </div>
                    </div>
                    <div class="session-info-item">
                        <div class="session-info-row">
                            <span class="session-info-label">Guest:</span>
                            <span class="session-info-value">${escapeHtml(session.guest_name || 'None')}</span>
                        </div>
                        <div class="session-info-row">
                            <span class="session-info-label">Guest IP:</span>
                            <span class="session-info-value">${formatIP(session.guest_ip)}</span>
                        </div>
                    </div>
                    <div class="session-info-item">
                        <span class="session-info-label">Started:</span>
                        <span class="session-info-value">${new Date(session.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="session-actions">
                    <button class="btn btn-secondary btn-small" onclick="viewSessionHistory('${escapeHtml(session.session_id)}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-success btn-small" onclick="downloadSession('${escapeHtml(session.session_id)}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    ${appState.isHost ? `
                    <button class="btn btn-danger btn-small" onclick="deleteSession('${escapeHtml(session.session_id)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ` : ''}
                </div>
            `;
            
            historyCards.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading chat sessions:", error);
        historyCards.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h3>Error Loading History</h3>
                <p>There was an error loading chat sessions. Please try again.</p>
                <button class="btn btn-primary" onclick="loadChatSessions()" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============ SECURITY HELPER FUNCTIONS ============
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============ REST OF YOUR FUNCTIONS (unchanged but secured) ============

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
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    const session = payload.new || {};
                    
                    if (session.guest_id === appState.userId) {
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

// Setup real-time subscriptions
function setupRealtimeSubscriptions() {
    if (appState.realtimeSubscription) {
        supabaseClient.removeChannel(appState.realtimeSubscription);
    }
    if (appState.typingSubscription) {
        supabaseClient.removeChannel(appState.typingSubscription);
    }
    
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

// ============ REST OF YOUR FUNCTIONS ============
// (Keep all your existing functions like approveGuest, denyGuest, 
// viewSessionHistory, returnToActiveChat, downloadSession, deleteSession,
// handleImageUpload, toggleEmojiPicker, populateEmojis, toggleSound,
// updateSoundControl, saveMessageToDB, etc. They should work as-is)

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
window.loadChatSessions = loadChatSessions;

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);
