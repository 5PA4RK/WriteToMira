// chat.js - COMPLETE FIXED VERSION

const ChatModule = (function() {
    let appState = null;
    let supabaseClient = null;
    let elements = {};
    const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];
    let scrollTimeout = null;

    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const renderReactions = (container, reactions) => {
        if (!container) return;
        if (!reactions?.length) { container.innerHTML = ''; return; }
        const counts = {};
        reactions.forEach(r => counts[r.emoji] = (counts[r.emoji] || 0) + 1);
        const messageId = container.closest('.message')?.id.replace('msg-', '') || '';
        container.innerHTML = Object.entries(counts).map(([emoji, count]) => 
            `<span class="reaction-badge" onclick="window.toggleReaction('${messageId}', '${emoji}')">${emoji} ${count}</span>`
        ).join('');
    };

    const closeMessageActions = () => {
        if (appState?.activeMessageActions) {
            const menu = document.getElementById(`actions-${appState.activeMessageActions}`);
            if (menu) { menu.classList.remove('show'); menu.style.display = 'none'; }
            appState.activeMessageActions = null;
        }
    };

    // ONLY ONE getActionsMenuHtml function - KEEP THIS ONE
    const getActionsMenuHtml = (message) => {
        const isOwn = message.sender === (appState?.userName);
        const isMobile = window.innerWidth <= 768;
        const escapedText = (message.text || '').replace(/'/g, "\\'");
        
        return `<div class="message-actions-menu" id="actions-${message.id}" style="display:none;">
            ${isMobile ? '<button class="close-actions-menu" onclick="window.ChatModule.closeMessageActions()" style="position:absolute;top:8px;right:8px;background:transparent;font-size:20px;"><i class="fas fa-times"></i></button>' : ''}
            ${isOwn ? `<button onclick="window.editMessage('${message.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button onclick="window.deleteMessage('${message.id}')"><i class="fas fa-trash"></i> Delete</button>
            <div class="menu-divider"></div>` : ''}
            <button class="reply-btn" data-message-id="${message.id}" data-sender="${escapeHtml(message.sender)}" data-message-text="${escapedText}">
                <i class="fas fa-reply"></i> Reply
            </button>
            <div class="menu-divider"></div>
            <div class="reaction-section">
                <div class="reaction-section-title"><i class="fas fa-smile"></i> Add Reaction</div>
                <div class="reaction-quick-picker">
                    ${reactionEmojis.map(emoji => `<button class="reaction-emoji-btn" onclick="window.addReaction('${message.id}', '${emoji}')">${emoji}</button>`).join('')}
                </div>
            </div>
        </div>`;
    };

    const displayMessage = (message) => {
        if (!elements.chatMessages) return;
        if (appState?.isViewingHistory && !message.is_historical) return;
        if (message.id && !message.is_optimistic && document.getElementById(`msg-${message.id}`)) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}${message.is_historical ? ' historical' : ''}${message.is_optimistic ? ' optimistic' : ''}`;
        if (message.is_optimistic) { messageDiv.style.opacity = '0.7'; setTimeout(() => messageDiv.style.opacity = '1', 100); }
        messageDiv.id = `msg-${message.id}`;
        
        let content = '';
        
        if (message.reply_to) {
            // Get reply reference HTML
            content += `<div class="message-reply-ref" onclick="window.scrollToMessage && window.scrollToMessage('${message.reply_to}')">
                <i class="fas fa-reply"></i>
                <div class="reply-content">Replying to message</div>
            </div>`;
        }
        
        if (message.text?.trim()) {
            content += `<div class="message-text" dir="auto">${escapeHtml(message.text).replace(/\n/g, '<br>')}</div>`;
        }
        
        if (message.image && message.image.trim() !== '') {
            content += `<img src="${message.image}" class="message-image" onclick="window.showFullImage('${message.image}')" loading="lazy">`;
        }
        
        const actionBtn = message.is_optimistic ? '' : `<button class="message-action-dots" onclick="window.toggleMessageActions('${message.id}', this)"><i class="fas fa-ellipsis-v"></i></button>`;
        const actionsMenu = message.is_optimistic ? '' : getActionsMenuHtml(message);
        
        messageDiv.innerHTML = `
            <div class="message-sender">${escapeHtml(message.sender)}</div>
            <div class="message-content">
                ${content}
                <div class="message-reactions"></div>
                <div class="message-footer">
                    <div class="message-time">${message.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    ${actionBtn}
                </div>
            </div>
            ${actionsMenu}
        `;
        
        elements.chatMessages.appendChild(messageDiv);
        
        if (message.reactions?.length) {
            renderReactions(messageDiv.querySelector('.message-reactions'), message.reactions);
        }
        
        if (appState?.messages && !message.is_optimistic) {
            if (!appState.messages.some(m => m.id === message.id)) {
                appState.messages.push(message);
                if (appState.messages.length > 100) appState.messages = appState.messages.slice(-100);
            }
        }
        
        const isNearBottom = elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop - elements.chatMessages.clientHeight < 100;
        const shouldScroll = message.type === 'sent' || (isNearBottom && !appState?.isViewingHistory);
        if (shouldScroll) {
            setTimeout(() => elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' }), 50);
        }
    };

    const toggleMessageActions = (messageId, button) => {
        closeMessageActions();
        const menu = document.getElementById(`actions-${messageId}`);
        if (!menu) return;
        
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
            menu.style.display = 'none';
        } else {
            if (menu.parentElement !== document.body) document.body.appendChild(menu);
            menu.classList.add('show');
            menu.style.display = 'block';
            if (appState) appState.activeMessageActions = messageId;
            
            menu.style.visibility = 'hidden';
            menu.style.display = 'block';
            const menuRect = menu.getBoundingClientRect();
            menu.style.display = 'none';
            menu.style.visibility = 'visible';
            
            const rect = button.getBoundingClientRect();
            let top = rect.bottom + 5;
            let left = rect.left;
            
            if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width - 10;
            if (left < 10) left = 10;
            if (top + menuRect.height > window.innerHeight) top = rect.top - menuRect.height - 5;
            if (top < 10) top = 10;
            
            menu.style.cssText = `position:fixed;top:${top}px;left:${left}px;z-index:2147483647;max-width:280px;width:auto;display:block;`;
            
            setTimeout(() => {
                const handler = (e) => {
                    if (!menu.contains(e.target) && !button.contains(e.target)) {
                        closeMessageActions();
                        document.removeEventListener('click', handler);
                        document.removeEventListener('touchstart', handler);
                    }
                };
                document.addEventListener('click', handler);
                document.addEventListener('touchstart', handler);
            }, 10);
        }
    };

    const addReaction = async (messageId, emoji) => {
        closeMessageActions();
        if (!supabaseClient || !appState?.userId || !messageId) return;
        
        try {
            const { data: reactions } = await supabaseClient
                .from('message_reactions')
                .select('*')
                .eq('message_id', messageId);
            
            const userReaction = (reactions || []).find(r => r.user_id === appState.userId);
            
            if (userReaction) {
                if (userReaction.emoji !== emoji) {
                    await supabaseClient.from('message_reactions').delete().eq('id', userReaction.id);
                    await supabaseClient.from('message_reactions').insert([{ 
                        message_id: messageId, user_id: appState.userId, 
                        user_name: appState.userName, emoji, created_at: new Date().toISOString() 
                    }]);
                } else {
                    await supabaseClient.from('message_reactions').delete().eq('id', userReaction.id);
                }
            } else {
                await supabaseClient.from('message_reactions').insert([{ 
                    message_id: messageId, user_id: appState.userId, 
                    user_name: appState.userName, emoji, created_at: new Date().toISOString() 
                }]);
            }
        } catch (error) {
            console.error("Error adding reaction:", error);
        }
    };

    const openReplyModal = (messageId, senderName, messageText) => {
        console.log('📝 Opening reply modal for:', messageId);
        
        if (!elements.replyModal) {
            console.error('Reply modal element not found');
            return;
        }
        
        if (elements.replyModal.parentElement !== document.body) {
            document.body.appendChild(elements.replyModal);
        }
        
        closeMessageActions();
        
        const emojiPicker = document.getElementById('emojiPicker');
        if (emojiPicker?.classList.contains('show')) {
            emojiPicker.classList.remove('show');
        }
        
        const messageElement = document.getElementById(`msg-${messageId}`);
        let imageUrl = null;
        let actualText = messageText;
        
        if (messageElement) {
            const imgEl = messageElement.querySelector('.message-image');
            if (imgEl?.src) imageUrl = imgEl.src;
            const textEl = messageElement.querySelector('.message-text');
            if (textEl) {
                const raw = textEl.textContent.replace(/\s*\(edited\)\s*$/, '');
                if (raw && raw !== '[Image]') actualText = raw;
                else actualText = '';
            }
        }
        
        if (!imageUrl && appState?.messages) {
            const originalMsg = appState.messages.find(m => m.id === messageId);
            if (originalMsg) imageUrl = originalMsg._realImageUrl || originalMsg.image;
        }
        
        window.__replyData = { 
            messageId: messageId, 
            senderName: senderName, 
            messageText: actualText, 
            imageUrl: imageUrl 
        };
        
        if (appState) { 
            appState.replyingTo = messageId; 
            appState.replyingToImage = imageUrl; 
        }
        
        if (elements.replyToName) {
            elements.replyToName.textContent = senderName || 'Unknown';
        }
        
        let displayText = actualText || '';
        if (imageUrl) {
            displayText = `<div style="margin-top:10px;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.05);padding:8px;border-radius:8px;">
                <img src="${imageUrl}" style="max-width:60px;max-height:60px;border-radius:8px;object-fit:cover;">
                <span><i class="fas fa-image"></i> Image attached</span>
            </div>${displayText ? displayText : ''}`;
        }
        
        if (displayText.length > 150) {
            displayText = displayText.substring(0, 150) + '...';
        }
        
        if (elements.replyToContent) {
            elements.replyToContent.innerHTML = displayText;
        }
        
        if (elements.replyInput) {
            elements.replyInput.value = '';
        }
        
        const scrollY = window.scrollY;
        document.body.classList.add('modal-open');
        document.body.style.top = `-${scrollY}px`;
        
        elements.replyModal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999999;background:rgba(0,0,0,0.95);backdrop-filter:blur(12px);';
        
        setTimeout(() => {
            if (elements.replyInput) {
                elements.replyInput.focus();
            }
        }, 200);
    };

    const sendReply = async () => {
        console.log('🟢 sendReply called');
        
        const replyText = elements.replyInput?.value?.trim();
        console.log('Reply text:', replyText);
        
        if (!replyText) {
            console.log('No reply text, exiting');
            return;
        }
        
        const replyData = window.__replyData || (appState ? { 
            messageId: appState.replyingTo, 
            imageUrl: appState.replyingToImage 
        } : null);
        
        console.log('Reply data:', replyData);
        
        if (!replyData?.messageId) {
            console.log('No messageId in reply data');
            return;
        }
        
        window.__tempReplyTo = replyData.messageId;
        window.__tempReplyToImage = replyData.imageUrl;
        
        console.log('Set __tempReplyTo:', window.__tempReplyTo);
        
        if (appState) {
            appState.replyingTo = null;
            appState.replyingToImage = null;
        }
        window.__replyData = null;
        
        if (elements.messageInput) {
            elements.messageInput.value = replyText;
            console.log('Set message input value to:', replyText);
        }
        
        if (elements.replyModal) {
            elements.replyModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            document.body.style.top = '';
        }
        
        if (elements.sendReplyBtn) {
            elements.sendReplyBtn.disabled = true;
        }
        
        if (elements.messageInput) {
            elements.messageInput.focus();
        }
        await new Promise(r => setTimeout(r, 100));
        
        if (typeof window.sendMessage === 'function') {
            console.log('Calling window.sendMessage...');
            await window.sendMessage();
            console.log('window.sendMessage completed');
        } else {
            console.error('window.sendMessage is not defined!');
        }
        
        window.__tempReplyTo = null;
        window.__tempReplyToImage = null;
        
        if (elements.messageInput) {
            elements.messageInput.value = '';
        }
        
        if (elements.sendReplyBtn) {
            setTimeout(() => {
                if (elements.sendReplyBtn) {
                    elements.sendReplyBtn.disabled = false;
                }
            }, 500);
        }
        
        setTimeout(() => {
            if (elements.chatMessages) {
                elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' });
            }
        }, 200);
    };

    const editMessage = async (messageId) => {
        closeMessageActions();
        if (!supabaseClient) return;
        
        const finalId = window._messageIdMap?.[messageId] || messageId;
        const messageElement = document.getElementById(`msg-${messageId}`);
        const textElement = messageElement?.querySelector('.message-text');
        
        if (!textElement) {
            alert('Cannot edit this message');
            return;
        }
        
        const currentText = textElement.textContent.replace(/\s*\(edited\)\s*$/, '');
        const newText = prompt("Edit your message:", currentText);
        
        if (newText !== null && newText.trim() !== '') {
            try {
                await supabaseClient
                    .from('messages')
                    .update({ 
                        message: newText.trim(), 
                        edited_at: new Date().toISOString(), 
                        is_edited: true 
                    })
                    .eq('id', messageId)
                    .eq('sender_id', appState?.userId);
                
                if (textElement) {
                    textElement.innerHTML = `${escapeHtml(newText.trim())} <small class="edited-indicator">(edited)</small>`;
                }
                
                if (appState?.messages) {
                    const msg = appState.messages.find(m => m.id === messageId);
                    if (msg) {
                        msg.text = newText.trim();
                        msg.is_edited = true;
                    }
                }
            } catch (error) {
                console.error("Error editing message:", error);
                alert("Failed to edit message");
            }
        }
    };

    const deleteMessage = async (messageId) => {
        closeMessageActions();
        if (!supabaseClient) return;
        
        if (!confirm("Delete this message?")) return;
        
        try {
            await supabaseClient.from('message_reactions').delete().eq('message_id', messageId);
            await supabaseClient
                .from('messages')
                .update({ 
                    is_deleted: true, 
                    deleted_at: new Date().toISOString(), 
                    deleted_by: appState?.userId, 
                    message: null, 
                    image_url: null 
                })
                .eq('id', messageId)
                .eq('sender_id', appState?.userId);
            
            const msgElement = document.getElementById(`msg-${messageId}`);
            if (msgElement) {
                msgElement.innerHTML = `
                    <div class="message-sender">${escapeHtml(appState?.userName || 'User')}</div>
                    <div class="message-content">
                        <div class="message-text"><i>Message deleted</i></div>
                        <div class="message-footer">
                            <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                `;
                document.getElementById(`actions-${messageId}`)?.remove();
            }
            
            if (appState?.messages) {
                const msg = appState.messages.find(m => m.id === messageId);
                if (msg) {
                    msg.is_deleted = true;
                    msg.text = null;
                    msg.image = null;
                }
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message");
        }
    };

    const getMessageReactions = async (messageId) => {
        if (!supabaseClient) return [];
        try {
            const { data, error } = await supabaseClient
                .from('message_reactions')
                .select('*')
                .eq('message_id', messageId);
            return error ? [] : (data || []);
        } catch {
            return [];
        }
    };

    const setupEventListeners = () => {
        const handleReplyClick = (e) => {
            const btn = e.target.closest('.reply-btn');
            if (btn) {
                e.preventDefault();
                openReplyModal(btn.dataset.messageId, btn.dataset.sender, btn.dataset.messageText);
            }
        };
        document.addEventListener('click', handleReplyClick);
        document.addEventListener('touchstart', handleReplyClick, { passive: false });
        
        if (elements.chatMessages) {
            elements.chatMessages.addEventListener('scroll', () => { 
                if (scrollTimeout) clearTimeout(scrollTimeout); 
                scrollTimeout = setTimeout(() => {}, 100); 
            }, { passive: true });
        }
        
        if (elements.sendReplyBtn) {
            const newSendBtn = elements.sendReplyBtn.cloneNode(true);
            elements.sendReplyBtn.parentNode.replaceChild(newSendBtn, elements.sendReplyBtn);
            elements.sendReplyBtn = newSendBtn;
            
            let isProcessing = false;
            
            const handleSendReply = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Send reply button clicked');
                if (isProcessing) return;
                isProcessing = true;
                sendReply().finally(() => {
                    setTimeout(() => { isProcessing = false; }, 1000);
                });
            };
            
            elements.sendReplyBtn.addEventListener('click', handleSendReply);
            elements.sendReplyBtn.addEventListener('touchstart', handleSendReply, { passive: false });
        }
        
        if (elements.closeReplyModal) {
            const closeModal = () => { 
                if (elements.replyModal) { 
                    elements.replyModal.style.display = 'none'; 
                    document.body.classList.remove('modal-open'); 
                    document.body.style.top = ''; 
                    if (appState) appState.replyingTo = null; 
                } 
            };
            elements.closeReplyModal.addEventListener('click', closeModal);
            elements.closeReplyModal.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                closeModal(); 
            }, { passive: false });
        }
        
        if (elements.replyModal) {
            elements.replyModal.addEventListener('click', (e) => { 
                if (e.target === elements.replyModal) { 
                    elements.replyModal.style.display = 'none'; 
                    document.body.classList.remove('modal-open'); 
                    if (appState) appState.replyingTo = null; 
                } 
            });
        }
    };

    const init = (state, supabase, domElements) => {
        appState = state;
        supabaseClient = supabase;
        elements = domElements;
        setupEventListeners();
        console.log('ChatModule initialized with reply functionality');
    };

    return {
        init,
        displayMessage,
        renderReactions,
        toggleMessageActions,
        closeMessageActions,
        addReaction,
        toggleReaction: addReaction,
        getMessageReactions,
        openReplyModal,
        sendReply,
        editMessage,
        deleteMessage,
        escapeHtml,
        getActionsMenuHtml  // EXPOSE THIS
    };
})();

window.ChatModule = ChatModule;

// Global exports
window.toggleMessageActions = (id, btn) => ChatModule.toggleMessageActions(id, btn);
window.addReaction = (id, emoji) => ChatModule.addReaction(id, emoji);
window.toggleReaction = (id, emoji) => ChatModule.addReaction(id, emoji);
window.openReplyModal = (id, sender, text) => ChatModule.openReplyModal(id, sender, text);
window.editMessage = (id) => ChatModule.editMessage(id);
window.deleteMessage = (id) => ChatModule.deleteMessage(id);
window.showFullImage = (src) => {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('fullSizeImage');
    if (modal && img) {
        img.src = src;
        modal.style.display = 'flex';
    }
};
window.ChatModule.closeMessageActions = () => ChatModule.closeMessageActions();
window.scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.style.transition = 'background-color 0.3s';
        messageElement.style.backgroundColor = 'rgba(95, 176, 247, 0.3)';
        setTimeout(() => {
            messageElement.style.backgroundColor = '';
        }, 2000);
    }
};

console.log('Chat.js loaded with fixed reply functionality');
