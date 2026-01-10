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
    isViewingUsers: false,
    channels: [],
    messageReplies: new Map() // Store replies hierarchy
};

// DOM Elements Cache
const DOM = {
    // Connection
    connectionModal: document.getElementById('connectionModal'),
    connectBtn: document.getElementById('connectBtn'),
    passwordError: document.getElementById('passwordError'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Pending Guests
    pendingGuestsBtn: document.getElementById('pendingGuestsBtn'),
    pendingGuestsModal: document.getElementById('pendingGuestsModal'),
    closePendingModal: document.getElementById('closePendingModal'),
    pendingGuestsList: document.getElementById('pendingGuestsList'),
    noPendingGuests: document.getElementById('noPendingGuests'),
    
    // Status
    statusIndicator: document.getElementById('statusIndicator'),
    userRoleDisplay: document.getElementById('userRoleDisplay'),
    pendingCount: document.getElementById('pendingCount'),
    
    // Chat
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    imageUpload: document.getElementById('imageUpload'),
    emojiBtn: document.getElementById('emojiBtn'),
    emojiPicker: document.getElementById('emojiPicker'),
    
    // Chat Title & Mode
    chatTitle: document.getElementById('chatTitle'),
    chatModeIndicator: document.getElementById('chatModeIndicator'),
    returnToActiveBtn: document.getElementById('returnToActiveBtn'),
    
    // History
    historyCards: document.getElementById('historyCards'),
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
    
    // Sound
    soundControl: document.getElementById('soundControl'),
    messageSound: document.getElementById('messageSound'),
    
    // Typing
    typingIndicator: document.getElementById('typingIndicator'),
    typingUser: document.getElementById('typingUser'),
    
    // Image Modal
    imageModal: document.getElementById('imageModal'),
    fullSizeImage: document.getElementById('fullSizeImage'),
    
    // Admin
    adminSection: document.getElementById('adminSection'),
    historyTabBtn: document.getElementById('historyTabBtn'),
    usersTabBtn: document.getElementById('usersTabBtn'),
    historyTabContent: document.getElementById('historyTabContent'),
    usersTabContent: document.getElementById('usersTabContent'),
    
    // User Management
    userManagementSection: document.getElementById('userManagementSection'),
    backToHistoryBtn: document.getElementById('backToHistoryBtn'),
    addUserBtn: document.getElementById('addUserBtn'),
    userSearchInput: document.getElementById('userSearchInput'),
    usersList: document.getElementById('usersList'),
    addUserModal: document.getElementById('addUserModal'),
    closeAddUserModal: document.getElementById('closeAddUserModal'),
    editUserModal: document.getElementById('editUserModal'),
    closeEditUserModal: document.getElementById('closeEditUserModal'),
    newUsername: document.getElementById('newUsername'),
    newDisplayName: document.getElementById('newDisplayName'),
    newPassword: document.getElementById('newPassword'),
    newRole: document.getElementById('newRole'),
    addUserError: document.getElementById('addUserError'),
    saveUserBtn: document.getElementById('saveUserBtn'),
    editUserId: document.getElementById('editUserId'),
    editUsername: document.getElementById('editUsername'),
    editDisplayName: document.getElementById('editDisplayName'),
    editPassword: document.getElementById('editPassword'),
    editRole: document.getElementById('editRole'),
    editIsActive: document.getElementById('editIsActive'),
    editUserError: document.getElementById('editUserError'),
    updateUserBtn: document.getElementById('updateUserBtn'),
    deleteUserBtn: document.getElementById('deleteUserBtn'),
    
    // Login
    usernameInput: document.getElementById('usernameInput'),
    passwordInput: document.getElementById('passwordInput')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    static formatTime(date) {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString();
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static isValidImage(file) {
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: "Please select an image file (JPEG, PNG, GIF, etc.)" };
        }
        if (file.size > 5 * 1024 * 1024) {
            return { valid: false, error: "Image size should be less than 5MB" };
        }
        return { valid: true };
    }
}

// ============================================
// MESSAGE ACTIONS SYSTEM - UPDATED
// ============================================

class MessageActions {
    static async editMessage(messageId) {
        const messageElement = document.getElementById(`msg-${messageId}`);
        if (!messageElement) return;
        
        const currentTextElement = messageElement.querySelector('.message-text');
        const currentText = currentTextElement ? currentTextElement.textContent : '';
        
        // Remove any existing "edited" badge
        const editedBadge = currentTextElement.querySelector('.edited-badge');
        if (editedBadge) {
            currentTextElement.removeChild(editedBadge);
        }
        
        const newText = prompt("Edit your message:", currentText);
        
        if (newText !== null && newText.trim() !== '' && newText !== currentText) {
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
                
                if (currentTextElement) {
                    currentTextElement.textContent = newText.trim();
                    const editedSpan = document.createElement('span');
                    editedSpan.className = 'edited-badge';
                    editedSpan.textContent = ' (edited)';
                    editedSpan.style.cssText = 'opacity: 0.7; font-size: 0.8em; margin-left: 5px;';
                    currentTextElement.appendChild(editedSpan);
                }
                
                Utils.showNotification('Message edited successfully', 'success');
            } catch (error) {
                console.error("Error editing message:", error);
                Utils.showNotification('Failed to edit message', 'error');
            }
        }
    }

    static async deleteMessage(messageId) {
        if (!confirm("Are you sure you want to delete this message?")) return;
        
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: appState.userId
                })
                .eq('id', messageId)
                .eq('sender_id', appState.userId);
            
            if (error) throw error;
            
            const messageElement = document.getElementById(`msg-${messageId}`);
            if (messageElement) {
                messageElement.classList.add('deleted');
                const textElement = messageElement.querySelector('.message-text');
                if (textElement) {
                    textElement.innerHTML = '<i>Message deleted</i>';
                }
                // Remove action buttons
                const actionsElement = messageElement.querySelector('.message-actions');
                if (actionsElement) {
                    actionsElement.remove();
                }
                // Remove emoji reactions
                const emojiElement = messageElement.querySelector('.emoji-reactions');
                if (emojiElement) {
                    emojiElement.remove();
                }
            }
            
            Utils.showNotification('Message deleted successfully', 'success');
        } catch (error) {
            console.error("Error deleting message:", error);
            Utils.showNotification('Failed to delete message', 'error');
        }
    }

    static replyToMessage(messageId, senderName = null, messageText = null) {
        // Remove existing reply indicator
        MessageActions.cancelReply();
        
        // Get message info if not provided
        if (!senderName || !messageText) {
            const messageElement = document.getElementById(`msg-${messageId}`);
            if (messageElement) {
                senderName = senderName || messageElement.querySelector('.message-sender').textContent;
                const textElement = messageElement.querySelector('.message-text');
                messageText = messageText || (textElement ? textElement.textContent : '');
            }
        }
        
        const originalMessage = messageText && messageText.length > 100 
            ? messageText.substring(0, 100) + '...' 
            : messageText;
        
        // Create reply indicator
        const replyIndicator = document.createElement('div');
        replyIndicator.id = 'replyIndicator';
        replyIndicator.className = 'reply-indicator';
        replyIndicator.innerHTML = `
            <div class="reply-info">
                <i class="fas fa-reply"></i>
                <strong>Replying to ${senderName}:</strong>
                <span>${originalMessage}</span>
            </div>
            <button class="btn btn-small btn-secondary" onclick="MessageActions.cancelReply()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add before message input
        const chatInputArea = document.querySelector('.chat-input-area');
        if (chatInputArea) {
            chatInputArea.insertBefore(replyIndicator, chatInputArea.firstChild);
        }
        
        // Store reply info
        if (DOM.messageInput) {
            DOM.messageInput.dataset.replyTo = messageId;
            DOM.messageInput.focus();
        }
        
        // Highlight the message being replied to
        const messageElement = document.getElementById(`msg-${messageId}`);
        if (messageElement) {
            messageElement.classList.add('highlighted');
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => messageElement.classList.remove('highlighted'), 2000);
        }
    }

    static cancelReply() {
        const replyIndicator = document.querySelector('.reply-indicator');
        if (replyIndicator) replyIndicator.remove();
        if (DOM.messageInput) {
            delete DOM.messageInput.dataset.replyTo;
        }
    }

    static async addEmojiToMessage(messageId, emoji) {
        try {
            console.log(`🎭 Adding emoji ${emoji} to message ${messageId} by user ${appState.userId}`);
            
            // Check if user already has an emoji on this message
            const { data: existingEmojis, error: checkError } = await supabaseClient
                .from('message_emojis')
                .select('id, emoji')
                .eq('message_id', messageId)
                .eq('user_id', appState.userId);
            
            if (checkError) throw checkError;
            
            if (existingEmojis && existingEmojis.length > 0) {
                // User already has an emoji on this message
                const existingEmoji = existingEmojis[0];
                
                if (existingEmoji.emoji === emoji) {
                    // Same emoji clicked - remove it
                    const { error: deleteError } = await supabaseClient
                        .from('message_emojis')
                        .delete()
                        .eq('id', existingEmoji.id);
                    
                    if (deleteError) throw deleteError;
                    console.log('🗑️ Removed emoji:', emoji);
                    return 'removed';
                } else {
                    // Different emoji clicked - update existing one
                    const { error: updateError } = await supabaseClient
                        .from('message_emojis')
                        .update({
                            emoji: emoji,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingEmoji.id);
                    
                    if (updateError) throw updateError;
                    console.log('🔄 Updated emoji to:', emoji);
                    return 'updated';
                }
            } else {
                // Add new emoji
                const { error: insertError } = await supabaseClient
                    .from('message_emojis')
                    .insert([{
                        message_id: messageId,
                        user_id: appState.userId.toString(),
                        user_name: appState.userName,
                        emoji: emoji
                    }]);
                
                if (insertError) throw insertError;
                console.log('✅ Added emoji:', emoji);
                return 'added';
            }
            
        } catch (error) {
            console.error("Error toggling emoji:", error);
            return 'error';
        }
    }

    static showMessageEmojiPicker(messageId, event) {
        if (event) event.stopPropagation();
        
        // Remove existing emoji picker
        const existingPicker = document.querySelector('.message-emoji-picker');
        if (existingPicker) existingPicker.remove();
        
        // Get position for picker
        const rect = event?.target?.getBoundingClientRect() || { right: 100, top: 100 };
        
        // Create emoji picker
        const picker = document.createElement('div');
        picker.className = 'message-emoji-picker';
        picker.style.position = 'fixed';
        picker.style.left = `${rect.right}px`;
        picker.style.top = `${rect.top}px`;
        picker.style.transform = 'translateY(-50%)';
        picker.style.zIndex = '1000';
        
        // Add quick emoji reactions
        const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
        quickEmojis.forEach(emoji => {
            const emojiBtn = document.createElement('button');
            emojiBtn.className = 'emoji-reaction-btn';
            emojiBtn.textContent = emoji;
            emojiBtn.onclick = (e) => {
                e.stopPropagation();
                MessageActions.addEmojiToMessage(messageId, emoji);
                picker.remove();
            };
            picker.appendChild(emojiBtn);
        });
        
        // Add full emoji picker button
        const moreBtn = document.createElement('button');
        moreBtn.className = 'emoji-reaction-btn more-emojis';
        moreBtn.innerHTML = '<i class="fas fa-plus"></i>';
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            MessageActions.showFullEmojiPicker(messageId, event);
            picker.remove();
        };
        picker.appendChild(moreBtn);
        
        document.body.appendChild(picker);
        
        // Close picker when clicking elsewhere
        setTimeout(() => {
            const closePicker = (e) => {
                if (picker && !picker.contains(e.target) && !e.target.closest('.message-action-btn')) {
                    picker.remove();
                    document.removeEventListener('click', closePicker);
                }
            };
            document.addEventListener('click', closePicker);
        }, 100);
    }

    static showFullEmojiPicker(messageId, event) {
        if (event) event.stopPropagation();
        
        const modal = document.createElement('div');
        modal.className = 'emoji-picker-modal';
        modal.innerHTML = `
            <div class="emoji-picker-content">
                <div class="emoji-picker-header">
                    <h3><i class="fas fa-smile"></i> Add Reaction</h3>
                    <button class="btn btn-small" onclick="this.closest('.emoji-picker-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="emoji-grid">
                    ${appState.emojis.map(emoji => `
                        <button class="emoji-option" onclick="MessageActions.addEmojiToMessage('${messageId}', '${emoji}'); this.closest('.emoji-picker-modal').remove()">
                            ${emoji}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on escape
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') modal.remove();
        };
        document.addEventListener('keydown', closeOnEsc);
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    }

    static scrollToMessage(messageId) {
        const messageElement = document.getElementById(`msg-${messageId}`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlighted');
            setTimeout(() => messageElement.classList.remove('highlighted'), 2000);
        }
    }
}

// ============================================
// CHAT MESSAGES SYSTEM - UPDATED
// ============================================

class ChatManager {
    static async sendMessage() {
        if (!appState.isConnected || appState.isViewingHistory) {
            Utils.showNotification("You cannot send messages right now.", "error");
            return;
        }
        
        const messageText = DOM.messageInput ? DOM.messageInput.value.trim() : '';
        const imageFile = DOM.imageUpload ? DOM.imageUpload.files[0] : null;
        const replyToId = DOM.messageInput ? DOM.messageInput.dataset.replyTo : null;
        
        if (!messageText && !imageFile) return;
        
        // Disable send button during upload
        const originalButtonHTML = DOM.sendMessageBtn ? DOM.sendMessageBtn.innerHTML : '';
        if (DOM.sendMessageBtn) {
            DOM.sendMessageBtn.disabled = true;
            DOM.sendMessageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            let imageUrl = null;
            
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    imageUrl = e.target.result;
                    await ChatManager.sendMessageToDB(messageText, imageUrl, replyToId);
                    
                    // Reset button
                    if (DOM.sendMessageBtn) {
                        DOM.sendMessageBtn.disabled = false;
                        DOM.sendMessageBtn.innerHTML = originalButtonHTML;
                    }
                };
                reader.readAsDataURL(imageFile);
                if (DOM.imageUpload) DOM.imageUpload.value = '';
            } else {
                await ChatManager.sendMessageToDB(messageText, null, replyToId);
                
                // Reset button
                if (DOM.sendMessageBtn) {
                    DOM.sendMessageBtn.disabled = false;
                    DOM.sendMessageBtn.innerHTML = originalButtonHTML;
                }
            }
            
            // Clear input and reply indicator
            if (DOM.messageInput) {
                DOM.messageInput.value = '';
                DOM.messageInput.style.height = 'auto';
            }
            MessageActions.cancelReply();
            
        } catch (error) {
            console.error("Error sending message:", error);
            if (DOM.sendMessageBtn) {
                DOM.sendMessageBtn.disabled = false;
                DOM.sendMessageBtn.innerHTML = originalButtonHTML;
            }
            Utils.showNotification("Failed to send message", "error");
        }
    }

    static async sendMessageToDB(text, imageUrl, replyToId = null) {
        try {
            console.log('💾 Saving message to DB:', {
                text: text?.substring(0, 50),
                hasImage: !!imageUrl,
                replyToId: replyToId
            });
            
            const messageData = {
                session_id: appState.currentSessionId,
                sender_id: appState.userId.toString(),
                sender_name: appState.userName,
                message: text || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            if (imageUrl) {
                messageData.image_url = imageUrl;
            }
            
            if (replyToId) {
                messageData.reply_to_id = parseInt(replyToId, 10);
            }
            
            const { data, error } = await supabaseClient
                .from('messages')
                .insert([messageData])
                .select()
                .single();
            
            if (error) {
                console.error("❌ Error sending message:", error);
                throw error;
            }
            
            console.log('✅ Message saved to DB:', data.id);
            
            // If this is a reply, store it in the replies hierarchy
            if (replyToId) {
                if (!appState.messageReplies.has(replyToId)) {
                    appState.messageReplies.set(replyToId, []);
                }
                appState.messageReplies.get(replyToId).push(data.id);
            }
            
            // Display the sent message immediately
            ChatManager.displayMessage({
                id: data.id,
                sender: appState.userName,
                text: text,
                image: imageUrl,
                time: Utils.formatTime(new Date()),
                type: 'sent',
                is_historical: false,
                reply_to_id: replyToId
            });
            
            return { success: true, data };
            
        } catch (error) {
            console.error("❌ Error in sendMessageToDB:", error);
            throw error;
        }
    }

    static displayMessage(message) {
        if (appState.isViewingHistory && message.is_historical === false) {
            return;
        }
        
        if (!DOM.chatMessages) return;
        
        // Check if message already exists (for real-time updates)
        const existingMessage = document.getElementById(`msg-${message.id}`);
        if (existingMessage) {
            // Update existing message (for emoji reactions)
            ChatManager.updateMessageEmojis(message.id);
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        if (message.is_historical) {
            messageDiv.classList.add('historical');
        }
        if (message.is_deleted) {
            messageDiv.classList.add('deleted');
        }
        messageDiv.id = `msg-${message.id}`;
        
        let messageContent = Utils.escapeHtml(message.text || '');
        if (message.image) {
            messageContent += `<img src="${message.image}" class="message-image" onclick="ImageManager.showFullImage('${message.image}')">`;
        }
        
        // Add edited badge if applicable
        let editedBadge = '';
        if (message.edited_at) {
            editedBadge = '<span class="edited-badge">(edited)</span>';
        }
        
        // Add reply indicator if this is a reply
        let replyInfo = '';
        if (message.reply_to_id) {
            const parentMessage = appState.messages.find(m => m.id === message.reply_to_id);
            if (parentMessage) {
                const shortText = parentMessage.text && parentMessage.text.length > 50 
                    ? parentMessage.text.substring(0, 50) + '...' 
                    : parentMessage.text || 'Message';
                replyInfo = `
                    <div class="reply-indicator-message" onclick="MessageActions.scrollToMessage('${message.reply_to_id}')">
                        <i class="fas fa-reply"></i>
                        <div class="reply-preview">
                            <strong>${Utils.escapeHtml(parentMessage.sender)}</strong>
                            <span>${Utils.escapeHtml(shortText)}</span>
                        </div>
                    </div>
                `;
            } else {
                replyInfo = `
                    <div class="reply-indicator-message" onclick="MessageActions.scrollToMessage('${message.reply_to_id}')">
                        <i class="fas fa-reply"></i>
                        <span>Replying to a message</span>
                    </div>
                `;
            }
        }
        
        // Check if message is deleted
        if (message.is_deleted) {
            messageContent = '<i>Message deleted</i>';
        }
        
        // Determine if user can edit/delete this message
        const canEditDelete = message.sender_id === appState.userId.toString() && !message.is_deleted;
        
        messageDiv.innerHTML = `
            ${replyInfo}
            <div class="message-sender">${Utils.escapeHtml(message.sender)}</div>
            <div class="message-content">
                <div class="message-text">${messageContent}${editedBadge}</div>
                <div class="message-emoji-reactions" id="emoji-${message.id}">
                    <!-- Emoji reactions will be loaded dynamically -->
                </div>
                <div class="message-time">${message.time}</div>
            </div>
            <div class="message-actions">
                ${canEditDelete ? `
                    <button class="message-action-btn" onclick="MessageActions.editMessage('${message.id}')" title="Edit message">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="message-action-btn" onclick="MessageActions.deleteMessage('${message.id}')" title="Delete message">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
                <button class="message-action-btn" onclick="MessageActions.replyToMessage('${message.id}')" title="Reply to message">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action-btn" onclick="MessageActions.showMessageEmojiPicker('${message.id}', event)" title="Add reaction">
                    <i class="fas fa-smile"></i>
                </button>
            </div>
        `;
        
        DOM.chatMessages.appendChild(messageDiv);
        
        // Load emoji reactions for this message
        ChatManager.loadMessageEmojis(message.id);
        
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        
        // Store message in state
        if (!appState.messages.find(m => m.id === message.id)) {
            appState.messages.push(message);
        }
    }

    static async loadMessageEmojis(messageId) {
        try {
            // Get all emojis for this message
            const { data: emojis, error } = await supabaseClient
                .from('message_emojis')
                .select('emoji, user_id, user_name')
                .eq('message_id', messageId);
            
            if (error) throw error;
            
            // Group emojis by type and count
            const emojiCounts = {};
            const userEmojis = {}; // Track which emoji each user has
            
            emojis.forEach(emoji => {
                if (!emojiCounts[emoji.emoji]) {
                    emojiCounts[emoji.emoji] = 0;
                }
                emojiCounts[emoji.emoji]++;
                
                // Track user's emoji
                userEmojis[emoji.user_id] = emoji.emoji;
            });
            
            // Update UI
            const emojiContainer = document.getElementById(`emoji-${messageId}`);
            if (!emojiContainer) return;
            
            emojiContainer.innerHTML = '';
            
            if (Object.keys(emojiCounts).length > 0) {
                const reactionsDiv = document.createElement('div');
                reactionsDiv.className = 'emoji-reactions';
                
                Object.entries(emojiCounts).forEach(([emoji, count]) => {
                    const reactionSpan = document.createElement('span');
                    reactionSpan.className = 'emoji-reaction';
                    reactionSpan.textContent = `${emoji} ${count}`;
                    
                    // Highlight if current user has this emoji
                    if (userEmojis[appState.userId] === emoji) {
                        reactionSpan.classList.add('user-reacted');
                    }
                    
                    reactionSpan.onclick = (e) => {
                        e.stopPropagation();
                        MessageActions.addEmojiToMessage(messageId, emoji);
                    };
                    
                    reactionsDiv.appendChild(reactionSpan);
                });
                
                emojiContainer.appendChild(reactionsDiv);
            }
            
        } catch (error) {
            console.error("Error loading message emojis:", error);
        }
    }

    static async updateMessageEmojis(messageId) {
        // Simply reload emojis for this message
        await ChatManager.loadMessageEmojis(messageId);
    }

    static async loadChatHistory(sessionId = null) {
        const targetSessionId = sessionId || appState.currentSessionId;
        if (!targetSessionId || !DOM.chatMessages) return;
        
        try {
            // Clear message replies map
            appState.messageReplies.clear();
            
            const { data: messages, error } = await supabaseClient
                .from('messages')
                .select('*')
                .eq('session_id', targetSessionId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            DOM.chatMessages.innerHTML = '';
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
                        <div class="message-text">Historical Chat - ${Utils.formatDate(session.created_at)}</div>
                        <div class="message-time"></div>
                    </div>
                `;
                DOM.chatMessages.appendChild(historyHeader);
            }
            
            // Build replies hierarchy first
            const messagesMap = new Map();
            const replyMap = new Map();
            
            messages.forEach(msg => {
                messagesMap.set(msg.id, msg);
                if (msg.reply_to_id) {
                    if (!replyMap.has(msg.reply_to_id)) {
                        replyMap.set(msg.reply_to_id, []);
                    }
                    replyMap.get(msg.reply_to_id).push(msg.id);
                }
            });
            
            // Display messages in order, with replies nested
            const displayedMessages = new Set();
            
            const displayMessageWithReplies = (message) => {
                if (displayedMessages.has(message.id)) return;
                
                displayedMessages.add(message.id);
                
                const messageType = message.sender_id === appState.userId.toString() ? 'sent' : 'received';
                ChatManager.displayMessage({
                    id: message.id,
                    sender: message.sender_name,
                    sender_id: message.sender_id,
                    text: message.message,
                    image: message.image_url,
                    time: Utils.formatTime(message.created_at),
                    type: messageType,
                    is_historical: !!sessionId,
                    reply_to_id: message.reply_to_id,
                    edited_at: message.edited_at,
                    is_deleted: message.is_deleted
                });
                
                // Store in replies map
                appState.messageReplies.set(message.id, replyMap.get(message.id) || []);
                
                // Display replies if any
                const replies = replyMap.get(message.id);
                if (replies && replies.length > 0) {
                    replies.forEach(replyId => {
                        const replyMessage = messagesMap.get(replyId);
                        if (replyMessage) {
                            displayMessageWithReplies(replyMessage);
                        }
                    });
                }
            };
            
            // Display all messages that are not replies first
            messages.forEach(msg => {
                if (!msg.reply_to_id) {
                    displayMessageWithReplies(msg);
                }
            });
            
            // Then display any orphaned replies (shouldn't happen but just in case)
            messages.forEach(msg => {
                if (!displayedMessages.has(msg.id)) {
                    displayMessageWithReplies(msg);
                }
            });
            
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        } catch (error) {
            console.error("Error loading chat history:", error);
            Utils.showNotification("Error loading chat history", "error");
        }
    }

    static async clearChat() {
        if (!appState.isConnected || !appState.currentSessionId) {
            Utils.showNotification("You must be connected to clear chat.", "error");
            return;
        }
        
        if (!confirm("Are you sure you want to clear all messages? This cannot be undone!")) {
            return;
        }
        
        try {
            if (appState.isHost) {
                // Host can delete all messages
                const { error } = await supabaseClient
                    .from('messages')
                    .update({
                        is_deleted: true,
                        deleted_at: new Date().toISOString(),
                        deleted_by: appState.userId
                    })
                    .eq('session_id', appState.currentSessionId);
                
                if (error) throw error;
                
                // Clear local messages
                if (DOM.chatMessages) {
                    DOM.chatMessages.innerHTML = '';
                }
                appState.messages = [];
                appState.messageReplies.clear();
                
                // Add system message
                const systemMsg = document.createElement('div');
                systemMsg.className = 'message received';
                systemMsg.innerHTML = `
                    <div class="message-sender">System</div>
                    <div class="message-content">
                        <div class="message-text">Chat cleared by ${appState.userName}</div>
                        <div class="message-time">${Utils.formatTime(new Date())}</div>
                    </div>
                `;
                if (DOM.chatMessages) DOM.chatMessages.appendChild(systemMsg);
                
            } else {
                // Guest can only delete their own messages
                const { error } = await supabaseClient
                    .from('messages')
                    .update({
                        is_deleted: true,
                        deleted_at: new Date().toISOString(),
                        deleted_by: appState.userId
                    })
                    .eq('session_id', appState.currentSessionId)
                    .eq('sender_id', appState.userId);
                
                if (error) throw error;
                
                // Remove guest's messages from view
                const guestMessages = document.querySelectorAll(`.message.sent`);
                guestMessages.forEach(msg => {
                    msg.innerHTML = `
                        <div class="message-sender">${appState.userName}</div>
                        <div class="message-content">
                            <div class="message-text"><i>Message deleted</i></div>
                            <div class="message-time">${Utils.formatTime(new Date())}</div>
                        </div>
                    `;
                });
                
                Utils.showNotification("Your messages have been deleted.", "success");
            }
            
        } catch (error) {
            console.error("Error clearing chat:", error);
            Utils.showNotification("Failed to clear chat", "error");
        }
    }
}

// ============================================
// CONNECTION MANAGER
// ============================================

class ConnectionManager {
    static async handleConnect() {
        const username = DOM.usernameInput ? DOM.usernameInput.value.trim() : '';
        const password = DOM.passwordInput ? DOM.passwordInput.value : '';
        
        if (DOM.passwordError) {
            DOM.passwordError.style.display = 'none';
        }
        
        if (DOM.connectBtn) {
            DOM.connectBtn.disabled = true;
            DOM.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        }
        
        if (!username) {
            ConnectionManager.showAuthError("Please enter a username.");
            return;
        }
        
        if (!password) {
            ConnectionManager.showAuthError("Please enter a password.");
            return;
        }
        
        try {
            console.log("🔐 Attempting authentication for:", username);
            
            // First check if user exists
            const { data: userData, error: userError } = await supabaseClient
                .from('user_management')
                .select('id, username, display_name, password_hash, role, is_active')
                .ilike('username', username)
                .eq('is_active', true)
                .single();
            
            if (userError || !userData) {
                console.log("User not found:", userError);
                ConnectionManager.showAuthError("Invalid username or password.");
                return;
            }
            
            console.log("👤 User found:", userData.username, "Role:", userData.role);
            
            // Authenticate
            let isAuthenticated = false;
            
            try {
                // Try RPC function first
                const { data: authResult } = await supabaseClient
                    .rpc('verify_password', {
                        stored_hash: userData.password_hash,
                        password: password
                    });
                
                if (authResult === true) {
                    isAuthenticated = true;
                }
            } catch (rpcError) {
                console.log("RPC failed, trying test passwords:", rpcError);
            }
            
            // Fallback for test accounts (development only)
            if (!isAuthenticated) {
                const testPasswords = {
                    'admin': 'admin123',
                    'host': 'host123',
                    'guest': 'guest123'
                };
                
                if (testPasswords[username.toLowerCase()] && password === testPasswords[username.toLowerCase()]) {
                    isAuthenticated = true;
                }
            }
            
            if (!isAuthenticated) {
                ConnectionManager.showAuthError("Invalid username or password.");
                return;
            }
            
            // Authentication successful
            appState.isHost = userData.role === 'host';
            appState.userName = userData.display_name || userData.username;
            appState.userId = userData.id;
            appState.connectionTime = new Date();
            
            console.log("✅ Authentication successful:", {
                name: appState.userName,
                id: appState.userId,
                isHost: appState.isHost
            });
            
            // Update last login
            try {
                await supabaseClient
                    .from('user_management')
                    .update({ 
                        last_login: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userData.id);
            } catch (updateError) {
                console.log("Could not update last login:", updateError);
            }
            
            // Get user IP
            const userIP = await ConnectionManager.getRealIP();
            
            // Connect based on role
            if (appState.isHost) {
                await ConnectionManager.connectAsHost(userIP);
            } else {
                await ConnectionManager.connectAsGuest(userIP);
            }
            
        } catch (error) {
            console.error("Error in authentication process:", error);
            ConnectionManager.showAuthError(error.message.includes('NetworkError') ? 
                "Network error. Check connection." : 
                "Authentication error. Please try again.");
        }
    }

    static showAuthError(message) {
        if (DOM.passwordError) {
            DOM.passwordError.style.display = 'block';
            DOM.passwordError.textContent = message;
        }
        ConnectionManager.resetConnectButton();
    }

    static resetConnectButton() {
        if (DOM.connectBtn) {
            DOM.connectBtn.disabled = false;
            DOM.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        }
    }

    static async getRealIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || "Unknown";
        } catch (error) {
            console.error("Error getting IP:", error);
            return "Unknown";
        }
    }

    static async connectAsHost(userIP) {
        try {
            console.log("👑 Connecting as host...");
            
            const sessionId = 'session_' + Date.now().toString(36);
            
            // Create session
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
                        max_guests: 50
                    }
                ])
                .select()
                .single();
            
            if (error) {
                console.error("Error creating session:", error);
                Utils.showNotification("Failed to create session", "error");
                ConnectionManager.resetConnectButton();
                return;
            }
            
            // Update app state
            appState.sessionId = sessionId;
            appState.currentSessionId = sessionId;
            appState.isConnected = true;
            
            // Save to localStorage
            ConnectionManager.saveSessionToStorage();
            
            // Close modal and update UI
            if (DOM.connectionModal) DOM.connectionModal.style.display = 'none';
            ConnectionManager.resetConnectButton();
            UIManager.updateUIAfterConnection();
            
            // Set up subscriptions
            RealtimeManager.setupRealtimeSubscriptions();
            RealtimeManager.setupPendingGuestsSubscription();
            
            // Load data
            await GuestManager.loadPendingGuests();
            await ChatManager.loadChatHistory();
            await HistoryManager.loadChatSessions();
            
            // Send welcome message
            await ChatManager.sendMessageToDB('System', `${appState.userName} has created a new chat session.`);
            
            console.log("✅ Host connection completed successfully!");
            Utils.showNotification("Host session created successfully!", "success");
            
        } catch (error) {
            console.error("Error in host connection:", error);
            Utils.showNotification("An error occurred during host connection", "error");
            ConnectionManager.resetConnectButton();
            appState.isConnected = false;
            appState.currentSessionId = null;
            localStorage.removeItem('writeToMe_session');
        }
    }

    static async connectAsGuest(userIP) {
        try {
            console.log("👤 Connecting as guest...");
            
            // Find active session
            const { data: activeSessions, error: sessionsError } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (sessionsError || !activeSessions || activeSessions.length === 0) {
                Utils.showNotification("No active session found. Ask the host to create a session.", "error");
                ConnectionManager.resetConnectButton();
                return;
            }
            
            const session = activeSessions[0];
            console.log("Found active session:", session.session_id);
            
            // Check if already approved
            const { data: existingGuest } = await supabaseClient
                .from('session_guests')
                .select('*')
                .eq('session_id', session.session_id)
                .eq('guest_id', appState.userId)
                .eq('status', 'approved')
                .single();
            
            if (existingGuest) {
                console.log("Guest already approved, connecting directly");
                ConnectionManager.completeGuestConnection(session.session_id);
                return;
            }
            
            // Check if already pending
            const { data: pendingGuest } = await supabaseClient
                .from('session_guests')
                .select('*')
                .eq('session_id', session.session_id)
                .eq('guest_id', appState.userId)
                .eq('status', 'pending')
                .single();
            
            if (pendingGuest) {
                console.log("Guest already pending");
                appState.sessionId = session.session_id;
                if (DOM.connectionModal) DOM.connectionModal.style.display = 'none';
                ConnectionManager.resetConnectButton();
                UIManager.updateUIForPendingGuest();
                RealtimeManager.setupPendingApprovalSubscription(session.session_id);
                return;
            }
            
            // Add to pending guests
            const { error: insertError } = await supabaseClient
                .from('session_guests')
                .insert([{
                    session_id: session.session_id,
                    guest_id: appState.userId,
                    guest_name: appState.userName,
                    guest_ip: userIP,
                    status: 'pending',
                    requested_at: new Date().toISOString()
                }]);
            
            if (insertError) {
                console.error("Error adding to pending:", insertError);
                Utils.showNotification("Failed to request access", "error");
                ConnectionManager.resetConnectButton();
                return;
            }
            
            console.log("✅ Guest added to pending list");
            appState.sessionId = session.session_id;
            if (DOM.connectionModal) DOM.connectionModal.style.display = 'none';
            ConnectionManager.resetConnectButton();
            UIManager.updateUIForPendingGuest();
            RealtimeManager.setupPendingApprovalSubscription(session.session_id);
            
        } catch (error) {
            console.error("Error in guest connection:", error);
            Utils.showNotification("An error occurred during guest connection", "error");
            ConnectionManager.resetConnectButton();
        }
    }

    static completeGuestConnection(sessionId) {
        appState.sessionId = sessionId;
        appState.currentSessionId = sessionId;
        appState.isConnected = true;
        
        ConnectionManager.saveSessionToStorage();
        if (DOM.connectionModal) DOM.connectionModal.style.display = 'none';
        ConnectionManager.resetConnectButton();
        UIManager.updateUIAfterConnection();
        RealtimeManager.setupRealtimeSubscriptions();
        ChatManager.loadChatHistory();
        HistoryManager.loadChatSessions();
        ChatManager.sendMessageToDB('System', `${appState.userName} has joined the chat.`);
    }

    static saveSessionToStorage() {
        localStorage.setItem('writeToMe_session', JSON.stringify({
            isHost: appState.isHost,
            userName: appState.userName,
            userId: appState.userId,
            sessionId: appState.sessionId,
            connectionTime: appState.connectionTime,
            soundEnabled: appState.soundEnabled
        }));
    }

    static async reconnectToSession() {
        try {
            if (!appState.sessionId) return false;
            
            const { data: session, error } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('session_id', appState.sessionId)
                .single();
            
            if (error || !session) {
                console.log("Session not found or error:", error);
                return false;
            }
            
            console.log("✅ Session found:", session.session_id);
            
            if (appState.isHost) {
                if (session.host_id === appState.userId) {
                    appState.currentSessionId = session.session_id;
                    RealtimeManager.setupRealtimeSubscriptions();
                    RealtimeManager.setupPendingGuestsSubscription();
                    await ChatManager.loadChatHistory();
                    await GuestManager.loadPendingGuests();
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
                    RealtimeManager.setupRealtimeSubscriptions();
                    await ChatManager.loadChatHistory();
                    return true;
                } else if (guestStatus.status === 'pending') {
                    appState.currentSessionId = session.session_id;
                    UIManager.updateUIForPendingGuest();
                    RealtimeManager.setupPendingApprovalSubscription(session.session_id);
                    return false;
                } else {
                    return false;
                }
            }
        } catch (error) {
            console.error("Error reconnecting:", error);
            return false;
        }
    }
}

// ============================================
// GUEST MANAGER
// ============================================

class GuestManager {
    static async loadPendingGuests() {
        if (!appState.isHost || !appState.currentSessionId) {
            console.log("Cannot load pending guests: Not host or no session ID");
            if (DOM.pendingGuestsBtn) DOM.pendingGuestsBtn.style.display = 'none';
            return;
        }
        
        try {
            console.log("🔄 Loading pending guests...");
            
            const { data: guests, error } = await supabaseClient
                .from('session_guests')
                .select('*')
                .eq('session_id', appState.currentSessionId)
                .eq('status', 'pending')
                .order('requested_at', { ascending: true });
            
            if (error) {
                console.error("Error loading pending guests:", error);
                appState.pendingGuests = [];
                GuestManager.updatePendingButtonUI();
                return;
            }
            
            appState.pendingGuests = guests || [];
            console.log(`✅ Loaded ${appState.pendingGuests.length} pending guests`);
            
            GuestManager.updatePendingButtonUI();
            
        } catch (error) {
            console.error("Error in loadPendingGuests:", error);
            appState.pendingGuests = [];
            GuestManager.updatePendingButtonUI();
        }
    }

    static async showPendingGuests() {
        if (!DOM.pendingGuestsList) return;
        
        console.log("Showing pending guests modal...");
        
        try {
            // Refresh data first
            await GuestManager.loadPendingGuests();
            
            DOM.pendingGuestsList.innerHTML = '';
            
            if (appState.pendingGuests.length === 0) {
                if (DOM.noPendingGuests) {
                    DOM.noPendingGuests.style.display = 'block';
                    DOM.noPendingGuests.innerHTML = '<i class="fas fa-check-circle"></i> No pending guest requests';
                }
            } else {
                if (DOM.noPendingGuests) DOM.noPendingGuests.style.display = 'none';
                
                appState.pendingGuests.forEach((guest) => {
                    const guestDiv = document.createElement('div');
                    guestDiv.className = 'pending-guest';
                    guestDiv.innerHTML = `
                        <div class="guest-info">
                            <div class="guest-name">
                                <i class="fas fa-user"></i>
                                <strong>${Utils.escapeHtml(guest.guest_name)}</strong>
                            </div>
                            <div class="guest-details">
                                <small>Requested: ${new Date(guest.requested_at).toLocaleString()}</small>
                                <small>IP: ${guest.guest_ip || 'Unknown'}</small>
                            </div>
                        </div>
                        <div class="guest-actions">
                            <button class="btn btn-success btn-small" onclick="GuestManager.approveGuest('${guest.id}')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-danger btn-small" onclick="GuestManager.denyGuest('${guest.id}')">
                                <i class="fas fa-times"></i> Deny
                            </button>
                        </div>
                    `;
                    DOM.pendingGuestsList.appendChild(guestDiv);
                });
            }
            
            if (DOM.pendingGuestsModal) {
                DOM.pendingGuestsModal.style.display = 'flex';
            }
            
        } catch (error) {
            console.error("Error showing pending guests:", error);
            if (DOM.noPendingGuests) {
                DOM.noPendingGuests.style.display = 'block';
                DOM.noPendingGuests.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error loading pending guests';
            }
        }
    }

    static updatePendingButtonUI() {
        if (!DOM.pendingGuestsBtn || !DOM.pendingCount) return;
        
        const count = appState.pendingGuests.length;
        DOM.pendingCount.textContent = count;
        
        if (count > 0) {
            DOM.pendingGuestsBtn.style.display = 'flex';
            DOM.pendingGuestsBtn.classList.add('has-pending');
            DOM.pendingGuestsBtn.style.animation = 'pulsePending 2s infinite';
        } else {
            DOM.pendingGuestsBtn.style.display = 'flex';
            DOM.pendingGuestsBtn.classList.remove('has-pending');
            DOM.pendingGuestsBtn.style.animation = 'none';
        }
    }

    static async approveGuest(guestRecordId) {
        try {
            // Get guest details
            const { data: guest } = await supabaseClient
                .from('session_guests')
                .select('*')
                .eq('id', guestRecordId)
                .single();
            
            if (!guest) throw new Error("Guest not found");
            
            // Update status
            const { error } = await supabaseClient
                .from('session_guests')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .eq('id', guestRecordId);
            
            if (error) throw error;
            
            // Update local state
            appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== guestRecordId);
            GuestManager.updatePendingButtonUI();
            
            // Refresh modal if open
            if (DOM.pendingGuestsModal && DOM.pendingGuestsModal.style.display === 'flex') {
                GuestManager.showPendingGuests();
            }
            
            // Send system message
            await ChatManager.sendMessageToDB('System', `${guest.guest_name} has been approved and joined the chat.`);
            
            console.log(`✅ Approved guest: ${guest.guest_name}`);
            Utils.showNotification(`Approved ${guest.guest_name}`, 'success');
            
        } catch (error) {
            console.error("Error approving guest:", error);
            Utils.showNotification("Failed to approve guest", "error");
        }
    }

    static async denyGuest(guestRecordId) {
        try {
            const { data: guest } = await supabaseClient
                .from('session_guests')
                .select('*')
                .eq('id', guestRecordId)
                .single();
            
            if (!guest) throw new Error("Guest not found");
            
            const { error } = await supabaseClient
                .from('session_guests')
                .update({
                    status: 'rejected',
                    left_at: new Date().toISOString()
                })
                .eq('id', guestRecordId);
            
            if (error) throw error;
            
            appState.pendingGuests = appState.pendingGuests.filter(g => g.id !== guestRecordId);
            GuestManager.updatePendingButtonUI();
            
            if (DOM.pendingGuestsModal && DOM.pendingGuestsModal.style.display === 'flex') {
                GuestManager.showPendingGuests();
            }
            
            console.log(`❌ Denied guest: ${guest.guest_name}`);
            Utils.showNotification(`Denied ${guest.guest_name}`, 'info');
            
        } catch (error) {
            console.error("Error denying guest:", error);
            Utils.showNotification("Failed to deny guest", "error");
        }
    }

    static showNewGuestNotification(guest) {
        if (!appState.isHost) return;
        
        console.log("🔔 New guest notification:", guest.guest_name);
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'guest-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-user-plus" style="color: var(--accent-light); font-size: 20px;"></i>
                <div class="notification-text">
                    <strong>New Guest Request!</strong>
                    <small>${guest.guest_name} wants to join</small>
                </div>
                <button class="btn btn-small btn-success" onclick="GuestManager.viewPendingGuestsNow()">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Play sound if enabled
        if (appState.soundEnabled && DOM.messageSound) {
            try {
                DOM.messageSound.currentTime = 0;
                DOM.messageSound.play().catch(e => console.log("Sound play failed:", e));
            } catch (e) {
                console.log("Sound error:", e);
            }
        }
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 10000);
    }

    static viewPendingGuestsNow() {
        GuestManager.showPendingGuests();
        // Remove all notifications
        document.querySelectorAll('.guest-notification').forEach(n => n.remove());
    }
}

// ============================================
// REALTIME MANAGER - UPDATED
// ============================================

class RealtimeManager {
    static setupRealtimeSubscriptions() {
        if (!appState.currentSessionId) {
            console.log("⚠️ No session ID for subscriptions");
            return;
        }
        
        console.log("📡 Setting up real-time subscriptions for session:", appState.currentSessionId);
        
        // Remove existing subscriptions
        RealtimeManager.cleanupSubscriptions();
        
        // Create messages subscription
        appState.realtimeSubscription = supabaseClient
            .channel('public:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('📦 Realtime message received:', payload.new?.sender_name, payload.new?.message);
                    
                    // Filter by session_id in JavaScript instead of SQL filter
                    if (payload.new && payload.new.session_id === appState.currentSessionId) {
                        if (payload.new.sender_id !== appState.userId && !appState.isViewingHistory) {
                            console.log('✅ Displaying new message from:', payload.new.sender_name);
                            ChatManager.displayMessage({
                                id: payload.new.id,
                                sender: payload.new.sender_name,
                                text: payload.new.message,
                                image: payload.new.image_url,
                                time: Utils.formatTime(payload.new.created_at),
                                type: 'received',
                                is_historical: false,
                                reply_to_id: payload.new.reply_to_id
                            });
                            
                            if (appState.soundEnabled && DOM.messageSound) {
                                try {
                                    DOM.messageSound.currentTime = 0;
                                    DOM.messageSound.play().catch(e => console.log("Audio play failed:", e));
                                } catch (e) {
                                    console.log("Audio error:", e);
                                }
                            }
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 MESSAGES Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ SUCCESS: Subscribed to realtime messages!');
                }
                if (err) {
                    console.error('❌ Messages subscription error:', err);
                }
            });
        
        // Typing indicator subscription
        appState.typingSubscription = supabaseClient
            .channel('typing_updates_' + appState.currentSessionId)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sessions',
                    filter: `session_id=eq.${appState.currentSessionId}`
                },
                (payload) => {
                    console.log('⌨️ Typing update for session:', payload.new?.typing_user);
                    if (payload.new && payload.new.typing_user && payload.new.typing_user !== appState.userName) {
                        if (DOM.typingUser) DOM.typingUser.textContent = payload.new.typing_user;
                        if (DOM.typingIndicator) DOM.typingIndicator.classList.add('show');
                        
                        // Clear after 3 seconds
                        setTimeout(() => {
                            if (DOM.typingUser && DOM.typingUser.textContent === payload.new.typing_user) {
                                DOM.typingIndicator.classList.remove('show');
                            }
                        }, 3000);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('⌨️ TYPING Subscription status:', status);
                if (err) console.error('Typing subscription error:', err);
            });
        
        // Pending guests subscription (host only)
        if (appState.isHost) {
            console.log("👑 Setting up pending guests subscription for host");
            RealtimeManager.setupPendingGuestsSubscription();
        }
        
        // Emoji reactions subscription - CRITICAL FOR REAL-TIME EMOJIS
        RealtimeManager.setupEmojiReactionsSubscription();
    }

    static setupPendingGuestsSubscription() {
        console.log("🔄 Setting up pending guests subscription...");
        
        // Remove existing subscription
        if (appState.pendingSubscription) {
            supabaseClient.removeChannel(appState.pendingSubscription);
            appState.pendingSubscription = null;
        }
        
        if (!appState.isHost || !appState.currentSessionId) {
            console.log("⚠️ Cannot setup pending subscription: Not host or no session ID");
            return;
        }
        
        // Create subscription for session_guests
        appState.pendingSubscription = supabaseClient
            .channel('public:session_guests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_guests'
                },
                (payload) => {
                    console.log('📡 Pending guest change:', payload.eventType, payload.new?.guest_name);
                    
                    // Check if this guest belongs to current session
                    if (payload.new && payload.new.session_id === appState.currentSessionId) {
                        // Refresh pending guests list
                        GuestManager.loadPendingGuests();
                        
                        // Show notification for new pending guests
                        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
                            GuestManager.showNewGuestNotification(payload.new);
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 PENDING GUESTS Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ SUCCESS: Pending guests subscription active!');
                }
                if (err) {
                    console.error('❌ Pending guests subscription error:', err);
                }
            });
    }

    static setupPendingApprovalSubscription(sessionId) {
        console.log("⏳ Setting up pending approval subscription for guest...");
        
        if (appState.pendingSubscription) {
            supabaseClient.removeChannel(appState.pendingSubscription);
            appState.pendingSubscription = null;
        }
        
        // Subscribe to session_guests for THIS GUEST specifically
        appState.pendingSubscription = supabaseClient
            .channel('guest_approval_' + appState.userId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_guests',
                    filter: `guest_id=eq.${appState.userId}`
                },
                async (payload) => {
                    console.log('👤 Guest approval update:', payload.new?.status);
                    
                    if (payload.new && payload.new.session_id === sessionId) {
                        if (payload.new.status === 'approved') {
                            console.log("🎉 Guest has been APPROVED!");
                            
                            appState.currentSessionId = sessionId;
                            appState.isConnected = true;
                            ConnectionManager.saveSessionToStorage();
                            
                            // Remove pending subscription
                            if (appState.pendingSubscription) {
                                supabaseClient.removeChannel(appState.pendingSubscription);
                                appState.pendingSubscription = null;
                            }
                            
                            // Update UI and setup chat
                            UIManager.updateUIAfterConnection();
                            RealtimeManager.setupRealtimeSubscriptions();
                            await ChatManager.loadChatHistory();
                            await ChatManager.sendMessageToDB('System', `${appState.userName} has joined the chat.`);
                            
                            // Alert the user
                            Utils.showNotification("You have been approved! Welcome to the chat.", "success");
                            
                        } else if (payload.new.status === 'rejected') {
                            console.log("❌ Guest has been REJECTED");
                            Utils.showNotification("Your access request was rejected by the host.", "error");
                            setTimeout(() => location.reload(), 2000);
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('Guest approval subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Guest approval subscription active');
                }
                if (err) {
                    console.error('Guest approval subscription error:', err);
                }
            });
    }

    static setupEmojiReactionsSubscription() {
        if (!appState.currentSessionId) return;
        
        console.log('🎭 Setting up emoji reactions subscription');
        
        // Subscribe to message_emojis table for real-time updates
        supabaseClient
            .channel('emoji_reactions_' + appState.currentSessionId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_emojis'
                },
                async (payload) => {
                    console.log('🎭 Emoji reaction update:', payload.eventType, payload.new?.emoji, 'for message:', payload.new?.message_id);
                    
                    // Only process if we have a message ID
                    const messageId = payload.new?.message_id || payload.old?.message_id;
                    if (!messageId) return;
                    
                    // Check if this message belongs to current session
                    const { data: message } = await supabaseClient
                        .from('messages')
                        .select('session_id')
                        .eq('id', messageId)
                        .single();
                    
                    if (!message || message.session_id !== appState.currentSessionId) return;
                    
                    // Update emojis for this message
                    await ChatManager.updateMessageEmojis(messageId);
                }
            )
            .subscribe((status, err) => {
                console.log('🎭 Emoji reactions subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ EMOJI subscription active!');
                }
                if (err) {
                    console.error('❌ Emoji subscription error:', err);
                }
            });
    }

    static cleanupSubscriptions() {
        if (appState.realtimeSubscription) {
            console.log("Removing old message subscription");
            supabaseClient.removeChannel(appState.realtimeSubscription);
            appState.realtimeSubscription = null;
        }
        
        if (appState.typingSubscription) {
            supabaseClient.removeChannel(appState.typingSubscription);
            appState.typingSubscription = null;
        }
        
        if (appState.pendingSubscription) {
            supabaseClient.removeChannel(appState.pendingSubscription);
            appState.pendingSubscription = null;
        }
        
        // Remove emoji subscription
        const emojiChannel = supabaseClient.channel('emoji_reactions_' + appState.currentSessionId);
        if (emojiChannel) {
            supabaseClient.removeChannel(emojiChannel);
        }
    }

    static checkAndReconnectSubscriptions() {
        if (!appState.isConnected || !appState.currentSessionId) return;
        
        console.log("🔍 Checking subscription health...");
        
        // Reconnect messages if needed
        if (!appState.realtimeSubscription || appState.realtimeSubscription.state !== 'joined') {
            console.log("🔄 Reconnecting messages subscription...");
            RealtimeManager.setupRealtimeSubscriptions();
        }
        
        // Reconnect pending guests if host
        if (appState.isHost && (!appState.pendingSubscription || appState.pendingSubscription.state !== 'joined')) {
            console.log("🔄 Reconnecting pending guests subscription...");
            RealtimeManager.setupPendingGuestsSubscription();
            RealtimeManager.setupEmojiReactionsSubscription();
        }
    }
}

// ============================================
// HISTORY MANAGER
// ============================================

class HistoryManager {
    static async loadChatSessions() {
        try {
            if (!appState.isHost) {
                if (DOM.historyCards) {
                    DOM.historyCards.innerHTML = `
                        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                            <i class="fas fa-lock" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <div>History view requires host privileges</div>
                        </div>
                    `;
                }
                return;
            }
            
            const { data: sessions, error } = await supabaseClient
                .from('sessions')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (!DOM.historyCards) return;
            DOM.historyCards.innerHTML = '';
            
            for (const session of sessions) {
                const isActive = session.session_id === appState.currentSessionId && session.is_active;
                
                // Get guests
                const { data: guests } = await supabaseClient
                    .from('session_guests')
                    .select('guest_name, approved_at, status')
                    .eq('session_id', session.session_id)
                    .eq('status', 'approved');
                
                const guestCount = guests ? guests.length : 0;
                
                // Format dates
                const startDate = new Date(session.created_at);
                const endDate = session.ended_at ? new Date(session.ended_at) : null;
                
                let duration = 'Ongoing';
                if (endDate) {
                    const diffMs = endDate - startDate;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    
                    if (diffDays > 0) {
                        duration = `${diffDays}d ${diffHours % 24}h`;
                    } else if (diffHours > 0) {
                        duration = `${diffHours}h ${diffMins % 60}m`;
                    } else {
                        duration = `${diffMins}m`;
                    }
                }
                
                const card = document.createElement('div');
                card.className = 'session-card';
                if (isActive) card.classList.add('active');
                
                card.innerHTML = `
                    <div class="session-card-header">
                        <div class="session-header-left">
                            <div class="session-id" title="${session.session_id}">
                                <i class="fas fa-hashtag"></i> ${session.session_id.substring(0, 15)}...
                            </div>
                            <div class="session-stats">
                                <div class="stat-item guest-count" title="Approved guests">
                                    <i class="fas fa-users"></i>
                                    <span>${guestCount} Approved</span>
                                </div>
                                <div class="stat-item duration-badge" title="Session duration">
                                    <i class="fas fa-clock"></i>
                                    <span>${duration}</span>
                                </div>
                                <div class="stat-item status-badge">
                                    <i class="fas fa-${session.is_active ? 'play-circle' : 'stop-circle'}"></i>
                                    <span>${session.is_active ? 'Active' : 'Ended'}</span>
                                </div>
                            </div>
                        </div>
                        ${isActive ? '<div class="session-active-badge"><i class="fas fa-circle"></i> Live</div>' : ''}
                    </div>
                    
                    <div class="session-info">
                        <div class="session-info-section">
                            <div class="session-info-section-title">
                                <i class="fas fa-users"></i> Guest Information
                            </div>
                            
                            ${guests && guests.length > 0 ? `
                            <div class="guest-list-container">
                                <div class="guest-list">
                                    ${guests.slice(0, 3).map(guest => `
                                        <div class="guest-item">
                                            <div class="guest-item-info">
                                                <div class="guest-name">
                                                    <i class="fas fa-user"></i>
                                                    ${guest.guest_name}
                                                </div>
                                                <div class="guest-meta">
                                                    <span title="Joined at: ${new Date(guest.approved_at || guest.requested_at).toLocaleString()}">
                                                        <i class="fas fa-calendar"></i> ${new Date(guest.approved_at || guest.requested_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="guest-status ${guest.status}">
                                                ${guest.status === 'approved' ? 'Approved' : guest.status === 'pending' ? 'Pending' : 'Rejected'}
                                            </div>
                                        </div>
                                    `).join('')}
                                    
                                    ${guests.length > 3 ? `
                                        <div class="guest-item" style="justify-content: center; background: rgba(138, 43, 226, 0.1);">
                                            <div class="guest-name">
                                                <i class="fas fa-ellipsis-h"></i>
                                                ${guests.length - 3} more guests...
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            ` : `
                            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                                <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                                <div>No guests in this session</div>
                            </div>
                            `}
                            
                            <div class="guest-info-rows">
                                <div class="guest-info-row">
                                    <span class="guest-info-label">
                                        <i class="fas fa-user-plus"></i> Total Guests:
                                    </span>
                                    <span class="guest-info-value">
                                        ${guestCount} / ${session.max_guests || 10}
                                    </span>
                                </div>
                                <div class="guest-info-row">
                                    <span class="guest-info-label">
                                        <i class="fas fa-check-circle"></i> Approval Required:
                                    </span>
                                    <span class="guest-info-value">
                                        ${session.requires_approval ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div class="guest-info-row">
                                    <span class="guest-info-label">
                                        <i class="fas fa-calendar-alt"></i> Session Date:
                                    </span>
                                    <span class="guest-info-value" title="${startDate.toLocaleString()}">
                                        ${startDate.toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="session-actions">
                        <button class="btn btn-secondary btn-small" onclick="HistoryManager.viewSessionHistory('${session.session_id}')" title="View chat history">
                            <i class="fas fa-eye"></i> View Chat
                        </button>
                        <button class="btn btn-info btn-small" onclick="HistoryManager.showSessionGuests('${session.session_id}')" title="View all guest details">
                            <i class="fas fa-users"></i> All Guests
                        </button>
                        ${appState.isHost && !isActive ? `
                        <button class="btn btn-danger btn-small" onclick="HistoryManager.deleteSession('${session.session_id}')" title="Delete this session">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        ` : ''}
                    </div>
                `;
                
                DOM.historyCards.appendChild(card);
            }
            
        } catch (error) {
            console.error("Error loading sessions:", error);
            if (DOM.historyCards) {
                DOM.historyCards.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Error loading sessions</div>';
            }
        }
    }

    static async viewSessionHistory(sessionId) {
        appState.isViewingHistory = true;
        appState.viewingSessionId = sessionId;
        
        if (DOM.chatModeIndicator) DOM.chatModeIndicator.style.display = 'flex';
        if (DOM.chatTitle) DOM.chatTitle.innerHTML = '<i class="fas fa-history"></i> Historical Chat';
        if (DOM.messageInput) {
            DOM.messageInput.disabled = true;
            DOM.messageInput.placeholder = "Cannot send messages in historical view";
        }
        if (DOM.sendMessageBtn) DOM.sendMessageBtn.disabled = true;
        
        await ChatManager.loadChatHistory(sessionId);
        
        if (DOM.chatMessages) DOM.chatMessages.scrollTop = 0;
    }

    static async deleteSession(sessionId) {
        if (!appState.isHost) {
            Utils.showNotification("Only hosts can delete sessions.", "error");
            return;
        }
        
        if (!confirm("⚠️ WARNING: Are you sure you want to delete this session?\n\nThis will permanently delete all data for this session!\n\nThis action CANNOT be undone!")) {
            return;
        }
        
        try {
            const { error } = await supabaseClient
                .rpc('delete_session_with_data', {
                    session_id_to_delete: sessionId
                });
            
            if (error) throw error;
            
            console.log("✅ Session deleted successfully via RPC!");
            Utils.showNotification("Session deleted successfully!", "success");
            
            await HistoryManager.loadChatSessions();
            
            if (appState.viewingSessionId === sessionId) {
                HistoryManager.returnToActiveChat();
            }
            
        } catch (error) {
            console.error("❌ Error deleting session:", error);
            Utils.showNotification("Error deleting session", "error");
        }
    }

    static returnToActiveChat() {
        appState.isViewingHistory = false;
        appState.viewingSessionId = null;
        
        if (DOM.chatModeIndicator) DOM.chatModeIndicator.style.display = 'none';
        if (DOM.chatTitle) DOM.chatTitle.innerHTML = '<i class="fas fa-comments"></i> Active Chat';
        if (DOM.messageInput) {
            DOM.messageInput.disabled = false;
            DOM.messageInput.placeholder = "Type your message here... (Press Enter to send, Shift+Enter for new line)";
            DOM.messageInput.focus();
        }
        if (DOM.sendMessageBtn) DOM.sendMessageBtn.disabled = false;
        
        ChatManager.loadChatHistory();
    }

    static async showSessionGuests(sessionId) {
        try {
            const { data: guests } = await supabaseClient
                .from('session_guests')
                .select('*')
                .eq('session_id', sessionId)
                .order('requested_at', { ascending: true });
            
            if (!guests) return;
            
            const approvedGuests = guests.filter(g => g.status === 'approved');
            const pendingGuests = guests.filter(g => g.status === 'pending');
            
            let guestInfo = `
                <div class="guest-details-modal">
                    <h3><i class="fas fa-users"></i> Guest Details</h3>
                    <p><strong>Session ID:</strong> ${sessionId.substring(0, 20)}...</p>
                    
                    <div class="guest-status-section">
                        <h4><i class="fas fa-check-circle" style="color: var(--success-green);"></i> Approved Guests (${approvedGuests.length})</h4>
                        ${approvedGuests.length > 0 ? approvedGuests.map(g => `
                            <div class="guest-detail">
                                <strong>${g.guest_name}</strong>
                                <div class="guest-meta">
                                    <small>Joined: ${new Date(g.approved_at).toLocaleString()}</small>
                                    <small>IP: ${g.guest_ip || 'Unknown'}</small>
                                </div>
                            </div>
                        `).join('') : '<p>No approved guests</p>'}
                    </div>
                    
                    ${pendingGuests.length > 0 ? `
                    <div class="guest-status-section">
                        <h4><i class="fas fa-clock" style="color: var(--warning-yellow);"></i> Pending Guests (${pendingGuests.length})</h4>
                        ${pendingGuests.map(g => `
                            <div class="guest-detail">
                                <strong>${g.guest_name}</strong>
                                <div class="guest-meta">
                                    <small>Requested: ${new Date(g.requested_at).toLocaleString()}</small>
                                    <small>IP: ${g.guest_ip || 'Unknown'}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            `;
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px; max-height: 80vh;">
                    <div class="modal-header">
                        <h2><i class="fas fa-users"></i> Session Guests</h2>
                        <button class="btn btn-secondary btn-small close-guest-modal">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto;">
                        ${guestInfo}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.close-guest-modal').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
        } catch (error) {
            console.error("Error loading session guests:", error);
            Utils.showNotification("Failed to load guest details.", "error");
        }
    }
}

// ============================================
// USER MANAGEMENT
// ============================================

class UserManager {
    static async loadUsers() {
        if (!appState.isHost) return;
        
        try {
            const { data: users, error } = await supabaseClient
                .from('user_management')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            appState.users = users || [];
            UserManager.renderUsers(users);
            
        } catch (error) {
            console.error("Error loading users:", error);
            if (DOM.usersList) {
                DOM.usersList.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--danger-red);">
                        <i class="fas fa-exclamation-circle"></i>
                        <div>Error loading users</div>
                    </div>
                `;
            }
        }
    }

    static renderUsers(users) {
        if (!DOM.usersList) return;
        
        if (!users || users.length === 0) {
            DOM.usersList.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h3>No Users Found</h3>
                    <p>Click "Add New User" to create your first user.</p>
                </div>
            `;
            return;
        }
        
        DOM.usersList.innerHTML = '';
        
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = `user-card ${user.role} ${user.is_active ? '' : 'inactive'}`;
            
            const lastLogin = user.last_login 
                ? new Date(user.last_login).toLocaleString() 
                : 'Never';
            
            userCard.innerHTML = `
                <div class="user-header">
                    <div class="user-name">
                        <i class="fas fa-user"></i>
                        <h3>${Utils.escapeHtml(user.display_name)}</h3>
                    </div>
                    <div class="user-badges">
                        <span class="user-badge badge-${user.role}">${user.role}</span>
                        ${!user.is_active ? '<span class="user-badge badge-inactive">Inactive</span>' : ''}
                    </div>
                </div>
                <div class="user-details">
                    <div class="user-detail">
                        <span class="user-detail-label">Username:</span>
                        <span class="user-detail-value">${Utils.escapeHtml(user.username)}</span>
                    </div>
                    <div class="user-detail">
                        <span class="user-detail-label">Created:</span>
                        <span class="user-detail-value">${Utils.formatDate(user.created_at)}</span>
                    </div>
                    <div class="user-detail">
                        <span class="user-detail-label">Last Login:</span>
                        <span class="user-detail-value">${lastLogin}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary btn-small" onclick="UserManager.editUserModalOpen('${user.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            `;
            
            DOM.usersList.appendChild(userCard);
        });
    }

    static showAddUserModal() {
        if (!appState.isHost) return;
        
        if (DOM.newUsername) DOM.newUsername.value = '';
        if (DOM.newDisplayName) DOM.newDisplayName.value = '';
        if (DOM.newPassword) DOM.newPassword.value = '';
        if (DOM.newRole) DOM.newRole.value = 'guest';
        if (DOM.addUserError) DOM.addUserError.style.display = 'none';
        
        if (DOM.addUserModal) DOM.addUserModal.style.display = 'flex';
    }

    static async saveNewUser() {
        if (!appState.isHost) return;
        
        const username = DOM.newUsername ? DOM.newUsername.value.trim() : '';
        const displayName = DOM.newDisplayName ? DOM.newDisplayName.value.trim() : '';
        const password = DOM.newPassword ? DOM.newPassword.value : '';
        const role = DOM.newRole ? DOM.newRole.value : 'guest';
        
        if (!username || !displayName || !password) {
            if (DOM.addUserError) {
                DOM.addUserError.textContent = "All fields are required.";
                DOM.addUserError.style.display = 'block';
            }
            return;
        }
        
        try {
            const { error } = await supabaseClient
                .from('user_management')
                .insert([{
                    username: username,
                    display_name: displayName,
                    password_hash: password,
                    role: role,
                    created_by: appState.userName,
                    is_active: true
                }]);
            
            if (error) throw error;
            
            if (DOM.addUserModal) DOM.addUserModal.style.display = 'none';
            await UserManager.loadUsers();
            Utils.showNotification(`User "${username}" created successfully!`, "success");
            
        } catch (error) {
            console.error("Error creating user:", error);
            if (DOM.addUserError) {
                DOM.addUserError.textContent = `Error: ${error.message}`;
                DOM.addUserError.style.display = 'block';
            }
        }
    }

    static editUserModalOpen(userId) {
        const user = appState.users.find(u => u.id === userId);
        if (!user) return;
        
        if (DOM.editUserId) DOM.editUserId.value = user.id;
        if (DOM.editUsername) DOM.editUsername.value = user.username;
        if (DOM.editDisplayName) DOM.editDisplayName.value = user.display_name;
        if (DOM.editPassword) DOM.editPassword.value = '';
        if (DOM.editRole) DOM.editRole.value = user.role;
        if (DOM.editIsActive) DOM.editIsActive.checked = user.is_active;
        if (DOM.editUserError) DOM.editUserError.style.display = 'none';
        
        if (DOM.editUserModal) DOM.editUserModal.style.display = 'flex';
    }

    static async updateUser() {
        if (!appState.isHost) return;
        
        const userId = DOM.editUserId ? DOM.editUserId.value : '';
        const displayName = DOM.editDisplayName ? DOM.editDisplayName.value.trim() : '';
        const password = DOM.editPassword ? DOM.editPassword.value : '';
        const role = DOM.editRole ? DOM.editRole.value : '';
        const isActive = DOM.editIsActive ? DOM.editIsActive.checked : true;
        
        if (!userId) return;
        
        try {
            const updateData = {
                display_name: displayName,
                role: role,
                is_active: isActive,
                updated_at: new Date().toISOString()
            };
            
            if (password) {
                updateData.password_hash = password;
            }
            
            const { error } = await supabaseClient
                .from('user_management')
                .update(updateData)
                .eq('id', userId);
            
            if (error) throw error;
            
            if (DOM.editUserModal) DOM.editUserModal.style.display = 'none';
            await UserManager.loadUsers();
            Utils.showNotification("User updated successfully!", "success");
            
        } catch (error) {
            console.error("Error updating user:", error);
            if (DOM.editUserError) {
                DOM.editUserError.textContent = `Error: ${error.message}`;
                DOM.editUserError.style.display = 'block';
            }
        }
    }

    static async deleteUser() {
        if (!appState.isHost) return;
        
        const userId = DOM.editUserId ? DOM.editUserId.value : '';
        if (!userId) return;
        
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        
        try {
            const { error } = await supabaseClient
                .from('user_management')
                .delete()
                .eq('id', userId);
            
            if (error) throw error;
            
            if (DOM.editUserModal) DOM.editUserModal.style.display = 'none';
            await UserManager.loadUsers();
            Utils.showNotification("User deleted successfully!", "success");
            
        } catch (error) {
            console.error("Error deleting user:", error);
            Utils.showNotification("Error deleting user", "error");
        }
    }

    static searchUsers(searchTerm) {
        if (!searchTerm) {
            UserManager.renderUsers(appState.users);
            return;
        }
        
        const filteredUsers = appState.users.filter(user => 
            user.username.toLowerCase().includes(searchTerm) ||
            user.display_name.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );
        
        UserManager.renderUsers(filteredUsers);
    }
}

// ============================================
// UI MANAGER
// ============================================

class UIManager {
    static updatePasswordHint(username) {
        const passwordHint = document.getElementById('passwordHint');
        if (!passwordHint) return;
        
        const lowerUsername = username.toLowerCase();
        if (lowerUsername === 'guest') {
            passwordHint.textContent = "Test password: guest123";
            passwordHint.style.display = 'block';
        } else if (lowerUsername === 'host') {
            passwordHint.textContent = "Test password: host123";
            passwordHint.style.display = 'block';
        } else if (lowerUsername === 'admin') {
            passwordHint.textContent = "Administrator account";
            passwordHint.style.display = 'block';
        } else {
            passwordHint.style.display = 'none';
        }
    }

    static updateUIForPendingGuest() {
        if (DOM.statusIndicator) DOM.statusIndicator.className = 'status-indicator offline';
        if (DOM.userRoleDisplay) DOM.userRoleDisplay.textContent = `${appState.userName} (Pending Approval)`;
        if (DOM.logoutBtn) DOM.logoutBtn.style.display = 'flex';
        if (DOM.pendingGuestsBtn) DOM.pendingGuestsBtn.style.display = 'none';
        
        if (DOM.messageInput) {
            DOM.messageInput.disabled = true;
            DOM.messageInput.placeholder = "Waiting for host approval...";
        }
        
        if (DOM.sendMessageBtn) DOM.sendMessageBtn.disabled = true;
        
        if (DOM.chatMessages) {
            DOM.chatMessages.innerHTML = `
                <div class="message received">
                    <div class="message-sender">System</div>
                    <div class="message-content">
                        <div class="message-text">Your access request has been sent to the host. Please wait for approval.</div>
                        <div class="message-time">Just now</div>
                    </div>
                </div>
            `;
        }
    }

    static updateUIAfterConnection() {
        if (!DOM.statusIndicator || !DOM.userRoleDisplay || !DOM.logoutBtn) return;
        
        DOM.statusIndicator.className = 'status-indicator';
        DOM.statusIndicator.classList.add('online');
        DOM.userRoleDisplay.textContent = `${appState.userName} (Connected)`;
        DOM.logoutBtn.style.display = 'flex';
        
        if (DOM.messageInput) {
            DOM.messageInput.disabled = false;
            DOM.messageInput.placeholder = "Type your message here... (Press Enter to send, Shift+Enter for new line)";
            DOM.messageInput.focus();
        }
        
        if (DOM.sendMessageBtn) DOM.sendMessageBtn.disabled = false;
        
        if (DOM.adminSection) {
            DOM.adminSection.style.display = appState.isHost ? 'block' : 'none';
            if (appState.isHost) {
                // Force show history tab by default
                UIManager.switchAdminTab('history');
                HistoryManager.loadChatSessions();
            }
        }
        
        if (DOM.pendingGuestsBtn) {
            DOM.pendingGuestsBtn.style.display = appState.isHost && appState.currentSessionId ? 'flex' : 'none';
            if (appState.isHost) RealtimeManager.setupPendingGuestsSubscription();
        }
        
        if (appState.isViewingHistory) HistoryManager.returnToActiveChat();
    }

    static async handleLogout() {
        if (!confirm("Are you sure you want to logout?")) return;
        
        // Clear UI
        if (DOM.chatMessages) {
            DOM.chatMessages.innerHTML = `
                <div class="message received">
                    <div class="message-sender">System</div>
                    <div class="message-content">
                        <div class="message-text">Disconnected. Please reconnect to continue.</div>
                        <div class="message-time">Just now</div>
                    </div>
                </div>
            `;
        }
        
        if (DOM.statusIndicator) DOM.statusIndicator.className = 'status-indicator offline';
        if (DOM.userRoleDisplay) DOM.userRoleDisplay.textContent = "Disconnected";
        if (DOM.logoutBtn) DOM.logoutBtn.style.display = 'none';
        if (DOM.pendingGuestsBtn) DOM.pendingGuestsBtn.style.display = 'none';
        
        if (DOM.messageInput) {
            DOM.messageInput.disabled = true;
            DOM.messageInput.value = '';
            DOM.messageInput.placeholder = "Please connect to start chatting";
        }
        
        if (DOM.sendMessageBtn) DOM.sendMessageBtn.disabled = true;
        if (DOM.adminSection) DOM.adminSection.style.display = 'none';
        
        // Update database
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
                        .from('session_guests')
                        .update({ 
                            status: 'left',
                            left_at: new Date().toISOString()
                        })
                        .eq('session_id', appState.currentSessionId)
                        .eq('guest_id', appState.userId);
                }
            } catch (error) {
                console.error("Error updating session on logout:", error);
            }
        }
        
        // Remove subscriptions
        RealtimeManager.cleanupSubscriptions();
        
        // Clear storage and reset state
        localStorage.removeItem('writeToMe_session');
        
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
        appState.messageReplies.clear();
        
        UIManager.showConnectionModal();
    }

    static showConnectionModal() {
        if (DOM.connectionModal) {
            DOM.connectionModal.style.display = 'flex';
            DOM.connectionModal.classList.add('show');
            document.body.classList.add('modal-open');
        }
        
        const mainContainer = document.querySelector('.main-container') || document.querySelector('.app-container');
        if (mainContainer) {
            mainContainer.style.display = 'none';
        }
        
        if (DOM.usernameInput) DOM.usernameInput.value = '';
        if (DOM.passwordInput) DOM.passwordInput.value = '';
        if (DOM.passwordError) DOM.passwordError.style.display = 'none';
        
        const passwordHint = document.getElementById('passwordHint');
        if (passwordHint) passwordHint.style.display = 'none';
        
        if (DOM.connectBtn) {
            DOM.connectBtn.disabled = false;
            DOM.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        }
        
        UIManager.clearSensitiveData();
    }

    static hideConnectionModal() {
        if (DOM.connectionModal) {
            DOM.connectionModal.style.display = 'none';
            DOM.connectionModal.classList.remove('show');
        }
        document.body.classList.remove('modal-open');
        
        const mainContainer = document.querySelector('.main-container') || document.querySelector('.app-container');
        if (mainContainer) {
            mainContainer.style.display = 'block';
        }
    }

    static clearSensitiveData() {
        const ipElements = document.querySelectorAll('[class*="ip"], [class*="IP"]');
        ipElements.forEach(el => {
            if (el.textContent.includes('IP:') || el.textContent.includes('ip:')) {
                el.textContent = 'IP: ***';
            }
        });
    }

    static switchAdminTab(tabName) {
        console.log("Switching to tab:", tabName);
        
        // Reset all tabs
        if (DOM.historyTabBtn && DOM.usersTabBtn) {
            DOM.historyTabBtn.classList.remove('active');
            DOM.usersTabBtn.classList.remove('active');
        }
        
        if (DOM.historyTabContent && DOM.usersTabContent) {
            DOM.historyTabContent.style.display = 'none';
            DOM.usersTabContent.style.display = 'none';
            DOM.historyTabContent.classList.remove('active');
            DOM.usersTabContent.classList.remove('active');
        }
        
        // Activate selected tab
        if (tabName === 'history') {
            if (DOM.historyTabBtn) {
                DOM.historyTabBtn.classList.add('active');
            }
            if (DOM.historyTabContent) {
                DOM.historyTabContent.style.display = 'block';
                DOM.historyTabContent.classList.add('active');
            }
            HistoryManager.loadChatSessions();
        } else if (tabName === 'users') {
            if (DOM.usersTabBtn) {
                DOM.usersTabBtn.classList.add('active');
            }
            if (DOM.usersTabContent) {
                DOM.usersTabContent.style.display = 'block';
                DOM.usersTabContent.classList.add('active');
            }
            UserManager.loadUsers();
        }
    }
}

// ============================================
// IMAGE MANAGER
// ============================================

class ImageManager {
    static async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !DOM.imageUpload) return;
        
        console.log('📸 Image selected:', file.name, file.size, file.type);
        
        // Validate file
        const validation = Utils.isValidImage(file);
        if (!validation.valid) {
            Utils.showNotification(validation.error, "error");
            DOM.imageUpload.value = '';
            return;
        }
        
        // Disable send button and show loading
        if (DOM.sendMessageBtn) {
            DOM.sendMessageBtn.disabled = true;
            DOM.sendMessageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            console.log('📸 Image loaded, size:', e.target.result.length, 'chars');
            
            try {
                // Auto-send the image WITHOUT filename in text
                const result = await ChatManager.sendMessageToDB('', e.target.result);
                
                if (result && result.success) {
                    console.log('✅ Image sent successfully');
                    
                    // Clear file input
                    DOM.imageUpload.value = '';
                    
                    // Reset send button
                    if (DOM.sendMessageBtn) {
                        DOM.sendMessageBtn.disabled = false;
                        DOM.sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
                    }
                } else {
                    throw new Error("Failed to send image");
                }
                
            } catch (error) {
                console.error("❌ Error sending image:", error);
                Utils.showNotification("Failed to send image", "error");
                
                // Reset send button
                if (DOM.sendMessageBtn) {
                    DOM.sendMessageBtn.disabled = false;
                    DOM.sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
                }
            }
        };
        
        reader.onerror = function(e) {
            console.error('❌ Error reading image:', e);
            Utils.showNotification("Error reading image file. Please try another image.", "error");
            DOM.imageUpload.value = '';
            
            // Reset send button
            if (DOM.sendMessageBtn) {
                DOM.sendMessageBtn.disabled = false;
                DOM.sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
            }
        };
        
        reader.readAsDataURL(file);
    }

    static showFullImage(src) {
        if (DOM.fullSizeImage) DOM.fullSizeImage.src = src;
        if (DOM.imageModal) DOM.imageModal.style.display = 'flex';
    }
}

// ============================================
// SOUND MANAGER
// ============================================

class SoundManager {
    static toggleSound() {
        appState.soundEnabled = !appState.soundEnabled;
        SoundManager.updateSoundControl();
        
        const savedSession = localStorage.getItem('writeToMe_session');
        if (savedSession) {
            const sessionData = JSON.parse(savedSession);
            sessionData.soundEnabled = appState.soundEnabled;
            localStorage.setItem('writeToMe_session', JSON.stringify(sessionData));
        }
    }

    static updateSoundControl() {
        if (!DOM.soundControl) return;
        
        if (appState.soundEnabled) {
            DOM.soundControl.innerHTML = '<i class="fas fa-volume-up"></i> <span>Sound On</span>';
            DOM.soundControl.classList.remove('muted');
        } else {
            DOM.soundControl.innerHTML = '<i class="fas fa-volume-mute"></i> <span>Sound Off</span>';
            DOM.soundControl.classList.add('muted');
        }
    }
}

// ============================================
// TYPING MANAGER
// ============================================

class TypingManager {
    static async handleTyping() {
        if (!appState.currentSessionId || appState.isViewingHistory || !appState.isConnected) return;
        
        try {
            console.log('⌨️ User typing:', appState.userName);
            
            await supabaseClient
                .from('sessions')
                .update({ 
                    typing_user: appState.userName,
                    updated_at: new Date().toISOString()
                })
                .eq('session_id', appState.currentSessionId);
            
            // Clear typing indicator after 1 second
            if (appState.typingTimeout) {
                clearTimeout(appState.typingTimeout);
            }
            
            appState.typingTimeout = setTimeout(() => {
                supabaseClient
                    .from('sessions')
                    .update({ 
                        typing_user: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', appState.currentSessionId)
                    .catch(e => console.log("Error clearing typing:", e));
            }, 1000);
        } catch (error) {
            console.log("Typing indicator error:", error);
        }
    }
}

// ============================================
// EMOJI MANAGER
// ============================================

class EmojiManager {
    static toggleEmojiPicker() {
        if (DOM.emojiPicker) {
            DOM.emojiPicker.classList.toggle('show');
        }
    }

    static populateEmojis() {
        if (!DOM.emojiPicker) return;
        
        DOM.emojiPicker.innerHTML = '';
        appState.emojis.forEach(emoji => {
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'emoji';
            emojiSpan.textContent = emoji;
            emojiSpan.onclick = () => {
                if (DOM.messageInput) {
                    DOM.messageInput.value += emoji;
                    DOM.emojiPicker.classList.remove('show');
                    DOM.messageInput.focus();
                }
            };
            DOM.emojiPicker.appendChild(emojiSpan);
        });
    }
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

class EventManager {
    static setupEventListeners() {
        // Connection modal
        if (DOM.usernameInput) {
            DOM.usernameInput.addEventListener('input', function() {
                if (DOM.passwordError) DOM.passwordError.style.display = 'none';
                UIManager.updatePasswordHint(this.value);
            });
        }
        
        if (DOM.usersTabBtn) {
            DOM.usersTabBtn.addEventListener('click', () => {
                console.log("User management tab clicked");
                UIManager.switchAdminTab('users');
                UserManager.loadUsers();
            });
        }
        
        if (DOM.passwordInput) {
            DOM.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') ConnectionManager.handleConnect();
            });
        }
        
        if (DOM.connectBtn) {
            DOM.connectBtn.addEventListener('click', ConnectionManager.handleConnect);
        }
        
        // Logout
        if (DOM.logoutBtn) {
            DOM.logoutBtn.addEventListener('click', UIManager.handleLogout);
        }
        
        // Pending guests
        if (DOM.pendingGuestsBtn) {
            DOM.pendingGuestsBtn.addEventListener('click', GuestManager.showPendingGuests);
        }
        
        if (DOM.closePendingModal) {
            DOM.closePendingModal.addEventListener('click', () => {
                if (DOM.pendingGuestsModal) DOM.pendingGuestsModal.style.display = 'none';
            });
        }
        
        // Chat functionality
        if (DOM.messageInput) {
            DOM.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ChatManager.sendMessage();
                }
            });
            
            DOM.messageInput.addEventListener('input', TypingManager.handleTyping);
            
            // Auto-resize textarea
            DOM.messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
        
        if (DOM.sendMessageBtn) {
            DOM.sendMessageBtn.addEventListener('click', ChatManager.sendMessage);
        }
        
        if (DOM.clearChatBtn) {
            DOM.clearChatBtn.addEventListener('click', ChatManager.clearChat);
        }
        
        // Image upload
        if (DOM.imageUpload) {
            DOM.imageUpload.addEventListener('change', ImageManager.handleImageUpload);
        }
        
        // Emoji picker
        if (DOM.emojiBtn) {
            DOM.emojiBtn.addEventListener('click', EmojiManager.toggleEmojiPicker);
        }
        
        // Return to active chat
        if (DOM.returnToActiveBtn) {
            DOM.returnToActiveBtn.addEventListener('click', HistoryManager.returnToActiveChat);
        }
        
        // History
        if (DOM.refreshHistoryBtn) {
            DOM.refreshHistoryBtn.addEventListener('click', HistoryManager.loadChatSessions);
        }
        
        // Sound control
        if (DOM.soundControl) {
            DOM.soundControl.addEventListener('click', SoundManager.toggleSound);
        }
        
        // Image modal
        if (DOM.imageModal) {
            DOM.imageModal.addEventListener('click', (e) => {
                // Close only if clicking on the overlay, not the image
                if (e.target === DOM.imageModal || e.target.classList.contains('image-modal-overlay')) {
                    DOM.imageModal.style.display = 'none';
                }
            });
            
            // Also add escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && DOM.imageModal && DOM.imageModal.style.display === 'flex') {
                    DOM.imageModal.style.display = 'none';
                }
            });
        }
        
        // Click outside emoji picker to close
        document.addEventListener('click', (e) => {
            if (DOM.emojiPicker && !DOM.emojiPicker.contains(e.target) && DOM.emojiBtn && !DOM.emojiBtn.contains(e.target)) {
                DOM.emojiPicker.classList.remove('show');
            }
        });
        
        // Tab switching
        if (DOM.historyTabBtn) {
            DOM.historyTabBtn.addEventListener('click', () => UIManager.switchAdminTab('history'));
        }
        
        if (DOM.usersTabBtn) {
            DOM.usersTabBtn.addEventListener('click', () => UIManager.switchAdminTab('users'));
        }
        
        // User management listeners
        EventManager.setupUserManagementListeners();
    }
    
    static setupUserManagementListeners() {
        // Add user button
        if (DOM.addUserBtn) {
            DOM.addUserBtn.addEventListener('click', UserManager.showAddUserModal);
        }
        
        // Close modals
        if (DOM.closeAddUserModal) {
            DOM.closeAddUserModal.addEventListener('click', () => {
                if (DOM.addUserModal) DOM.addUserModal.style.display = 'none';
            });
        }
        
        if (DOM.closeEditUserModal) {
            DOM.closeEditUserModal.addEventListener('click', () => {
                if (DOM.editUserModal) DOM.editUserModal.style.display = 'none';
            });
        }
        
        // Save new user
        if (DOM.saveUserBtn) {
            DOM.saveUserBtn.addEventListener('click', UserManager.saveNewUser);
        }
        
        // Update user
        if (DOM.updateUserBtn) {
            DOM.updateUserBtn.addEventListener('click', UserManager.updateUser);
        }
        
        // Delete user
        if (DOM.deleteUserBtn) {
            DOM.deleteUserBtn.addEventListener('click', UserManager.deleteUser);
        }
        
        // Search users
        if (DOM.userSearchInput) {
            DOM.userSearchInput.addEventListener('input', function() {
                UserManager.searchUsers(this.value.toLowerCase());
            });
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

async function initApp() {
    console.log("🚀 Initializing WriteToMira App...");
    
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
            
            console.log("🔄 Attempting to reconnect to saved session...");
            
            if (await ConnectionManager.reconnectToSession()) {
                appState.isConnected = true;
                UIManager.hideConnectionModal();
                UIManager.updateUIAfterConnection();
                console.log("✅ Successfully reconnected!");
            } else {
                console.log("❌ Failed to reconnect, clearing session");
                localStorage.removeItem('writeToMe_session');
                UIManager.showConnectionModal();
            }
        } catch (e) {
            console.error("Error parsing saved session:", e);
            localStorage.removeItem('writeToMe_session');
            UIManager.showConnectionModal();
        }
    } else {
        UIManager.showConnectionModal();
    }
    
    SoundManager.updateSoundControl();
    EventManager.setupEventListeners();
    EmojiManager.populateEmojis();
    
    if (appState.isHost || savedSession) {
        HistoryManager.loadChatSessions();
    }
    
    // Start subscription health check
    setInterval(RealtimeManager.checkAndReconnectSubscriptions, 15000);
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Export functions to global scope
window.MessageActions = MessageActions;
window.ChatManager = ChatManager;
window.ConnectionManager = ConnectionManager;
window.GuestManager = GuestManager;
window.RealtimeManager = RealtimeManager;
window.HistoryManager = HistoryManager;
window.UserManager = UserManager;
window.UIManager = UIManager;
window.ImageManager = ImageManager;
window.SoundManager = SoundManager;
window.TypingManager = TypingManager;
window.EmojiManager = EmojiManager;

// Aliases for backward compatibility
window.editMessage = MessageActions.editMessage;
window.deleteMessage = MessageActions.deleteMessage;
window.replyToMessage = MessageActions.replyToMessage;
window.cancelReply = MessageActions.cancelReply;
window.addEmojiToMessage = MessageActions.addEmojiToMessage;
window.showMessageEmojiPicker = MessageActions.showMessageEmojiPicker;
window.scrollToMessage = MessageActions.scrollToMessage;
window.showFullImage = ImageManager.showFullImage;
window.approveGuest = GuestManager.approveGuest;
window.denyGuest = GuestManager.denyGuest;
window.viewSessionHistory = HistoryManager.viewSessionHistory;
window.deleteSession = HistoryManager.deleteSession;
window.showSessionGuests = HistoryManager.showSessionGuests;
window.editUserModalOpen = UserManager.editUserModalOpen;
window.viewPendingGuestsNow = GuestManager.viewPendingGuestsNow;

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);
