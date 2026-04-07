// chat.js - Fixed Reply Functionality

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

    const getReplyQuoteHtml = (replyToId, currentMessage) => {
        let quotedSender = 'someone', quotedText = 'a message', quotedImage = currentMessage?.reply_to_image;
        let realId = replyToId;
        
        // Check for temp ID mapping
        if (window._messageIdMap?.[replyToId]) realId = window._messageIdMap[replyToId];
        
        // Try to find the original message in DOM
        const originalEl = document.getElementById(`msg-${realId}`) || document.getElementById(`msg-${replyToId}`);
        if (originalEl) {
            const senderEl = originalEl.querySelector('.message-sender');
            const textEl = originalEl.querySelector('.message-text');
            const imgEl = originalEl.querySelector('.message-image');
            if (senderEl) quotedSender = senderEl.textContent;
            if (imgEl?.src && !quotedImage) quotedImage = imgEl.src;
            if (textEl?.textContent.trim()) {
                quotedText = textEl.textContent.replace(/\s*\(edited\)\s*$/, '').substring(0, 100);
                if (quotedText.length > 100) quotedText += '...';
            } else if (imgEl) {
                quotedText = '[Image]';
            }
        }
        
        // If not found in DOM, try appState messages
        if ((!quotedSender || !quotedImage) && appState?.messages) {
            const originalMsg = appState.messages.find(m => m.id === replyToId || m.id === realId);
            if (originalMsg) {
                quotedSender = originalMsg.sender;
                if (originalMsg._realImageUrl || originalMsg.image) {
                    quotedImage = originalMsg._realImageUrl || originalMsg.image;
                }
                if (originalMsg.text?.trim()) {
                    quotedText = originalMsg.text.substring(0, 100);
                    if (originalMsg.text.length > 100) quotedText += '...';
                } else if (originalMsg.image) {
                    quotedText = '[Image]';
                }
            }
        }
        
        const hasImage = quotedImage && quotedImage.trim() !== '';
        const displayText = (!quotedText || quotedText === '[Image]') && hasImage ? '' : quotedText;
        const imageHtml = hasImage ? `<div class="reply-image-preview"><img src="${quotedImage}" style="max-width:30px;max-height:30px;border-radius:4px;object-fit:cover;" onclick="event.stopPropagation(); window.showFullImage('${quotedImage}')"></div>` : '';
        
        return `<div class="message-reply-ref"><i class="fas fa-reply"></i><div class="reply-content"><span>Replying to <strong>${escapeHtml(quotedSender)}</strong>: ${escapeHtml(displayText)}${hasImage && displayText ? ' 📷' : ''}</span></div>${imageHtml}</div>`;
    };

    const getActionsMenuHtml = (message) => {
        const isOwn = message.sender === (appState?.userName);
        const isMobile = window.innerWidth <= 768;
        const escapedText = escapeHtml(message.text || '').replace(/'/g, "\\'");
        
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

    const createMediaEmbed = (text) => {
        if (!text) return null;
        
        const patterns = [
            { type: 'image', regex: /(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^\s]*)?)/i },
            { type: 'youtube', regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i },
            { type: 'vimeo', regex: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i },
            { type: 'video', regex: /(https?:\/\/[^\s]+?\.(?:mp4|webm|ogg|mov)(?:\?[^\s]*)?)/i },
            { type: 'audio', regex: /(https?:\/\/[^\s]+?\.(?:mp3|wav|ogg|m4a)(?:\?[^\s]*)?)/i }
        ];
        
        for (const pattern of patterns) {
            pattern.regex.lastIndex = 0;
            const match = pattern.regex.exec(text);
            if (match) {
                const url = match[0];
                const id = match[1] || '';
                
                if (pattern.type === 'image') {
                    return { url, embedHtml: `<div class="media-embed image-embed"><img src="${url}" class="embedded-image" onclick="window.showFullImage('${url}')" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'embed-error\'><i class=\'fas fa-exclamation-triangle\'></i> <a href=\'${url}\' target=\'_blank\'>View Image</a></div>'"><div class="media-source"><i class="fas fa-image"></i> <a href="${url}" target="_blank">View Image</a></div></div>` };
                }
                if (pattern.type === 'youtube') {
                    return { url, embedHtml: `<div class="media-embed youtube-embed"><div class="youtube-placeholder" onclick="window.open('https://www.youtube.com/watch?v=${id}','_blank')"><img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" class="youtube-thumbnail" loading="lazy"><div class="youtube-play-button"><i class="fas fa-play"></i></div></div><div class="media-source"><i class="fab fa-youtube"></i> <a href="${url}" target="_blank">Watch on YouTube</a></div></div>` };
                }
                if (pattern.type === 'vimeo') {
                    return { url, embedHtml: `<div class="media-embed vimeo-embed"><div class="vimeo-placeholder" onclick="window.open('${url}','_blank')"><i class="fab fa-vimeo"></i><span>Click to watch on Vimeo</span></div><div class="media-source"><i class="fab fa-vimeo"></i> <a href="${url}" target="_blank">Watch on Vimeo</a></div></div>` };
                }
                if (pattern.type === 'video') {
                    return { url, embedHtml: `<div class="media-embed video-embed"><video controls preload="metadata" playsinline><source src="${url}">Your browser does not support video.</video><div class="media-source"><i class="fas fa-video"></i> <a href="${url}" target="_blank">Download Video</a></div></div>` };
                }
                if (pattern.type === 'audio') {
                    return { url, embedHtml: `<div class="media-embed audio-embed"><audio controls preload="metadata"><source src="${url}">Your browser does not support audio.</audio><div class="media-source"><i class="fas fa-music"></i> <a href="${url}" target="_blank">Download Audio</a></div></div>` };
                }
            }
        }
        return null;
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
        
        // Add reply reference if this is a reply
        if (message.reply_to) {
            content += getReplyQuoteHtml(message.reply_to, message);
        }
        
        // Process message text and media
        if (message.text?.trim()) {
            const mediaEmbed = createMediaEmbed(message.text);
            const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(message.text);
            const dirAttr = hasArabic ? ' dir="auto"' : '';
            
            if (mediaEmbed) {
                const textWithoutUrl = message.text.replace(mediaEmbed.url, '').trim();
                if (textWithoutUrl) {
                    content += `<div class="message-text"${dirAttr}>${escapeHtml(textWithoutUrl).replace(/\n/g, '<br>')}</div>`;
                }
                content += mediaEmbed.embedHtml;
            } else {
                content += `<div class="message-text"${dirAttr}>${escapeHtml(message.text).replace(/\n/g, '<br>')}</div>`;
            }
        }
        
        // Add image if present
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
        
        // Render existing reactions
        if (message.reactions?.length) {
            renderReactions(messageDiv.querySelector('.message-reactions'), message.reactions);
        }
        
        // Store in appState
        if (appState?.messages && !message.is_optimistic) {
            if (!appState.messages.some(m => m.id === message.id)) {
                appState.messages.push(message);
                if (appState.messages.length > 100) appState.messages = appState.messages.slice(-100);
            }
        }
        
        // Smart scroll
        const isNearBottom = elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop - elements.chatMessages.clientHeight < 100;
        const shouldScroll = message.type === 'sent' || (isNearBottom && !appState?.isViewingHistory);
        if (shouldScroll) {
            setTimeout(() => elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' }), 50);
            if (message.image) setTimeout(() => elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' }), 300);
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
            
            // Position the menu
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
            
            // Close on outside click
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
        console.log('openReplyModal called:', { messageId, senderName, messageText });
        
        if (!elements.replyModal) {
            console.error('Reply modal element not found');
            return;
        }
        
        // Ensure modal is in body
        if (elements.replyModal.parentElement !== document.body) {
            document.body.appendChild(elements.replyModal);
        }
        
        closeMessageActions();
        
        // Close emoji picker if open
        const emojiPicker = document.getElementById('emojiPicker');
        if (emojiPicker?.classList.contains('show')) {
            emojiPicker.classList.remove('show');
        }
        
        // Get image from the message if available
        let imageUrl = null;
        let actualText = messageText;
        const messageElement = document.getElementById(`msg-${messageId}`);
        
        if (messageElement) {
            const imgEl = messageElement.querySelector('.message-image');
            if (imgEl?.src) imageUrl = imgEl.src;
            
            const textEl = messageElement.querySelector('.message-text');
            if (textEl) {
                const rawText = textEl.textContent.replace(/\s*\(edited\)\s*$/, '');
                if (rawText && rawText !== '[Image]') {
                    actualText = rawText;
                } else {
                    actualText = '';
                }
            }
        }
        
        // Try appState if not found in DOM
        if (!imageUrl && appState?.messages) {
            const originalMsg = appState.messages.find(m => m.id === messageId);
            if (originalMsg) {
                imageUrl = originalMsg._realImageUrl || originalMsg.image;
                if (!actualText && originalMsg.text) actualText = originalMsg.text;
            }
        }
        
        // Store reply data globally for sendMessage to access
        window.__tempReplyTo = messageId;
        window.__tempReplyToImage = imageUrl;
        
        if (appState) {
            appState.replyingTo = messageId;
            appState.replyingToImage = imageUrl;
        }
        
        // Update modal UI
        if (elements.replyToName) {
            elements.replyToName.textContent = senderName || 'Unknown';
        }
        
        // Build quoted content display
        let displayContent = '';
        if (actualText && actualText.trim()) {
            displayContent = escapeHtml(actualText);
            if (displayContent.length > 150) displayContent = displayContent.substring(0, 150) + '...';
        }
        
        if (imageUrl) {
            const imageHtml = `<div style="margin-top:10px;"><img src="${imageUrl}" style="max-width:100px; max-height:100px; border-radius:8px;"></div>`;
            if (displayContent) {
                displayContent += imageHtml;
            } else {
                displayContent = `<div><i class="fas fa-image"></i> Image</div>${imageHtml}`;
            }
        }
        
        if (elements.replyToContent) {
            elements.replyToContent.innerHTML = displayContent || '<em>No content</em>';
        }
        
        if (elements.replyInput) {
            elements.replyInput.value = '';
        }
        
        // Show modal
        const scrollY = window.scrollY;
        document.body.classList.add('modal-open');
        document.body.style.top = `-${scrollY}px`;
        
        elements.replyModal.style.display = 'flex';
        elements.replyModal.style.position = 'fixed';
        elements.replyModal.style.top = '0';
        elements.replyModal.style.left = '0';
        elements.replyModal.style.right = '0';
        elements.replyModal.style.bottom = '0';
        elements.replyModal.style.zIndex = '999999999';
        elements.replyModal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        elements.replyModal.style.backdropFilter = 'blur(12px)';
        
        // Focus the input
        setTimeout(() => {
            if (elements.replyInput) {
                elements.replyInput.focus();
            }
        }, 200);
        
        console.log('Reply modal opened with replyToId:', messageId, 'imageUrl:', imageUrl);
    };

    const sendReply = async () => {
        const replyText = elements.replyInput?.value.trim();
        if (!replyText) {
            console.log('No reply text');
            return;
        }
        
        const replyToId = window.__tempReplyTo || appState?.replyingTo;
        const replyToImage = window.__tempReplyToImage || appState?.replyingToImage;
        
        if (!replyToId) {
            console.error('No replyToId found!');
            alert('Cannot reply: Original message not found');
            return;
        }
        
        console.log('Sending reply to:', replyToId, 'with image:', replyToImage);
        
        // Set the message input value
        if (elements.messageInput) {
            elements.messageInput.value = replyText;
        }
        
        // Close modal
        if (elements.replyModal) {
            elements.replyModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            document.body.style.top = '';
        }
        
        // Clear reply data
        const tempReplyTo = window.__tempReplyTo;
        const tempReplyToImage = window.__tempReplyToImage;
        window.__tempReplyTo = null;
        window.__tempReplyToImage = null;
        if (appState) {
            appState.replyingTo = null;
            appState.replyingToImage = null;
        }
        
        // Send the message
        if (typeof window.sendMessage === 'function') {
            // Store the reply info one more time right before sending
            window.__tempReplyTo = tempReplyTo;
            window.__tempReplyToImage = tempReplyToImage;
            
            await window.sendMessage();
            
            // Clear again after send
            window.__tempReplyTo = null;
            window.__tempReplyToImage = null;
        }
        
        // Clear input
        if (elements.messageInput) {
            elements.messageInput.value = '';
            elements.messageInput.focus();
        }
        
        console.log('Reply sent successfully');
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
        // Handle reply button clicks via delegation
        const handleReplyClick = (e) => {
            const btn = e.target.closest('.reply-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const messageId = btn.dataset.messageId;
                const sender = btn.dataset.sender;
                const messageText = btn.dataset.messageText;
                console.log('Reply button clicked:', { messageId, sender, messageText });
                openReplyModal(messageId, sender, messageText);
            }
        };
        
        document.addEventListener('click', handleReplyClick);
        document.addEventListener('touchstart', handleReplyClick, { passive: false });
        
        // Chat scroll handler
        if (elements.chatMessages) {
            elements.chatMessages.addEventListener('scroll', () => {
                if (scrollTimeout) clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {}, 100);
            }, { passive: true });
        }
        
        // Send reply button
        if (elements.sendReplyBtn) {
            const newBtn = elements.sendReplyBtn.cloneNode(true);
            elements.sendReplyBtn.parentNode.replaceChild(newBtn, elements.sendReplyBtn);
            elements.sendReplyBtn = newBtn;
            
            let processing = false;
            const handleSend = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (processing) return;
                processing = true;
                try {
                    await sendReply();
                } finally {
                    setTimeout(() => { processing = false; }, 1000);
                }
            };
            
            elements.sendReplyBtn.addEventListener('click', handleSend);
            elements.sendReplyBtn.addEventListener('touchstart', handleSend, { passive: false });
        }
        
        // Close reply modal buttons
        if (elements.closeReplyModal) {
            const closeModal = () => {
                if (elements.replyModal) {
                    elements.replyModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    document.body.style.top = '';
                    if (appState) appState.replyingTo = null;
                    window.__tempReplyTo = null;
                    window.__tempReplyToImage = null;
                }
            };
            elements.closeReplyModal.addEventListener('click', closeModal);
            elements.closeReplyModal.addEventListener('touchstart', (e) => {
                e.preventDefault();
                closeModal();
            }, { passive: false });
        }
        
        // Click outside modal to close
        if (elements.replyModal) {
            elements.replyModal.addEventListener('click', (e) => {
                if (e.target === elements.replyModal) {
                    elements.replyModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    document.body.style.top = '';
                    if (appState) appState.replyingTo = null;
                    window.__tempReplyTo = null;
                    window.__tempReplyToImage = null;
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
        escapeHtml
    };
})();

window.ChatModule = ChatModule;

// Global exports for onclick handlers
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

console.log('Chat.js loaded with fixed reply functionality');
