// app.js - Optimized version

// Global variables
let isSendingMessage = false;
let pendingImageFile = null;

// Supabase Configuration
const SUPABASE_URL = 'https://plqvqenoroacvzwtgoxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_91IHQ5--y4tDIo8L9X2ZJQ_YeThfdu_';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App State
const appState = {
    isHost: false, isConnected: false, userName: "Guest", userId: null,
    sessionId: null, currentSessionId: null, messages: [], typingTimeout: null,
    realtimeSubscription: null, typingSubscription: null, reactionsSubscription: null,
    pendingSubscription: null, soundEnabled: true, isViewingHistory: false,
    viewingSessionId: null, pendingGuests: [], emojis: ["😀", "😂", "😍", "😎", "😭", "😡", "👍", "👎", "❤️", "🔥", "👏", "🙏", "🤔", "😴", "🥳"],
    reactionEmojis: ["👍", "❤️", "😂", "😮", "😢", "😡"], users: [], guestNote: "",
    visitorNotes: [], unreadNotesCount: 0, showNotesPanel: false, allSessions: [],
    replyingTo: null, activeMessageActions: null
};

// DOM Elements
const elements = {
    connectionModal: document.getElementById('connectionModal'),
    connectBtn: document.getElementById('connectBtn'), passwordError: document.getElementById('passwordError'),
    logoutBtn: document.getElementById('logoutBtn'), pendingGuestsBtn: document.getElementById('pendingGuestsBtn'),
    pendingGuestsModal: document.getElementById('pendingGuestsModal'), closePendingModal: document.getElementById('closePendingModal'),
    pendingGuestsList: document.getElementById('pendingGuestsList'), noPendingGuests: document.getElementById('noPendingGuests'),
    statusIndicator: document.getElementById('statusIndicator'), userRoleDisplay: document.getElementById('userRoleDisplay'),
    pendingCount: document.getElementById('pendingCount'), chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'), sendMessageBtn: document.getElementById('sendMessageBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'), imageUpload: document.getElementById('imageUpload'),
    emojiBtn: document.getElementById('emojiBtn'), emojiPicker: document.getElementById('emojiPicker'),
    chatTitle: document.getElementById('chatTitle'), chatModeIndicator: document.getElementById('chatModeIndicator'),
    returnToActiveBtn: document.getElementById('returnToActiveBtn'), historyCards: document.getElementById('historyCards'),
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'), soundControl: document.getElementById('soundControl'),
    messageSound: document.getElementById('messageSound'), typingIndicator: document.getElementById('typingIndicator'),
    typingUser: document.getElementById('typingUser'), imageModal: document.getElementById('imageModal'),
    fullSizeImage: document.getElementById('fullSizeImage'), adminSection: document.getElementById('adminSection'),
    historyTabBtn: document.getElementById('historyTabBtn'), usersTabBtn: document.getElementById('usersTabBtn'),
    historyTabContent: document.getElementById('historyTabContent'), usersTabContent: document.getElementById('usersTabContent'),
    guestNoteInput: document.getElementById('guestNoteInput'), userManagementSection: document.getElementById('userManagementSection'),
    addUserBtn: document.getElementById('addUserBtn'), userSearchInput: document.getElementById('userSearchInput'),
    usersList: document.getElementById('usersList'), addUserModal: document.getElementById('addUserModal'),
    closeAddUserModal: document.getElementById('closeAddUserModal'), editUserModal: document.getElementById('editUserModal'),
    closeEditUserModal: document.getElementById('closeEditUserModal'), newUsername: document.getElementById('newUsername'),
    newDisplayName: document.getElementById('newDisplayName'), newPassword: document.getElementById('newPassword'),
    newRole: document.getElementById('newRole'), addUserError: document.getElementById('addUserError'),
    saveUserBtn: document.getElementById('saveUserBtn'), editUserId: document.getElementById('editUserId'),
    editUsername: document.getElementById('editUsername'), editDisplayName: document.getElementById('editDisplayName'),
    editPassword: document.getElementById('editPassword'), editRole: document.getElementById('editRole'),
    editIsActive: document.getElementById('editIsActive'), editUserError: document.getElementById('editUserError'),
    updateUserBtn: document.getElementById('updateUserBtn'), deleteUserBtn: document.getElementById('deleteUserBtn'),
    usernameInput: document.getElementById('usernameInput'), passwordInput: document.getElementById('passwordInput'),
    notesBtn: document.getElementById('notesBtn'), notesCount: document.getElementById('notesCount'),
    notesPanel: document.getElementById('notesPanel'), notesList: document.getElementById('notesList'),
    closeNotesPanel: document.getElementById('closeNotesPanel'), refreshNotesBtn: document.getElementById('refreshNotesBtn'),
    markAllReadBtn: document.getElementById('markAllReadBtn'), notesSearchInput: document.getElementById('notesSearchInput'),
    guestNotifyBtn: document.getElementById('guestNotifyBtn'), guestNotificationModal: document.getElementById('guestNotificationModal'),
    closeGuestNotifyModal: document.getElementById('closeGuestNotifyModal'), guestNotifyName: document.getElementById('guestNotifyName'),
    guestNotifyEmail: document.getElementById('guestNotifyEmail'), guestNotifyMessage: document.getElementById('guestNotifyMessage'),
    sendGuestNotification: document.getElementById('sendGuestNotification'), guestNotifyError: document.getElementById('guestNotifyError'),
    guestNotifySuccess: document.getElementById('guestNotifySuccess')
};

// Helper Functions
const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const getRealIP = async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        return (await res.json()).ip || "Unknown";
    } catch { return "Unknown"; }
};

const scrollToBottom = (delay = 50) => {
    setTimeout(() => {
        if (elements.chatMessages && !appState.isViewingHistory &&
            elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop - elements.chatMessages.clientHeight < 200) {
            elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' });
        }
    }, delay);
};

const forceScrollToBottom = (delay = 50) => {
    setTimeout(() => {
        if (elements.chatMessages && !appState.isViewingHistory) {
            elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' });
        }
    }, delay);
};

const saveSessionToStorage = () => {
    localStorage.setItem('writeToMe_session', JSON.stringify({
        isHost: appState.isHost, userName: appState.userName, userId: appState.userId,
        sessionId: appState.sessionId, soundEnabled: appState.soundEnabled
    }));
};

const addSystemMessage = (text, isLocal = false) => {
    const msg = document.createElement('div');
    msg.className = `message received${isLocal ? ' local-system' : ''}`;
    msg.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text">${text}</div><div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>`;
    elements.chatMessages.appendChild(msg);
    forceScrollToBottom(100);
};

const saveMessageToDB = async (senderName, messageText) => {
    try {
        await supabaseClient.from('messages').insert([{
            session_id: appState.currentSessionId, sender_id: 'system',
            sender_name: senderName, message: messageText, created_at: new Date().toISOString()
        }]);
        return { success: true };
    } catch (error) { console.error("Error saving system message:", error); return null; }
};

// Show/Hide Connection Modal
const showConnectionModal = () => {
    elements.connectionModal.style.display = 'flex';
    document.body.classList.add('modal-open');
    if (elements.usernameInput) elements.usernameInput.value = '';
    if (elements.passwordInput) elements.passwordInput.value = '';
    if (elements.passwordError) elements.passwordError.style.display = 'none';
    if (elements.connectBtn) { elements.connectBtn.disabled = false; elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect'; }
};

const hideConnectionModal = () => {
    elements.connectionModal.style.display = 'none';
    document.body.classList.remove('modal-open');
};

// Get Stable Room Number
const getStableRoomNumber = (sessionId) => {
    const index = appState.allSessions.findIndex(s => s.session_id === sessionId);
    return index === -1 ? '?' : (index + 1).toString();
};

// Load All Sessions
const loadAllSessions = async () => {
    try {
        const { data, error } = await supabaseClient.from('chat_sessions').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        appState.allSessions = data || [];
        return appState.allSessions;
    } catch (error) { console.error("Error loading all sessions:", error); appState.allSessions = []; return []; }
};

// Typing Handler
const handleTyping = async () => {
    if (!appState.currentSessionId || appState.isViewingHistory || !appState.isConnected || !appState.userName) return;
    if (appState.typingTimeout) clearTimeout(appState.typingTimeout);
    try {
        await supabaseClient.from('chat_sessions').update({ typing_user: appState.userName }).eq('session_id', appState.currentSessionId);
        appState.typingTimeout = setTimeout(async () => {
            await supabaseClient.from('chat_sessions').update({ typing_user: null }).eq('session_id', appState.currentSessionId);
        }, 2000);
    } catch (error) { console.error('Typing indicator error:', error); }
};

// Upload Image
const uploadImageToStorage = async (file) => {
    try {
        const fileName = `chat_images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${file.name.split('.').pop().toLowerCase()}`;
        const { error } = await supabaseClient.storage.from('chat-images').upload(fileName, file, { cacheControl: '3600', contentType: file.type });
        if (error) throw error;
        const { data: { publicUrl } } = supabaseClient.storage.from('chat-images').getPublicUrl(fileName);
        return publicUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    const max = 800;
                    if (w > h && w > max) { h = (h * max) / w; w = max; }
                    else if (h > max) { w = (w * max) / h; h = max; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
};

// Send Message to DB
const sendMessageToDB = async (text, imageInput, replyToId = null) => {
    try {
        let finalImageUrl = null;
        if (imageInput instanceof File) finalImageUrl = await uploadImageToStorage(imageInput);
        else if (typeof imageInput === 'string' && imageInput.startsWith('data:')) finalImageUrl = imageInput;
        else if (typeof imageInput === 'string' && imageInput.startsWith('http')) finalImageUrl = imageInput;

        const messageData = {
            session_id: appState.currentSessionId, sender_id: appState.userId,
            sender_name: appState.userName, message: text || '', created_at: new Date().toISOString()
        };
        if (replyToId && replyToId !== 'null') messageData.reply_to = replyToId;
        if (finalImageUrl) messageData.image_url = finalImageUrl;

        const { data, error } = await supabaseClient.from('messages').insert([messageData]).select().single();
        if (error) throw error;
        return { success: true, data };
    } catch (error) { console.error("Error sending message:", error); return null; }
};

// Send Message
const sendMessage = async () => {
    if (isSendingMessage || (!appState.isConnected && !appState.isViewingHistory)) return;
    
    const messageText = elements.messageInput.value.trim();
    const imageFile = pendingImageFile || elements.imageUpload.files[0];
    pendingImageFile = null;
    
    if (!messageText && !imageFile) return;
    
    isSendingMessage = true;
    const originalText = messageText;
    const originalFile = imageFile;
    const replyToId = appState.replyingTo;
    const replyToImage = appState.replyingToImage;
    
    appState.replyingTo = null;
    appState.replyingToImage = null;
    
    elements.messageInput.value = '';
    if (imageFile) elements.imageUpload.value = '';
    
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    let localPreview = imageFile ? URL.createObjectURL(imageFile) : null;
    
    // Optimistic display
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.id = `msg-${tempId}`;
    
    let content = '';
    if (replyToId) {
        let quotedSender = '', quotedText = '', quotedImg = replyToImage;
        const originalEl = document.getElementById(`msg-${replyToId}`);
        if (originalEl) {
            const senderEl = originalEl.querySelector('.message-sender');
            const textEl = originalEl.querySelector('.message-text');
            const imgEl = originalEl.querySelector('.message-image');
            if (senderEl) quotedSender = senderEl.textContent;
            if (textEl) quotedText = textEl.textContent.replace(/\s*\(edited\)\s*$/, '').substring(0, 100);
            if (imgEl && !quotedImg) quotedImg = imgEl.src;
        }
        if (!quotedSender && appState.messages) {
            const originalMsg = appState.messages.find(m => m.id === replyToId);
            if (originalMsg) {
                quotedSender = originalMsg.sender;
                quotedText = originalMsg.text?.substring(0, 100) || '';
                if (!quotedImg) quotedImg = originalMsg._realImageUrl || originalMsg.image;
            }
        }
        const hasImg = quotedImg && quotedImg.trim() !== '';
        content += `<div class="message-reply-ref"><i class="fas fa-reply"></i> <div class="reply-content"><span>Replying to <strong>${escapeHtml(quotedSender || 'someone')}</strong>: ${escapeHtml(quotedText) || '[Message]'}</span></div>${hasImg ? `<div class="reply-image-preview"><img src="${quotedImg}" style="max-width:30px;max-height:30px;border-radius:4px;" onclick="event.stopPropagation(); window.showFullImage('${quotedImg}')"></div>` : ''}</div>`;
    }
    if (originalText) content += `<div class="message-text">${escapeHtml(originalText).replace(/\n/g, '<br>')}</div>`;
    if (localPreview) content += `<img src="${localPreview}" class="message-image" onclick="window.showFullImage('${localPreview}')">`;
    
    messageDiv.innerHTML = `<div class="message-sender">${escapeHtml(appState.userName)}</div><div class="message-content">${content}<div class="message-reactions"></div><div class="message-footer"><div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><button class="message-action-dots" onclick="window.toggleMessageActions('${tempId}', this)"><i class="fas fa-ellipsis-v"></i></button></div></div><div class="message-actions-menu" id="actions-${tempId}" style="display:none;"><button onclick="window.editMessage('${tempId}')"><i class="fas fa-edit"></i> Edit</button><button onclick="window.deleteMessage('${tempId}')"><i class="fas fa-trash"></i> Delete</button><div class="menu-divider"></div><button class="reply-btn" data-message-id="${tempId}" data-sender="${escapeHtml(appState.userName)}" data-message-text="${escapeHtml(originalText)}"><i class="fas fa-reply"></i> Reply</button><div class="menu-divider"></div><div class="reaction-section"><div class="reaction-section-title"><i class="fas fa-smile"></i> Add Reaction</div><div class="reaction-quick-picker">${appState.reactionEmojis.map(emoji => `<button class="reaction-emoji-btn" onclick="window.addReaction('${tempId}', '${emoji}')">${emoji}</button>`).join('')}</div></div></div>`;
    elements.chatMessages.appendChild(messageDiv);
    forceScrollToBottom(50);
    
    try {
        const result = await sendMessageToDB(originalText, originalFile, replyToId);
        if (result?.success) {
            const msgElement = document.getElementById(`msg-${tempId}`);
            if (msgElement) {
                msgElement.id = `msg-${result.data.id}`;
                const actionsMenu = document.getElementById(`actions-${tempId}`);
                if (actionsMenu) actionsMenu.id = `actions-${result.data.id}`;
            }
            appState.messages.push({ id: result.data.id, sender: appState.userName, text: originalText, image: localPreview, time: new Date().toLocaleTimeString(), type: 'sent', reply_to: replyToId, _realImageUrl: result.data.image_url });
        } else throw new Error('Failed to send');
    } catch (error) {
        document.getElementById(`msg-${tempId}`)?.remove();
        if (originalText) { elements.messageInput.value = originalText; elements.messageInput.focus(); }
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message received';
        errorMsg.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Failed to send message.</div></div>`;
        elements.chatMessages.appendChild(errorMsg);
        forceScrollToBottom(100);
    } finally {
        isSendingMessage = false;
        if (elements.sendMessageBtn) {
            elements.sendMessageBtn.disabled = false;
            elements.sendMessageBtn.innerHTML = window.innerWidth <= 768 ? '<i class="fas fa-paper-plane"></i>' : '<i class="fas fa-paper-plane"></i> Send';
        }
        if (localPreview) URL.revokeObjectURL(localPreview);
    }
};

// Load Chat History
const loadChatHistory = async (sessionId = null, limit = 50) => {
    const targetId = sessionId || appState.currentSessionId;
    if (!targetId) return;
    
    if (elements.chatMessages && !sessionId) elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div></div></div>`;
    
    try {
        let query = supabaseClient.from('messages').select('*').eq('session_id', targetId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(limit);
        
        if (!appState.isHost && !sessionId) {
            const { data: cleared } = await supabaseClient.from('cleared_messages').select('message_id').eq('user_id', appState.userId).eq('session_id', targetId);
            if (cleared?.length) query = query.not('id', 'in', `(${cleared.map(c => c.message_id).join(',')})`);
        }
        
        const { data: messages, error } = await query;
        if (error) throw error;
        
        const orderedMessages = (messages || []).reverse();
        const messageIds = orderedMessages.map(m => m.id);
        const { data: allReactions } = await supabaseClient.from('message_reactions').select('*').in('message_id', messageIds);
        const reactionsMap = new Map();
        (allReactions || []).forEach(r => { if (!reactionsMap.has(r.message_id)) reactionsMap.set(r.message_id, []); reactionsMap.get(r.message_id).push(r); });
        
        if (elements.chatMessages && !sessionId) elements.chatMessages.innerHTML = '';
        
        if (sessionId) {
            const { data: session } = await supabaseClient.from('chat_sessions').select('created_at, host_name').eq('session_id', sessionId).single();
            if (session) {
                const historyHeader = document.createElement('div');
                historyHeader.className = 'message received historical';
                historyHeader.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text"><i class="fas fa-door-open"></i> Chat History - Room ${getStableRoomNumber(sessionId)}<br><small>Host: ${escapeHtml(session.host_name)} | Date: ${new Date(session.created_at).toLocaleDateString()}</small></div></div>`;
                elements.chatMessages.appendChild(historyHeader);
            }
        }
        
        if (orderedMessages.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'message received';
            emptyMsg.innerHTML = `<div class="message-sender">System</div><div class="message-content"><div class="message-text">No messages in this room yet.</div></div>`;
            elements.chatMessages.appendChild(emptyMsg);
            return;
        }
        
        orderedMessages.forEach(msg => {
            const messageType = msg.sender_id === appState.userId ? 'sent' : 'received';
            let replyToImage = null;
            if (msg.reply_to) {
                const originalMsg = orderedMessages.find(m => m.id === msg.reply_to);
                if (originalMsg?.image_url) replyToImage = originalMsg.image_url;
            }
            if (window.ChatModule?.displayMessage) {
                window.ChatModule.displayMessage({
                    id: msg.id, sender: msg.sender_name, text: msg.message, image: msg.image_url,
                    time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: messageType, is_historical: !!sessionId, reactions: reactionsMap.get(msg.id) || [],
                    reply_to: msg.reply_to, reply_to_image: replyToImage
                });
            }
        });
        
        appState.messages = orderedMessages;
        if (elements.chatMessages && !sessionId) forceScrollToBottom(100);
        else if (elements.chatMessages) elements.chatMessages.scrollTop = 0;
    } catch (error) { console.error("Error loading chat history:", error); }
};

// Clear Chat
const clearChat = async () => {
    if (!appState.isConnected || !appState.currentSessionId) return alert("You must be connected to clear chat.");
    if (!confirm("Are you sure you want to clear messages?")) return;
    try {
        if (appState.isHost) {
            await supabaseClient.from('messages').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: appState.userId }).eq('session_id', appState.currentSessionId);
            elements.chatMessages.innerHTML = '';
            appState.messages = [];
            addSystemMessage(`[${appState.userName}] deleted chat messages`);
            await saveMessageToDB('System', `[${appState.userName}] deleted chat messages`);
        } else {
            const { data: messages } = await supabaseClient.from('messages').select('id').eq('session_id', appState.currentSessionId).eq('is_deleted', false);
            if (messages?.length) {
                const batchSize = 100;
                for (let i = 0; i < messages.length; i += batchSize) {
                    await supabaseClient.from('cleared_messages').insert(messages.slice(i, i + batchSize).map(m => ({ user_id: appState.userId, message_id: m.id, session_id: appState.currentSessionId, cleared_at: new Date().toISOString() })));
                }
            }
            document.querySelectorAll('.message').forEach(m => m.remove());
            addSystemMessage(`Chat messages cleared`, true);
            await saveMessageToDB('System', `🔔 [${appState.userName}] cleared chat`);
        }
    } catch (error) { console.error("Error clearing chat:", error); alert("Failed to clear chat: " + error.message); }
};

// Setup Realtime Subscriptions
const setupRealtimeSubscriptions = () => {
    if (!appState.currentSessionId) return;
    
    if (appState.realtimeSubscription) supabaseClient.removeChannel(appState.realtimeSubscription);
    if (appState.typingSubscription) supabaseClient.removeChannel(appState.typingSubscription);
    if (appState.reactionsSubscription) supabaseClient.removeChannel(appState.reactionsSubscription);
    
    appState.realtimeSubscription = supabaseClient.channel('messages_' + appState.currentSessionId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${appState.currentSessionId}` }, async (payload) => {
            if (payload.new?.sender_id === appState.userId || document.getElementById(`msg-${payload.new.id}`)) return;
            let shouldDisplay = true;
            if (!appState.isHost && payload.new.sender_id !== appState.userId) {
                const { data: cleared } = await supabaseClient.from('cleared_messages').select('id').eq('user_id', appState.userId).eq('message_id', payload.new.id).maybeSingle();
                if (cleared) shouldDisplay = false;
            }
            if (shouldDisplay && window.ChatModule?.displayMessage) {
                const { data: reactions } = await supabaseClient.from('message_reactions').select('*').eq('message_id', payload.new.id);
                window.ChatModule.displayMessage({
                    id: payload.new.id, sender: payload.new.sender_name, text: payload.new.message,
                    image: payload.new.image_url, time: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: 'received', reactions: reactions || [], reply_to: payload.new.reply_to
                });
                forceScrollToBottom(100);
                if (appState.soundEnabled && window.playNotificationSound) window.playNotificationSound();
            }
        }).subscribe();
    
    appState.typingSubscription = supabaseClient.channel('typing_' + appState.currentSessionId)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_sessions', filter: `session_id=eq.${appState.currentSessionId}` }, (payload) => {
            const typingUser = payload.new?.typing_user;
            if (typingUser && typingUser !== appState.userName) {
                elements.typingUser.textContent = typingUser;
                elements.typingIndicator.classList.add('show');
                if (window.typingHideTimeout) clearTimeout(window.typingHideTimeout);
                window.typingHideTimeout = setTimeout(() => elements.typingIndicator.classList.remove('show'), 3000);
            } else if (!typingUser) elements.typingIndicator.classList.remove('show');
        }).subscribe();
    
    appState.reactionsSubscription = supabaseClient.channel(`reactions_${appState.currentSessionId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, async (payload) => {
            const messageId = payload.new?.message_id || payload.old?.message_id;
            if (!messageId) return;
            const { data: reactions } = await supabaseClient.from('message_reactions').select('*').eq('message_id', messageId);
            const msgElement = document.getElementById(`msg-${messageId}`);
            if (msgElement && window.ChatModule?.renderReactions) {
                const reactionsDiv = msgElement.querySelector('.message-reactions');
                if (reactionsDiv) window.ChatModule.renderReactions(reactionsDiv, reactions || []);
            }
        }).subscribe();
};

// Connect Functions
const handleConnect = async () => {
    const username = elements.usernameInput?.value.trim();
    const password = elements.passwordInput?.value;
    const guestNote = elements.guestNoteInput?.value.trim() || "";
    if (!username || !password) return;
    
    elements.passwordError.style.display = 'none';
    elements.connectBtn.disabled = true;
    elements.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    
    try {
        const { data: userData, error: userError } = await supabaseClient.from('user_management').select('id, username, display_name, password_hash, role, is_active').ilike('username', username).eq('is_active', true).single();
        if (userError || !userData) throw new Error("Invalid username or password.");
        
        let isAuthenticated = false;
        try {
            const { data: authResult } = await supabaseClient.rpc('verify_password', { stored_hash: userData.password_hash, password: password });
            if (authResult === true) isAuthenticated = true;
        } catch { isAuthenticated = ['admin', 'host', 'guest'].includes(username.toLowerCase()) && password === `${username.toLowerCase()}123`; }
        
        if (!isAuthenticated) throw new Error("Invalid username or password.");
        
        appState.isHost = userData.role === 'host';
        appState.userName = userData.display_name || userData.username;
        appState.userId = userData.id;
        appState.guestNote = guestNote;
        
        const userIP = await getRealIP();
        
        if (appState.isHost) {
            const sessionId = 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
            const { error } = await supabaseClient.from('chat_sessions').insert([{ session_id: sessionId, host_id: appState.userId, host_name: appState.userName, host_ip: userIP, is_active: true, requires_approval: true, created_at: new Date().toISOString(), max_guests: 50 }]).select().single();
            if (error) throw error;
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
            safeLoadAdminContent();
            await saveMessageToDB('System', `${appState.userName} has created a new chat room.`);
        } else {
            const { data: activeSessions } = await supabaseClient.from('chat_sessions').select('session_id, host_name, host_id').eq('is_active', true).order('created_at', { ascending: false });
            if (!activeSessions?.length) { alert("No active rooms available."); return; }
            
            const targetSession = activeSessions[0];
            const { data: existing } = await supabaseClient.from('session_guests').select('status, id').eq('session_id', targetSession.session_id).eq('guest_id', appState.userId).maybeSingle();
            
            if (existing?.status === 'approved') {
                completeGuestConnection(targetSession.session_id);
            } else if (existing?.status === 'pending') {
                appState.sessionId = targetSession.session_id;
                hideConnectionModal();
                updateUIForPendingGuest();
                setupPendingApprovalSubscription(targetSession.session_id);
            } else {
                const { error } = await supabaseClient.from('session_guests').insert([{ session_id: targetSession.session_id, guest_id: appState.userId, guest_name: appState.userName, guest_ip: userIP, guest_note: appState.guestNote, status: 'pending', requested_at: new Date().toISOString() }]);
                if (error) throw error;
                appState.sessionId = targetSession.session_id;
                hideConnectionModal();
                updateUIForPendingGuest();
                setupPendingApprovalSubscription(targetSession.session_id);
                if (appState.guestNote) await saveVisitorNote(targetSession.session_id, appState.guestNote, userIP);
            }
        }
        elements.connectBtn.disabled = false;
        elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    } catch (error) {
        elements.passwordError.style.display = 'block';
        elements.passwordError.textContent = error.message;
        elements.connectBtn.disabled = false;
        elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
    }
};

const completeGuestConnection = (sessionId) => {
    appState.sessionId = sessionId;
    appState.currentSessionId = sessionId;
    appState.isConnected = true;
    saveSessionToStorage();
    hideConnectionModal();
    updateUIAfterConnection();
    setupRealtimeSubscriptions();
    loadChatHistory();
    saveMessageToDB('System', `${appState.userName} has rejoined the chat.`);
};

const saveVisitorNote = async (sessionId, noteText, userIP) => {
    try {
        await supabaseClient.from('visitor_notes').insert([{ guest_id: appState.userId, guest_name: appState.userName, session_id: sessionId, note_text: noteText, guest_ip: userIP, created_at: new Date().toISOString(), read_by_host: false }]);
    } catch (error) { console.error("Error saving visitor note:", error); }
};

const updateUIForPendingGuest = () => {
    if (elements.statusIndicator) elements.statusIndicator.className = 'status-indicator offline';
    if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = `${appState.userName} (Pending Approval)`;
    if (elements.logoutBtn) elements.logoutBtn.style.display = 'flex';
    if (elements.messageInput) { elements.messageInput.disabled = true; elements.messageInput.placeholder = "Waiting for host approval..."; }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = true;
    if (elements.chatMessages) elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text">Your access request has been sent to the host. Please wait for approval.</div></div></div>`;
};

const setupPendingApprovalSubscription = (sessionId) => {
    if (appState.pendingSubscription) supabaseClient.removeChannel(appState.pendingSubscription);
    appState.pendingSubscription = supabaseClient.channel('guest_approval_' + appState.userId)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session_guests', filter: `guest_id=eq.${appState.userId}` }, async (payload) => {
            if (payload.new?.session_id === sessionId) {
                if (payload.new.status === 'approved') {
                    appState.currentSessionId = sessionId;
                    appState.isConnected = true;
                    saveSessionToStorage();
                    if (appState.pendingSubscription) supabaseClient.removeChannel(appState.pendingSubscription);
                    updateUIAfterConnection();
                    setupRealtimeSubscriptions();
                    await loadChatHistory();
                    await saveMessageToDB('System', `${appState.userName} has joined the chat.`);
                    alert("🎉 You have been approved! Welcome to the chat.");
                } else if (payload.new.status === 'rejected') { alert("Your access request was rejected by the host."); location.reload(); }
                else if (payload.new.status === 'kicked') { alert("You have been kicked from the chat by the host."); handleLogout(); }
            }
        }).subscribe();
};

const updateUIAfterConnection = () => {
    if (elements.statusIndicator) { elements.statusIndicator.className = 'status-indicator'; elements.statusIndicator.classList.add('online'); }
    if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = `${appState.userName} (Connected)`;
    if (elements.logoutBtn) elements.logoutBtn.style.display = 'flex';
    if (elements.messageInput) { elements.messageInput.disabled = false; elements.messageInput.placeholder = "Type your message..."; elements.messageInput.focus(); }
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
        elements.adminSection.style.display = appState.isHost ? 'block' : 'none';
        document.body.classList.toggle('host-mode', appState.isHost);
        if (elements.notesBtn) elements.notesBtn.style.display = appState.isHost ? 'flex' : 'none';
        if (appState.isHost) safeLoadAdminContent();
    }
    if (elements.pendingGuestsBtn) {
        elements.pendingGuestsBtn.style.display = appState.isHost && appState.currentSessionId ? 'flex' : 'none';
        if (appState.isHost) setupPendingGuestsSubscription();
    }
};

const safeLoadAdminContent = async () => {
    if (!appState.isHost || !appState.isConnected) return;
    await loadAllSessions();
    await loadChatSessions();
    await loadUsers();
    await loadPendingGuests();
    await loadVisitorNotes();
};

// Pending Guests
const setupPendingGuestsSubscription = () => {
    if (!appState.isHost || !appState.currentSessionId) return;
    if (appState.pendingSubscription) supabaseClient.removeChannel(appState.pendingSubscription);
    appState.pendingSubscription = supabaseClient.channel(`pending-${appState.currentSessionId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_guests', filter: `session_id=eq.${appState.currentSessionId}` }, (payload) => { if (payload.new?.status === 'pending') handleNewPendingGuest(payload.new); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session_guests', filter: `session_id=eq.${appState.currentSessionId}` }, (payload) => {
            if (payload.new?.status === 'pending') { if (!appState.pendingGuests.some(g => g.id === payload.new.id)) handleNewPendingGuest(payload.new); }
            else { appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== payload.new.id); updatePendingButtonUI(); if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList(); }
        }).subscribe();
    loadPendingGuests();
};

const handleNewPendingGuest = (guest) => {
    if (!appState.pendingGuests.some(g => g.id === guest.id)) appState.pendingGuests.push(guest);
    updatePendingButtonUI();
    if (appState.soundEnabled && window.playNotificationSound) window.playNotificationSound();
    addSystemMessage(`🔔 New guest request from ${guest.guest_name}${guest.guest_note ? ': ' + guest.guest_note : ''}`);
    if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
};

const loadPendingGuests = async () => {
    if (!appState.isHost || !appState.currentSessionId) return;
    try {
        const { data, error } = await supabaseClient.from('session_guests').select('*').eq('session_id', appState.currentSessionId).eq('status', 'pending').order('requested_at', { ascending: false });
        if (error) throw error;
        appState.pendingGuests = data || [];
        updatePendingButtonUI();
        if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
    } catch (error) { console.error("Error loading pending guests:", error); }
};

const updatePendingButtonUI = () => {
    if (!elements.pendingGuestsBtn || !elements.pendingCount) return;
    const count = appState.pendingGuests.length;
    elements.pendingCount.textContent = count;
    elements.pendingGuestsBtn.style.display = 'flex';
    elements.pendingGuestsBtn.innerHTML = `<i class="fas fa-user-clock"></i> <span id="pendingCount">${count}</span> Pending`;
};

const renderPendingGuestsList = () => {
    if (!elements.pendingGuestsList) return;
    elements.pendingGuestsList.innerHTML = '';
    if (appState.pendingGuests.length === 0) {
        if (elements.noPendingGuests) { elements.noPendingGuests.style.display = 'block'; elements.noPendingGuests.innerHTML = '<i class="fas fa-check-circle"></i> No pending guest requests'; }
        return;
    }
    if (elements.noPendingGuests) elements.noPendingGuests.style.display = 'none';
    appState.pendingGuests.forEach(guest => {
        const div = document.createElement('div');
        div.className = 'pending-guest';
        div.innerHTML = `<div class="guest-info"><div class="guest-name"><i class="fas fa-user"></i><strong>${escapeHtml(guest.guest_name)}</strong></div><div class="guest-details"><small><i class="fas fa-calendar"></i> ${new Date(guest.requested_at).toLocaleString()}</small><small><i class="fas fa-network-wired"></i> IP: ${guest.guest_ip || 'Unknown'}</small>${guest.guest_note ? `<div class="guest-note"><i class="fas fa-sticky-note"></i> ${escapeHtml(guest.guest_note)}</div>` : ''}</div></div><div class="guest-actions"><button class="btn btn-success btn-small" onclick="window.approveGuest('${guest.id}')"><i class="fas fa-check"></i> Approve</button><button class="btn btn-danger btn-small" onclick="window.denyGuest('${guest.id}')"><i class="fas fa-times"></i> Deny</button></div>`;
        elements.pendingGuestsList.appendChild(div);
    });
};

window.approveGuest = async (guestRecordId) => {
    try {
        const { data: guest, error } = await supabaseClient.from('session_guests').select('*').eq('id', guestRecordId).single();
        if (error) throw error;
        await supabaseClient.from('session_guests').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', guestRecordId);
        appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== guestRecordId);
        updatePendingButtonUI();
        if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
        await saveMessageToDB('System', `${guest.guest_name} has been approved and joined the chat.`);
    } catch (error) { console.error("Error approving guest:", error); alert("Failed to approve guest: " + error.message); }
};

window.denyGuest = async (guestRecordId) => {
    try {
        const { data: guest, error } = await supabaseClient.from('session_guests').select('*').eq('id', guestRecordId).single();
        if (error) throw error;
        await supabaseClient.from('session_guests').update({ status: 'rejected', left_at: new Date().toISOString() }).eq('id', guestRecordId);
        appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== guestRecordId);
        updatePendingButtonUI();
        if (elements.pendingGuestsModal?.style.display === 'flex') renderPendingGuestsList();
    } catch (error) { console.error("Error denying guest:", error); alert("Failed to deny guest: " + error.message); }
};

// Logout
const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    if (elements.chatMessages) elements.chatMessages.innerHTML = `<div class="message received"><div class="message-sender">System</div><div class="message-content"><div class="message-text">Disconnected. Please reconnect to continue.</div></div></div>`;
    if (elements.statusIndicator) elements.statusIndicator.className = 'status-indicator offline';
    if (elements.userRoleDisplay) elements.userRoleDisplay.textContent = "Disconnected";
    if (elements.logoutBtn) elements.logoutBtn.style.display = 'none';
    if (elements.messageInput) { elements.messageInput.disabled = true; elements.messageInput.value = ''; elements.messageInput.placeholder = "Please connect to start chatting"; }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = true;
    if (elements.adminSection) elements.adminSection.style.display = 'none';
    document.body.classList.remove('host-mode');
    
    if (appState.isConnected && appState.currentSessionId) {
        try {
            if (appState.isHost) await supabaseClient.from('chat_sessions').update({ is_active: false, ended_at: new Date().toISOString() }).eq('session_id', appState.currentSessionId);
            else await supabaseClient.from('session_guests').update({ status: 'left', left_at: new Date().toISOString() }).eq('session_id', appState.currentSessionId).eq('guest_id', appState.userId);
        } catch (error) { console.error("Error updating session on logout:", error); }
    }
    
    [appState.realtimeSubscription, appState.typingSubscription, appState.pendingSubscription, appState.reactionsSubscription].forEach(sub => { if (sub) supabaseClient.removeChannel(sub); });
    localStorage.removeItem('writeToMe_session');
    Object.assign(appState, { isHost: false, isConnected: false, userName: "Guest", userId: null, sessionId: null, currentSessionId: null, messages: [], isViewingHistory: false, viewingSessionId: null, pendingGuests: [], guestNote: "", replyingTo: null });
    showConnectionModal();
};

// Chat Sessions (History)
const loadChatSessions = async () => {
    if (!appState.isHost) return;
    try {
        const { data: sessions, error } = await supabaseClient.from('chat_sessions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!elements.historyCards) return;
        elements.historyCards.innerHTML = '';
        
        for (const session of sessions) {
            const isActive = session.session_id === appState.currentSessionId && session.is_active;
            const roomNumber = getStableRoomNumber(session.session_id);
            const { data: guests } = await supabaseClient.from('session_guests').select('*').eq('session_id', session.session_id);
            const guestCount = guests?.filter(g => g.status === 'approved').length || 0;
            const startDate = new Date(session.created_at);
            const endDate = session.ended_at ? new Date(session.ended_at) : null;
            let duration = 'Ongoing';
            if (endDate) {
                const diffMs = endDate - startDate;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays > 0) duration = `${diffDays}d ${diffHours % 24}h`;
                else if (diffHours > 0) duration = `${diffHours}h ${diffMins % 60}m`;
                else duration = `${diffMins}m`;
            }
            
            const card = document.createElement('div');
            card.className = `session-card${isActive ? ' active' : ''}`;
            card.innerHTML = `<div class="session-card-header"><div class="session-header-left"><div class="session-id"><i class="fas fa-door-open"></i> Room ${roomNumber}</div><div class="session-stats"><div class="stat-item guest-count"><i class="fas fa-users"></i><span>${guestCount} Guests</span></div><div class="stat-item duration-badge"><i class="fas fa-clock"></i><span>${duration}</span></div><div class="stat-item status-badge"><i class="fas fa-${session.is_active ? 'play-circle' : 'stop-circle'}"></i><span>${session.is_active ? 'Active' : 'Ended'}</span></div></div></div>${isActive ? '<div class="session-active-badge"><i class="fas fa-circle"></i> Live</div>' : ''}</div><div class="session-info"><div class="session-info-section"><div class="session-info-section-title"><i class="fas fa-info-circle"></i> Room Information</div><div class="guest-info-rows"><div class="guest-info-row"><span class="guest-info-label"><i class="fas fa-user-crown"></i> Host:</span><span class="guest-info-value">${escapeHtml(session.host_name)}</span></div><div class="guest-info-row"><span class="guest-info-label"><i class="fas fa-calendar-alt"></i> Created:</span><span class="guest-info-value">${startDate.toLocaleString()}</span></div><div class="guest-info-row"><span class="guest-info-label"><i class="fas fa-network-wired"></i> Host IP:</span><span class="guest-info-value">${session.host_ip || 'Unknown'}</span></div></div></div>${guests?.length ? `<div class="session-info-section"><div class="session-info-section-title"><i class="fas fa-users"></i> Guests (${guests.length})</div><div class="guest-list-container"><div class="guest-list">${guests.slice(0, 3).map(g => `<div class="guest-item"><div class="guest-item-info"><div class="guest-name"><i class="fas fa-user"></i>${escapeHtml(g.guest_name)}</div><div class="guest-meta"><span><i class="fas fa-${g.status === 'approved' ? 'check-circle' : g.status === 'pending' ? 'clock' : 'times-circle'}"></i> ${g.status}</span><span><i class="fas fa-network-wired"></i> ${g.guest_ip || 'Unknown'}</span></div>${g.guest_note ? `<div class="guest-note small"><i class="fas fa-sticky-note"></i> ${escapeHtml(g.guest_note)}</div>` : ''}</div>${isActive && g.status === 'approved' && g.guest_id !== appState.userId ? `<button class="btn btn-danger btn-small" onclick="window.kickGuest('${g.id}', '${escapeHtml(g.guest_name)}')"><i class="fas fa-user-slash"></i> Kick</button>` : ''}</div>`).join('')}${guests.length > 3 ? `<div class="guest-item" style="justify-content:center;background:rgba(138,43,226,0.1);"><div class="guest-name"><i class="fas fa-ellipsis-h"></i>${guests.length - 3} more guests...</div></div>` : ''}</div></div></div>` : ''}</div><div class="session-actions"><button class="btn btn-secondary btn-small" onclick="window.viewSessionHistory('${session.session_id}')"><i class="fas fa-eye"></i> View Chat</button><button class="btn btn-info btn-small" onclick="window.showSessionGuests('${session.session_id}')"><i class="fas fa-users"></i> Guest Details</button>${appState.isHost && !isActive ? `<button class="btn btn-danger btn-small" onclick="window.deleteSession('${session.session_id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}</div>`;
            elements.historyCards.appendChild(card);
        }
    } catch (error) { console.error("Error loading sessions:", error); }
};

window.viewSessionHistory = async (sessionId) => {
    appState.isViewingHistory = true;
    appState.viewingSessionId = sessionId;
    if (elements.chatModeIndicator) elements.chatModeIndicator.style.display = 'flex';
    if (elements.chatTitle) elements.chatTitle.innerHTML = `<i class="fas fa-door-open"></i> History View`;
    if (elements.messageInput) { elements.messageInput.disabled = false; elements.messageInput.placeholder = "Type your message..."; }
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = false;
    await loadChatHistory(sessionId);
    if (elements.chatMessages) elements.chatMessages.scrollTop = 0;
};

const returnToActiveChat = () => {
    appState.isViewingHistory = false;
    appState.viewingSessionId = null;
    if (elements.chatModeIndicator) elements.chatModeIndicator.style.display = 'none';
    if (elements.chatTitle) elements.chatTitle.innerHTML = '<i class="fas fa-comments"></i> Active Chat';
    if (elements.messageInput) elements.messageInput.disabled = false;
    if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = false;
    if (elements.chatMessages) elements.chatMessages.innerHTML = '';
    loadChatHistory();
    forceScrollToBottom(200);
};

window.deleteSession = async (sessionId) => {
    if (!appState.isHost) return alert("Only hosts can delete sessions.");
    if (!confirm("⚠️ WARNING: Delete this session permanently? This CANNOT be undone!")) return;
    try {
        if (appState.currentSessionId === sessionId) {
            [appState.realtimeSubscription, appState.typingSubscription, appState.pendingSubscription, appState.reactionsSubscription].forEach(sub => { if (sub) supabaseClient.removeChannel(sub); });
        }
        await supabaseClient.from('message_reactions').delete().in('message_id', supabaseClient.from('messages').select('id').eq('session_id', sessionId));
        await supabaseClient.from('cleared_messages').delete().eq('session_id', sessionId);
        await supabaseClient.from('visitor_notes').delete().eq('session_id', sessionId);
        await supabaseClient.from('messages').delete().eq('session_id', sessionId);
        await supabaseClient.from('session_guests').delete().eq('session_id', sessionId);
        await supabaseClient.from('chat_sessions').delete().eq('session_id', sessionId);
        await loadAllSessions();
        if (appState.currentSessionId === sessionId) { appState.currentSessionId = null; appState.isConnected = false; }
        if (appState.viewingSessionId === sessionId) returnToActiveChat();
        await loadChatSessions();
        addSystemMessage("✅ Session deleted successfully", true);
    } catch (error) { console.error("Error deleting session:", error); alert("Failed to delete session: " + error.message); }
};

window.kickGuest = async (guestId, guestName) => {
    if (!appState.isHost || !appState.currentSessionId) return alert("Only hosts can kick guests.");
    if (!confirm(`Kick ${guestName} from the chat?`)) return;
    try {
        await supabaseClient.from('session_guests').update({ status: 'kicked', left_at: new Date().toISOString() }).eq('id', guestId).eq('session_id', appState.currentSessionId);
        await saveMessageToDB('System', `${guestName} has been kicked from the chat by host.`);
        loadPendingGuests();
        loadChatSessions();
    } catch (error) { console.error("Error kicking guest:", error); alert("Failed to kick guest: " + error.message); }
};

// User Management
const loadUsers = async () => {
    if (!appState.isHost) return;
    try {
        const { data, error } = await supabaseClient.from('user_management').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        appState.users = data || [];
        if (elements.usersList) {
            if (!appState.users.length) elements.usersList.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary);"><i class="fas fa-users-slash" style="font-size:48px;margin-bottom:15px;"></i><h3>No Users Found</h3><p>Click "Add New User" to create your first user.</p></div>`;
            else elements.usersList.innerHTML = appState.users.map(user => `<div class="user-card ${user.role}${!user.is_active ? ' inactive' : ''}"><div class="user-header"><div class="user-name"><i class="fas fa-user"></i><h3>${escapeHtml(user.display_name)}</h3></div><div class="user-badges"><span class="user-badge badge-${user.role}">${user.role}</span>${!user.is_active ? '<span class="user-badge badge-inactive">Inactive</span>' : ''}</div></div><div class="user-details"><div class="user-detail"><span class="user-detail-label">Username:</span><span class="user-detail-value">${escapeHtml(user.username)}</span></div><div class="user-detail"><span class="user-detail-label">Created:</span><span class="user-detail-value">${new Date(user.created_at).toLocaleDateString()}</span></div><div class="user-detail"><span class="user-detail-label">Last Login:</span><span class="user-detail-value">${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span></div></div><div class="user-actions"><button class="btn btn-secondary btn-small" onclick="window.editUserModalOpen('${user.id}')"><i class="fas fa-edit"></i> Edit</button></div></div>`).join('');
        }
    } catch (error) { console.error("Error loading users:", error); }
};

window.editUserModalOpen = (userId) => {
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;
    if (elements.editUserId) elements.editUserId.value = user.id;
    if (elements.editUsername) elements.editUsername.value = user.username;
    if (elements.editDisplayName) elements.editDisplayName.value = user.display_name;
    if (elements.editPassword) elements.editPassword.value = '';
    if (elements.editRole) elements.editRole.value = user.role;
    if (elements.editIsActive) elements.editIsActive.checked = user.is_active;
    if (elements.editUserError) elements.editUserError.style.display = 'none';
    if (elements.editUserModal) elements.editUserModal.style.display = 'flex';
};

const saveNewUser = async () => {
    const username = elements.newUsername?.value.trim();
    const displayName = elements.newDisplayName?.value.trim();
    const password = elements.newPassword?.value;
    const role = elements.newRole?.value;
    if (!username || !displayName || !password) return;
    try {
        await supabaseClient.from('user_management').insert([{ username, display_name: displayName, password_hash: password, role, created_by: appState.userName, is_active: true }]);
        if (elements.addUserModal) elements.addUserModal.style.display = 'none';
        await loadUsers();
        alert(`User "${username}" created successfully!`);
    } catch (error) { if (elements.addUserError) { elements.addUserError.textContent = `Error: ${error.message}`; elements.addUserError.style.display = 'block'; } }
};

const updateUser = async () => {
    const userId = elements.editUserId?.value;
    const displayName = elements.editDisplayName?.value.trim();
    const password = elements.editPassword?.value;
    const role = elements.editRole?.value;
    const isActive = elements.editIsActive?.checked;
    if (!userId) return;
    try {
        const updateData = { display_name: displayName, role, is_active: isActive, updated_at: new Date().toISOString() };
        if (password) updateData.password_hash = password;
        await supabaseClient.from('user_management').update(updateData).eq('id', userId);
        if (elements.editUserModal) elements.editUserModal.style.display = 'none';
        await loadUsers();
        alert("User updated successfully!");
    } catch (error) { if (elements.editUserError) { elements.editUserError.textContent = `Error: ${error.message}`; elements.editUserError.style.display = 'block'; } }
};

const deleteUser = async () => {
    const userId = elements.editUserId?.value;
    if (!userId || !confirm("Delete this user? This cannot be undone.")) return;
    try {
        await supabaseClient.from('user_management').delete().eq('id', userId);
        if (elements.editUserModal) elements.editUserModal.style.display = 'none';
        await loadUsers();
        alert("User deleted successfully!");
    } catch (error) { alert("Error deleting user: " + error.message); }
};

// Visitor Notes
const loadVisitorNotes = async () => {
    if (!appState.isHost) return;
    try {
        const { data, error } = await supabaseClient.from('visitor_notes').select('*').eq('is_archived', false).order('created_at', { ascending: false });
        if (error) throw error;
        appState.visitorNotes = data || [];
        appState.unreadNotesCount = appState.visitorNotes.filter(n => !n.read_by_host).length;
        updateNotesButtonUI();
        if (appState.showNotesPanel) renderVisitorNotes(appState.visitorNotes);
    } catch (error) { console.error("Error loading visitor notes:", error); }
};

const renderVisitorNotes = (notes) => {
    if (!elements.notesList) return;
    if (!notes?.length) { elements.notesList.innerHTML = `<div class="no-notes-message"><i class="fas fa-sticky-note"></i><p>No visitor notes yet</p><small>Notes from guests will appear here</small></div>`; return; }
    elements.notesList.innerHTML = notes.map(note => {
        const createdDate = note.created_at ? new Date(note.created_at).toLocaleString() : 'Unknown date';
        const isGuestNotification = note.is_guest_notification || note.note_text?.includes('GUEST NOTIFICATION');
        let displayName = note.guest_name || 'Unknown', displayMessage = note.note_text || 'No message', emailInfo = '';
        if (isGuestNotification && note.note_text) {
            const lines = note.note_text.split('\n');
            displayName = lines.find(l => l.startsWith('From:'))?.replace('From:', '').trim() || displayName;
            const emailLine = lines.find(l => l.startsWith('Email:'));
            if (emailLine) emailInfo = `<div class="note-email"><i class="fas fa-envelope"></i> ${escapeHtml(emailLine.replace('Email:', '').trim())}</div>`;
            const msgLine = lines.find(l => l.startsWith('Message:'));
            if (msgLine) displayMessage = msgLine.replace('Message:', '').trim();
        }
        return `<div class="visitor-note-item ${note.read_by_host ? 'read' : 'unread'}" data-note-id="${note.id}"><div class="note-header"><div class="note-guest-info"><i class="fas ${isGuestNotification ? 'fa-bell' : 'fa-user'}"></i><strong>${isGuestNotification ? '📬 Guest Message' : escapeHtml(displayName)}</strong>${!note.read_by_host ? '<span class="unread-badge">New</span>' : ''}</div><div class="note-time"><i class="fas fa-clock"></i> ${createdDate}</div></div><div class="note-content"><div class="note-from"><i class="fas fa-user"></i> From: ${escapeHtml(displayName)}</div>${emailInfo}<div class="note-text">${escapeHtml(displayMessage)}</div>${note.guest_ip ? `<div class="note-ip"><i class="fas fa-network-wired"></i> IP: ${escapeHtml(note.guest_ip)}</div>` : ''}${note.guest_email ? `<div class="note-email"><i class="fas fa-envelope"></i> Email: ${escapeHtml(note.guest_email)}</div>` : ''}</div><div class="note-actions"><button class="btn btn-small btn-success" onclick="window.markNoteAsRead('${note.id}')" ${note.read_by_host ? 'disabled' : ''}><i class="fas fa-check"></i> Mark Read</button><button class="btn btn-small btn-info" onclick="window.archiveNote('${note.id}')"><i class="fas fa-archive"></i> Archive</button></div></div>`;
    }).join('');
};

window.markNoteAsRead = async (noteId) => {
    if (!appState.isHost) return;
    try {
        await supabaseClient.from('visitor_notes').update({ read_by_host: true, read_at: new Date().toISOString(), host_id: appState.userId }).eq('id', noteId);
        const note = appState.visitorNotes.find(n => n.id === noteId);
        if (note) note.read_by_host = true;
        appState.unreadNotesCount = appState.visitorNotes.filter(n => !n.read_by_host).length;
        updateNotesButtonUI();
        renderVisitorNotes(appState.visitorNotes);
    } catch (error) { console.error("Error marking note as read:", error); }
};

window.archiveNote = async (noteId) => {
    if (!appState.isHost || !confirm("Archive this note?")) return;
    try {
        await supabaseClient.from('visitor_notes').update({ is_archived: true }).eq('id', noteId);
        appState.visitorNotes = appState.visitorNotes.filter(n => n.id !== noteId);
        appState.unreadNotesCount = appState.visitorNotes.filter(n => !n.read_by_host).length;
        updateNotesButtonUI();
        renderVisitorNotes(appState.visitorNotes);
    } catch (error) { console.error("Error archiving note:", error); }
};

const updateNotesButtonUI = () => {
    if (!elements.notesBtn || !elements.notesCount) return;
    elements.notesCount.textContent = appState.unreadNotesCount || 0;
    if (appState.unreadNotesCount > 0) { elements.notesBtn.classList.add('has-unread'); elements.notesCount.style.display = 'inline'; }
    else { elements.notesBtn.classList.remove('has-unread'); elements.notesCount.style.display = 'none'; }
};

const toggleNotesPanel = () => {
    appState.showNotesPanel = !appState.showNotesPanel;
    if (appState.showNotesPanel) { elements.notesPanel?.classList.add('show'); loadVisitorNotes(); }
    else elements.notesPanel?.classList.remove('show');
};

// Guest Notification
const showGuestNotificationModal = () => {
    if (elements.guestNotifyName) elements.guestNotifyName.value = '';
    if (elements.guestNotifyEmail) elements.guestNotifyEmail.value = '';
    if (elements.guestNotifyMessage) elements.guestNotifyMessage.value = '';
    if (elements.guestNotifyError) elements.guestNotifyError.style.display = 'none';
    if (elements.guestNotifySuccess) elements.guestNotifySuccess.style.display = 'none';
    if (elements.guestNotificationModal) elements.guestNotificationModal.style.display = 'flex';
};

const sendGuestNotificationToAdmin = async () => {
    const name = elements.guestNotifyName?.value.trim();
    const email = elements.guestNotifyEmail?.value.trim();
    const message = elements.guestNotifyMessage?.value.trim();
    if (!name || !message) return;
    elements.sendGuestNotification.disabled = true;
    elements.sendGuestNotification.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    try {
        const userIP = await getRealIP();
        const noteText = `📬 GUEST NOTIFICATION\nFrom: ${name}\n${email ? 'Email: ' + email + '\n' : ''}Message: ${message}`;
        await supabaseClient.from('visitor_notes').insert([{ guest_name: name, guest_email: email || null, note_text: noteText, guest_ip: userIP, created_at: new Date().toISOString(), read_by_host: false, is_guest_notification: true }]);
        if (elements.guestNotifySuccess) { elements.guestNotifySuccess.style.display = 'block'; elements.guestNotifySuccess.innerHTML = '<i class="fas fa-check-circle"></i> ✅ Your message has been sent!'; }
        if (elements.guestNotifyName) elements.guestNotifyName.value = '';
        if (elements.guestNotifyEmail) elements.guestNotifyEmail.value = '';
        if (elements.guestNotifyMessage) elements.guestNotifyMessage.value = '';
        setTimeout(() => { if (elements.guestNotificationModal) elements.guestNotificationModal.style.display = 'none'; }, 3000);
    } catch (error) {
        if (elements.guestNotifyError) { elements.guestNotifyError.innerHTML = `<i class="fas fa-exclamation-circle"></i> Failed to send message. Please try again.`; elements.guestNotifyError.style.display = 'block'; }
    } finally {
        elements.sendGuestNotification.disabled = false;
        elements.sendGuestNotification.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }
};

// Event Listeners Setup
const setupEventListeners = () => {
    if (elements.connectBtn) elements.connectBtn.addEventListener('click', handleConnect);
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);
    if (elements.sendMessageBtn) elements.sendMessageBtn.addEventListener('click', () => sendMessage());
    if (elements.messageInput) elements.messageInput.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSendingMessage) { e.preventDefault(); sendMessage(); } });
    if (elements.messageInput) elements.messageInput.addEventListener('input', handleTyping);
    if (elements.imageUpload) elements.imageUpload.addEventListener('change', async (e) => { pendingImageFile = e.target.files[0]; await sendMessage(); e.target.value = ''; });
    if (elements.emojiBtn) elements.emojiBtn.addEventListener('click', () => elements.emojiPicker?.classList.toggle('show'));
    if (elements.clearChatBtn) elements.clearChatBtn.addEventListener('click', clearChat);
    if (elements.returnToActiveBtn) elements.returnToActiveBtn.addEventListener('click', returnToActiveChat);
    if (elements.refreshHistoryBtn) elements.refreshHistoryBtn.addEventListener('click', async () => { await loadAllSessions(); loadChatSessions(); });
    if (elements.soundControl) elements.soundControl.addEventListener('click', () => { appState.soundEnabled = !appState.soundEnabled; elements.soundControl.innerHTML = appState.soundEnabled ? '<i class="fas fa-volume-up"></i> <span>Sound On</span>' : '<i class="fas fa-volume-mute"></i> <span>Sound Off</span>'; saveSessionToStorage(); });
    if (elements.pendingGuestsBtn) elements.pendingGuestsBtn.addEventListener('click', () => { renderPendingGuestsList(); if (elements.pendingGuestsModal) elements.pendingGuestsModal.style.display = 'flex'; });
    if (elements.closePendingModal) elements.closePendingModal.addEventListener('click', () => { if (elements.pendingGuestsModal) elements.pendingGuestsModal.style.display = 'none'; });
    if (elements.historyTabBtn) elements.historyTabBtn.addEventListener('click', () => { elements.historyTabBtn.classList.add('active'); elements.usersTabBtn.classList.remove('active'); elements.historyTabContent.style.display = 'block'; elements.usersTabContent.style.display = 'none'; loadChatSessions(); });
    if (elements.usersTabBtn) elements.usersTabBtn.addEventListener('click', () => { elements.usersTabBtn.classList.add('active'); elements.historyTabBtn.classList.remove('active'); elements.usersTabContent.style.display = 'block'; elements.historyTabContent.style.display = 'none'; loadUsers(); });
    if (elements.notesBtn) elements.notesBtn.addEventListener('click', toggleNotesPanel);
    if (elements.closeNotesPanel) elements.closeNotesPanel.addEventListener('click', toggleNotesPanel);
    if (elements.refreshNotesBtn) elements.refreshNotesBtn.addEventListener('click', loadVisitorNotes);
    if (elements.markAllReadBtn) elements.markAllReadBtn.addEventListener('click', async () => { const unread = appState.visitorNotes.filter(n => !n.read_by_host); if (unread.length) { await supabaseClient.from('visitor_notes').update({ read_by_host: true, read_at: new Date().toISOString(), host_id: appState.userId }).in('id', unread.map(n => n.id)); appState.visitorNotes.forEach(n => n.read_by_host = true); appState.unreadNotesCount = 0; updateNotesButtonUI(); renderVisitorNotes(appState.visitorNotes); } });
    if (elements.notesSearchInput) elements.notesSearchInput.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); if (!term) renderVisitorNotes(appState.visitorNotes); else renderVisitorNotes(appState.visitorNotes.filter(n => n.guest_name?.toLowerCase().includes(term) || n.note_text?.toLowerCase().includes(term) || n.guest_ip?.includes(term))); });
    if (elements.guestNotifyBtn) elements.guestNotifyBtn.addEventListener('click', showGuestNotificationModal);
    if (elements.closeGuestNotifyModal) elements.closeGuestNotifyModal.addEventListener('click', () => { if (elements.guestNotificationModal) elements.guestNotificationModal.style.display = 'none'; });
    if (elements.sendGuestNotification) elements.sendGuestNotification.addEventListener('click', sendGuestNotificationToAdmin);
    if (elements.addUserBtn) elements.addUserBtn.addEventListener('click', () => { if (elements.addUserModal) elements.addUserModal.style.display = 'flex'; });
    if (elements.closeAddUserModal) elements.closeAddUserModal.addEventListener('click', () => { if (elements.addUserModal) elements.addUserModal.style.display = 'none'; });
    if (elements.closeEditUserModal) elements.closeEditUserModal.addEventListener('click', () => { if (elements.editUserModal) elements.editUserModal.style.display = 'none'; });
    if (elements.saveUserBtn) elements.saveUserBtn.addEventListener('click', saveNewUser);
    if (elements.updateUserBtn) elements.updateUserBtn.addEventListener('click', updateUser);
    if (elements.deleteUserBtn) elements.deleteUserBtn.addEventListener('click', deleteUser);
    if (elements.userSearchInput) elements.userSearchInput.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); if (!term) renderUsers(appState.users); else renderUsers(appState.users.filter(u => u.username?.toLowerCase().includes(term) || u.display_name?.toLowerCase().includes(term) || u.role?.toLowerCase().includes(term))); });
    
    const renderUsers = (users) => {
        if (!elements.usersList) return;
        if (!users?.length) elements.usersList.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary);"><i class="fas fa-users-slash" style="font-size:48px;margin-bottom:15px;"></i><h3>No Users Found</h3></div>`;
        else elements.usersList.innerHTML = users.map(user => `<div class="user-card ${user.role}${!user.is_active ? ' inactive' : ''}"><div class="user-header"><div class="user-name"><i class="fas fa-user"></i><h3>${escapeHtml(user.display_name)}</h3></div><div class="user-badges"><span class="user-badge badge-${user.role}">${user.role}</span>${!user.is_active ? '<span class="user-badge badge-inactive">Inactive</span>' : ''}</div></div><div class="user-details"><div class="user-detail"><span class="user-detail-label">Username:</span><span class="user-detail-value">${escapeHtml(user.username)}</span></div><div class="user-detail"><span class="user-detail-label">Created:</span><span class="user-detail-value">${new Date(user.created_at).toLocaleDateString()}</span></div><div class="user-detail"><span class="user-detail-label">Last Login:</span><span class="user-detail-value">${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span></div></div><div class="user-actions"><button class="btn btn-secondary btn-small" onclick="window.editUserModalOpen('${user.id}')"><i class="fas fa-edit"></i> Edit</button></div></div>`).join('');
    };
    
    if (elements.emojiPicker && appState.emojis) {
        elements.emojiPicker.innerHTML = '';
        appState.emojis.forEach(emoji => { const span = document.createElement('span'); span.className = 'emoji'; span.textContent = emoji; span.onclick = () => { elements.messageInput.value += emoji; elements.emojiPicker.classList.remove('show'); elements.messageInput.focus(); }; elements.emojiPicker.appendChild(span); });
    }
    
    document.addEventListener('click', (e) => { if (elements.emojiPicker && !elements.emojiPicker.contains(e.target) && elements.emojiBtn && !elements.emojiBtn.contains(e.target)) elements.emojiPicker.classList.remove('show'); });
    if (elements.imageModal) elements.imageModal.addEventListener('click', (e) => { if (e.target === elements.imageModal) elements.imageModal.style.display = 'none'; });
};

// Initialization
const initApp = async () => {
    const mainContainer = document.querySelector('.main-container, .app-container');
    if (mainContainer) mainContainer.style.display = 'none';
    document.body.classList.remove('host-mode');
    
    const savedSession = localStorage.getItem('writeToMe_session');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            appState.isHost = sessionData.isHost;
            appState.userName = sessionData.userName;
            appState.userId = sessionData.userId;
            appState.sessionId = sessionData.sessionId;
            appState.soundEnabled = sessionData.soundEnabled !== false;
            
            const { data: session, error } = await supabaseClient.from('chat_sessions').select('*').eq('session_id', appState.sessionId).single();
            if (!error && session) {
                if (appState.isHost && session.host_id === appState.userId) {
                    appState.currentSessionId = session.session_id;
                    appState.isConnected = true;
                    document.body.classList.add('host-mode');
                    hideConnectionModal();
                    updateUIAfterConnection();
                    setupRealtimeSubscriptions();
                    setupPendingGuestsSubscription();
                    await loadChatHistory();
                    safeLoadAdminContent();
                } else if (!appState.isHost) {
                    const { data: guestStatus } = await supabaseClient.from('session_guests').select('status').eq('session_id', session.session_id).eq('guest_id', appState.userId).single();
                    if (guestStatus?.status === 'approved') {
                        appState.currentSessionId = session.session_id;
                        appState.isConnected = true;
                        hideConnectionModal();
                        updateUIAfterConnection();
                        setupRealtimeSubscriptions();
                        await loadChatHistory();
                    } else if (guestStatus?.status === 'pending') {
                        appState.currentSessionId = session.session_id;
                        hideConnectionModal();
                        updateUIForPendingGuest();
                        setupPendingApprovalSubscription(session.session_id);
                    } else throw new Error('Invalid session');
                } else throw new Error('Invalid session');
            } else throw new Error('Session not found');
        } catch (e) { localStorage.removeItem('writeToMe_session'); showConnectionModal(); }
    } else showConnectionModal();
    
    setupEventListeners();
};

// Global Functions for window
window.playNotificationSound = () => {
    if (!appState.soundEnabled) return;
    try {
        if (!window.audioContext) window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
        setTimeout(() => { const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain(); osc2.connect(gain2); gain2.connect(ctx.destination); osc2.type = 'sine'; osc2.frequency.value = 880; gain2.gain.setValueAtTime(0, ctx.currentTime); gain2.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01); gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1); osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + 0.1); }, 150);
    } catch (error) { console.log('Could not play sound:', error); }
};

window.showFullImage = (src) => { if (elements.fullSizeImage) elements.fullSizeImage.src = src; if (elements.imageModal) elements.imageModal.style.display = 'flex'; };
window.showSessionGuests = async (sessionId) => {
    const { data: guests } = await supabaseClient.from('session_guests').select('*').eq('session_id', sessionId).order('requested_at');
    if (!guests) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content" style="max-width:600px;max-height:80vh;"><div class="modal-header"><h2><i class="fas fa-users"></i> Session Guests</h2><button class="btn btn-secondary btn-small close-guest-modal"><i class="fas fa-times"></i> Close</button></div><div class="modal-body" style="overflow-y:auto;"><div class="guest-details-modal"><h3><i class="fas fa-users"></i> Guest Details</h3><div class="guest-status-section"><h4><i class="fas fa-check-circle" style="color:var(--success-green);"></i> Approved Guests (${guests.filter(g => g.status === 'approved').length})</h4>${guests.filter(g => g.status === 'approved').map(g => `<div class="guest-detail"><strong>${escapeHtml(g.guest_name)}</strong><div class="guest-meta"><small>Joined: ${new Date(g.approved_at).toLocaleString()}</small><small>IP: ${g.guest_ip || 'Not recorded'}</small>${g.guest_note ? `<small>Note: ${escapeHtml(g.guest_note)}</small>` : ''}</div></div>`).join('') || '<p>No approved guests</p>'}</div>${guests.filter(g => g.status === 'pending').length ? `<div class="guest-status-section"><h4><i class="fas fa-clock" style="color:var(--warning-yellow);"></i> Pending Guests (${guests.filter(g => g.status === 'pending').length})</h4>${guests.filter(g => g.status === 'pending').map(g => `<div class="guest-detail"><strong>${escapeHtml(g.guest_name)}</strong><div class="guest-meta"><small>Requested: ${new Date(g.requested_at).toLocaleString()}</small><small>IP: ${g.guest_ip || 'Not recorded'}</small>${g.guest_note ? `<small>Note: ${escapeHtml(g.guest_note)}</small>` : ''}</div></div>`).join('')}</div>` : ''}${guests.filter(g => g.status === 'kicked').length ? `<div class="guest-status-section"><h4><i class="fas fa-user-slash" style="color:var(--danger-red);"></i> Kicked Guests (${guests.filter(g => g.status === 'kicked').length})</h4>${guests.filter(g => g.status === 'kicked').map(g => `<div class="guest-detail"><strong>${escapeHtml(g.guest_name)}</strong><div class="guest-meta"><small>Kicked: ${new Date(g.left_at).toLocaleString()}</small><small>IP: ${g.guest_ip || 'Not recorded'}</small></div></div>`).join('')}</div>` : ''}</div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.close-guest-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
};

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
