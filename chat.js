// chat.js - Optimized Chat Functionality
// Compatible with refined app.js

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
    // ========== ADD THE getActionsMenuHtml METHOD HERE ==========
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
    // Initialize
    function init(state, supabase, domElements) {
        appState = state;
        supabaseClient = supabase;
        elements = domElements;
        setupEventListeners();
        console.log("ChatModule initialized");
    }

    // Display a message
    function displayMessage(message) {
        if (!elements.chatMessages) return;
        if (appState?.isViewingHistory && !message.is_historical) return;
        if (message.id && !message.is_optimistic && document.getElementById(`msg-${message.id}`)) return;
        
        const messageDiv = createMessageElement(message);
        elements.chatMessages.appendChild(messageDiv);
        
        // Render reactions if present
        if (message.reactions?.length) {
            const reactionsDiv = messageDiv.querySelector('.message-reactions');
            if (reactionsDiv) renderReactions(reactionsDiv, message.reactions);
        }
        
        // Store message (skip optimistic)
        if (appState?.messages && !message.is_optimistic) {
            const exists = appState.messages.some(m => m.id === message.id);
            if (!exists) {
                appState.messages.push(message);
                if (appState.messages.length > 100) appState.messages = appState.messages.slice(-100);
            }
        }
        
        // Auto-scroll
        const isNearBottom = elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop - elements.chatMessages.clientHeight < 100;
        if (message.type === 'sent' || isNearBottom) {
            setTimeout(() => {
                elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' });
            }, 50);
            if (message.image) {
                setTimeout(() => {
                    elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' });
                }, 300);
            }
        }
    }

    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.type}`;
        if (message.is_historical) div.classList.add('historical');
        if (message.is_optimistic) div.classList.add('optimistic');
        div.id = `msg-${message.id}`;
        
        let content = `<div class="message-sender">${escapeHtml(message.sender)}</div><div class="message-content">`;
        
        // Reply reference
        if (message.reply_to) {
            content += getReplyQuoteHtml(message.reply_to, message);
        }
        
        // Message text with media embeds
        if (message.text?.trim()) {
            const mediaEmbed = createMediaEmbed(message.text);
            if (mediaEmbed) {
                const textWithoutUrl = message.text.replace(mediaEmbed.url, '').trim();
                if (textWithoutUrl) {
                    content += `<div class="message-text">${escapeHtml(textWithoutUrl).replace(/\n/g, '<br>')}</div>`;
                }
                content += mediaEmbed.embedHtml;
                content += `<div class="media-link-reference"><i class="fas fa-link"></i> <a href="${mediaEmbed.url}" target="_blank">${mediaEmbed.url.substring(0, 50)}${mediaEmbed.url.length > 50 ? '...' : ''}</a></div>`;
            } else {
                content += `<div class="message-text">${escapeHtml(message.text).replace(/\n/g, '<br>')}</div>`;
            }
        }
        
        // Image
        if (message.image?.trim()) {
            content += `<img src="${message.image}" class="message-image" onclick="window.showFullImage('${message.image}')" loading="lazy">`;
        }
        
        // Reactions and footer
        content += `<div class="message-reactions"></div>`;
        content += `<div class="message-footer"><div class="message-time">${message.time || new Date().toLocaleTimeString()}</div>`;
        if (!message.is_optimistic) {
            content += `<button class="message-action-dots" onclick="window.ChatModule.toggleMessageActions('${message.id}', this)"><i class="fas fa-ellipsis-v"></i></button>`;
        }
        content += `</div></div>`;
        
        // Actions menu
        if (!message.is_optimistic) {
            content += getActionsMenuHtml(message);
        }
        
        div.innerHTML = content;
        return div;
    }

    function getReplyQuoteHtml(replyToId, currentMessage) {
        let quotedSender = 'someone';
        let quotedText = '';
        let quotedImage = null;
        let found = false;
        
        // Use image from currentMessage if provided
        if (currentMessage.reply_to_image) {
            quotedImage = currentMessage.reply_to_image;
        }
        
        // Try to find in DOM
        const originalMsgElement = document.getElementById(`msg-${replyToId}`);
        if (originalMsgElement) {
            const senderEl = originalMsgElement.querySelector('.message-sender');
            const textEl = originalMsgElement.querySelector('.message-text');
            const imgEl = originalMsgElement.querySelector('.message-image');
            
            if (senderEl) quotedSender = senderEl.textContent;
            if (imgEl?.src && !quotedImage) quotedImage = imgEl.src;
            if (textEl?.textContent) {
                quotedText = textEl.textContent.replace(/\s*\(edited\)\s*$/, '').substring(0, 100);
                if (quotedText.length > 100) quotedText += '...';
            }
            found = true;
        }
        
        // Try appState messages
        if ((!found || !quotedImage) && appState?.messages) {
            const originalMsg = appState.messages.find(m => m.id === replyToId);
            if (originalMsg) {
                if (!quotedSender) quotedSender = originalMsg.sender;
                if (!quotedImage) quotedImage = originalMsg._realImageUrl || originalMsg.image;
                if (originalMsg.text && !quotedText) {
                    quotedText = originalMsg.text.substring(0, 100);
                    if (originalMsg.text.length > 100) quotedText += '...';
                }
            }
        }
        
        const isImageOnly = quotedImage && !quotedText;
        const displayText = isImageOnly ? '' : (quotedText || '[Message]');
        const imageHtml = quotedImage ? `
            <div class="reply-image-preview">
                <img src="${quotedImage}" style="max-width: 30px; max-height: 30px; border-radius: 4px; object-fit: cover;" 
                     onclick="event.stopPropagation(); window.showFullImage('${quotedImage}')">
            </div>
        ` : '';
        
        return `<div class="message-reply-ref"><i class="fas fa-reply"></i> <div class="reply-content"><span>Replying to <strong>${escapeHtml(quotedSender)}</strong>: ${displayText}</span>${imageHtml}</div></div>`;
    }

    function getActionsMenuHtml(message) {
        const isOwn = message.sender === appState?.userName;
        const msgId = String(message.id);
        
        return `<div class="message-actions-menu" id="actions-${msgId}" style="display: none;">
            ${isOwn ? `
                <button onclick="window.ChatModule.editMessage('${msgId}')"><i class="fas fa-edit"></i> Edit</button>
                <button onclick="window.ChatModule.deleteMessage('${msgId}')"><i class="fas fa-trash"></i> Delete</button>
                <div class="menu-divider"></div>
            ` : ''}
            <button class="reply-btn" data-message-id="${msgId}" data-sender="${escapeHtml(message.sender)}" data-message-text="${escapeHtml(message.text)}">
                <i class="fas fa-reply"></i> Reply
            </button>
            <div class="menu-divider"></div>
            <div class="reaction-section">
                <div class="reaction-section-title"><i class="fas fa-smile"></i> Add Reaction</div>
                <div class="reaction-quick-picker">
                    ${reactionEmojis.map(emoji => `<button class="reaction-emoji-btn" onclick="window.ChatModule.addReaction('${msgId}', '${emoji}')">${emoji}</button>`).join('')}
                </div>
            </div>
        </div>`;
    }

    function renderReactions(container, reactions) {
        if (!reactions?.length) {
            container.innerHTML = '';
            return;
        }
        
        const counts = {};
        reactions.forEach(r => counts[r.emoji] = (counts[r.emoji] || 0) + 1);
        
        const messageId = container.closest('.message')?.id.replace('msg-', '') || '';
        let html = '';
        for (const [emoji, count] of Object.entries(counts)) {
            html += `<span class="reaction-badge" onclick="window.ChatModule.toggleReaction('${messageId}', '${emoji}')">${emoji} ${count}</span>`;
        }
        container.innerHTML = html;
    }

    // Message Actions
    function toggleMessageActions(messageId, button) {
        closeMessageActions();
        
        const menu = document.getElementById(`actions-${messageId}`);
        if (!menu) return;
        
        // Append to body for proper positioning
        if (menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        }
        
        const rect = button.getBoundingClientRect();
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        const menuRect = menu.getBoundingClientRect();
        menu.style.display = 'none';
        menu.style.visibility = 'visible';
        
        let top = rect.bottom + 5;
        let left = rect.left;
        
        if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width - 10;
        if (left < 10) left = 10;
        if (top + menuRect.height > window.innerHeight) top = rect.top - menuRect.height - 5;
        if (top < 10) top = 10;
        
        menu.style.position = 'fixed';
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
        menu.style.zIndex = '999999';
        menu.style.display = 'block';
        menu.classList.add('show');
        
        activeActionsMenu = messageId;
        
        // Close on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target) && !button.contains(e.target)) {
                    closeMessageActions();
                    document.removeEventListener('click', closeHandler);
                    document.removeEventListener('touchstart', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
            document.addEventListener('touchstart', closeHandler);
        }, 10);
    }

    function closeMessageActions() {
        if (activeActionsMenu) {
            const menu = document.getElementById(`actions-${activeActionsMenu}`);
            if (menu) {
                menu.classList.remove('show');
                menu.style.display = 'none';
            }
            activeActionsMenu = null;
        }
    }

    // Reactions
    async function addReaction(messageId, emoji) {
        closeMessageActions();
        if (!supabaseClient || !appState?.userId) {
            alert("Cannot add reaction: Not logged in");
            return;
        }
        
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
                        user_name: appState.userName, emoji: emoji,
                        created_at: new Date().toISOString()
                    }]);
                } else {
                    await supabaseClient.from('message_reactions').delete().eq('id', userReaction.id);
                }
            } else {
                await supabaseClient.from('message_reactions').insert([{
                    message_id: messageId, user_id: appState.userId,
                    user_name: appState.userName, emoji: emoji,
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error("Error adding reaction:", error);
        }
    }

    async function toggleReaction(messageId, emoji) {
        await addReaction(messageId, emoji);
    }

    async function getMessageReactions(messageId) {
        if (!supabaseClient) return [];
        const { data } = await supabaseClient.from('message_reactions').select('*').eq('message_id', messageId);
        return data || [];
    }

    // Reply
    function openReplyModal(messageId, senderName, messageText) {
        if (!elements.replyModal) return;
        
        closeMessageActions();
        
        // Ensure modal is in body
        if (elements.replyModal.parentElement !== document.body) {
            document.body.appendChild(elements.replyModal);
        }
        
        // Get image from message
        let imageUrl = null;
        const msgElement = document.getElementById(`msg-${messageId}`);
        if (msgElement) {
            const img = msgElement.querySelector('.message-image');
            if (img?.src) imageUrl = img.src;
        }
        
        // Store reply data
        appState.replyingTo = messageId;
        appState.replyingToImage = imageUrl;
        
        elements.replyToName.textContent = senderName || 'Unknown';
        
        let displayText = messageText || '';
        if (imageUrl) {
            displayText = `<div><img src="${imageUrl}" style="max-width: 60px; max-height: 60px; border-radius: 8px;"><br>${displayText}</div>`;
        }
        if (displayText.length > 150) displayText = displayText.substring(0, 150) + '...';
        elements.replyToContent.innerHTML = displayText;
        elements.replyInput.value = '';
        
        // Show modal
        const scrollY = window.scrollY;
        document.body.classList.add('modal-open');
        document.body.style.top = `-${scrollY}px`;
        elements.replyModal.style.display = 'flex';
        
        setTimeout(() => elements.replyInput?.focus(), 200);
    }

    async function sendReply() {
        const replyText = elements.replyInput?.value.trim();
        if (!replyText || !appState?.replyingTo) return;
        
        const replyToId = appState.replyingTo;
        const replyToImage = appState.replyingToImage;
        
        // Store for sendMessage to use
        window.__tempReplyTo = replyToId;
        window.__tempReplyToImage = replyToImage;
        
        appState.replyingTo = null;
        appState.replyingToImage = null;
        
        if (elements.messageInput) {
            elements.messageInput.value = replyText;
        }
        
        // Close modal
        elements.replyModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const scrollY = Math.abs(parseInt(document.body.style.top || '0'));
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
        
        // Focus and send
        elements.messageInput?.focus();
        await new Promise(r => setTimeout(r, 100));
        
        if (typeof window.sendMessage === 'function') {
            await window.sendMessage();
        }
        
        window.__tempReplyTo = null;
        window.__tempReplyToImage = null;
        if (elements.messageInput) elements.messageInput.value = '';
    }

    // Edit Message
    async function editMessage(messageId) {
        closeMessageActions();
        
        const msgElement = document.getElementById(`msg-${messageId}`);
        if (!msgElement) return;
        
        const textElement = msgElement.querySelector('.message-text');
        const currentText = textElement ? textElement.textContent.replace(/\s*\(edited\)\s*$/, '') : '';
        
        const newText = prompt("Edit your message:", currentText);
        if (!newText?.trim()) return;
        
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({ message: newText.trim(), edited_at: new Date().toISOString(), is_edited: true })
                .eq('id', messageId)
                .eq('sender_id', appState?.userId);
            
            if (error) throw error;
            
            if (textElement) {
                textElement.innerHTML = `${escapeHtml(newText.trim())} <small class="edited-indicator">(edited)</small>`;
            }
            
            // Update appState
            if (appState?.messages) {
                const msg = appState.messages.find(m => m.id === messageId);
                if (msg) msg.text = newText.trim();
            }
        } catch (error) {
            console.error("Error editing message:", error);
            alert("Failed to edit message");
        }
    }

    // Delete Message
    async function deleteMessage(messageId) {
        closeMessageActions();
        if (!confirm("Delete this message?")) return;
        
        try {
            await supabaseClient.from('message_reactions').delete().eq('message_id', messageId);
            
            const { error } = await supabaseClient
                .from('messages')
                .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: appState?.userId, message: null, image_url: null })
                .eq('id', messageId)
                .eq('sender_id', appState?.userId);
            
            if (error) throw error;
            
            const msgElement = document.getElementById(`msg-${messageId}`);
            if (msgElement) {
                msgElement.innerHTML = `<div class="message-sender">${escapeHtml(appState?.userName || 'User')}</div>
                    <div class="message-content"><div class="message-text"><i>Message deleted</i></div>
                    <div class="message-footer"><div class="message-time">${new Date().toLocaleTimeString()}</div></div></div>`;
                document.getElementById(`actions-${messageId}`)?.remove();
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message");
        }
    }
    // Add this function to make reply references clickable
window.scrollToMessage = function(messageId) {
    const messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the message temporarily
        messageElement.style.transition = 'background-color 0.3s';
        messageElement.style.backgroundColor = 'rgba(95, 176, 247, 0.3)';
        setTimeout(() => {
            messageElement.style.backgroundColor = '';
        }, 2000);
    } else {
        console.log('Message not found:', messageId);
    }
};



    // Typing indicator
    function handleTyping() {
        if (!appState?.currentSessionId || appState?.isViewingHistory || !appState?.isConnected || !appState?.userName) return;
        
        if (appState.typingTimeout) clearTimeout(appState.typingTimeout);
        
        supabaseClient?.from('chat_sessions')
            .update({ typing_user: appState.userName })
            .eq('session_id', appState.currentSessionId)
            .then(() => {
                appState.typingTimeout = setTimeout(() => {
                    supabaseClient?.from('chat_sessions')
                        .update({ typing_user: null })
                        .eq('session_id', appState.currentSessionId);
                }, 2000);
            })
            .catch(e => console.error('Typing error:', e));
    }

    // Media Embeds
    function createMediaEmbed(text) {
        if (!text) return null;
        
        const patterns = {
            image: /(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^\s]*)?)/gi,
            youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi,
            vimeo: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/gi,
            video: /(https?:\/\/[^\s]+?\.(?:mp4|webm|ogg|mov)(?:\?[^\s]*)?)/gi,
            audio: /(https?:\/\/[^\s]+?\.(?:mp3|wav|ogg|m4a)(?:\?[^\s]*)?)/gi
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            pattern.lastIndex = 0;
            const match = pattern.exec(text);
            if (match) {
                const url = match[0];
                const id = match[1];
                
                switch(type) {
                    case 'image': return { type, url, embedHtml: `<div class="media-embed image-embed"><img src="${url}" class="embedded-image" onclick="window.showFullImage('${url}')" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'embed-error\'><i class=\'fas fa-exclamation-triangle\'></i> Failed to load image</div>'"><div class="media-source"><i class="fas fa-image"></i> <a href="${url}" target="_blank">View Image</a></div></div>` };
                    case 'youtube': return { type, url, embedHtml: `<div class="media-embed youtube-embed"><div class="youtube-placeholder" onclick="window.open('https://www.youtube.com/watch?v=${id}', '_blank')"><img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" class="youtube-thumbnail"><div class="youtube-play-button"><i class="fas fa-play"></i></div></div><div class="media-source"><i class="fab fa-youtube"></i> <a href="${url}" target="_blank">Watch on YouTube</a></div></div>` };
                    case 'vimeo': return { type, url, embedHtml: `<div class="media-embed vimeo-embed"><div class="vimeo-placeholder" onclick="window.open('${url}', '_blank')"><i class="fab fa-vimeo"></i> <span>Click to watch on Vimeo</span></div><div class="media-source"><i class="fab fa-vimeo"></i> <a href="${url}" target="_blank">Watch on Vimeo</a></div></div>` };
                    case 'video': return { type, url, embedHtml: `<div class="media-embed video-embed"><video controls preload="metadata" playsinline><source src="${url}">Your browser doesn't support video</video><div class="media-source"><i class="fas fa-video"></i> <a href="${url}" target="_blank">Download Video</a></div></div>` };
                    case 'audio': return { type, url, embedHtml: `<div class="media-embed audio-embed"><audio controls preload="metadata"><source src="${url}">Your browser doesn't support audio</audio><div class="media-source"><i class="fas fa-music"></i> <a href="${url}" target="_blank">Download Audio</a></div></div>` };
                }
            }
        }
        return null;
    }

    // Event Listeners
    function setupEventListeners() {
        // Reply button delegation
        const handleReplyClick = (e) => {
            const btn = e.target.closest('.reply-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                openReplyModal(btn.dataset.messageId, btn.dataset.sender, btn.dataset.messageText);
            }
        };
        document.addEventListener('click', handleReplyClick);
        document.addEventListener('touchstart', handleReplyClick, { passive: false });
        
        // Send reply
        if (elements.sendReplyBtn) {
            const sendReplyHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendReply();
            };
            elements.sendReplyBtn.addEventListener('click', sendReplyHandler);
            elements.sendReplyBtn.addEventListener('touchstart', sendReplyHandler, { passive: false });
        }
        
        // Close modal handlers
        if (elements.closeReplyModal) {
            const closeHandler = () => {
                if (elements.replyModal) elements.replyModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                if (appState) appState.replyingTo = null;
            };
            elements.closeReplyModal.addEventListener('click', closeHandler);
            elements.closeReplyModal.addEventListener('touchstart', (e) => { e.preventDefault(); closeHandler(); }, { passive: false });
        }
        
        // Click outside modal
        if (elements.replyModal) {
            elements.replyModal.addEventListener('click', (e) => {
                if (e.target === elements.replyModal) {
                    elements.replyModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    if (appState) appState.replyingTo = null;
                }
            });
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    

    // Public API
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
        getActionsMenuHtml 
    };
})();

// Make global
window.ChatModule = ChatModule;

// Expose individual functions for onclick handlers
window.toggleMessageActions = (id, btn) => ChatModule.toggleMessageActions(id, btn);
window.addReaction = (id, emoji) => ChatModule.addReaction(id, emoji);
window.toggleReaction = (id, emoji) => ChatModule.toggleReaction(id, emoji);
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

console.log('Chat.js loaded');
