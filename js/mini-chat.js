document.addEventListener('DOMContentLoaded', () => {
    // Replace with placeholder WebSocket URL
    const WS_URL = 'wss://placeholder-websocket.example.com/ws';
    const widget = document.getElementById('mini-chat-widget');
    const messagesContainer = document.getElementById('mini-chat-messages');
    const inputField = document.getElementById('mini-chat-message');
    const sendBtn = document.getElementById('mini-chat-send');
    const toggleBtn = document.getElementById('mini-chat-button');
    const attachBtn = document.getElementById('mini-chat-add-file');
    const callBtn = document.getElementById('mini-chat-call-button');
    const videoCallBtn = document.getElementById('mini-chat-video-button');
    const closeChatBtn = document.getElementById('mini-chat-close');
    const callEndBtn = document.getElementById('call-end-button');
    const callStatusBlock = document.getElementById('mini-chat-call-status');
    const callTimerSpan = document.getElementById('call-timer');

    // Status elements
    const statusContainer = document.getElementById('mini-chat-status');
    const statusDot = statusContainer?.querySelector('.status-dot');
    const statusText = statusContainer?.querySelector('.status-text');

    // Audio call interface elements
    const callOverlay = document.getElementById('call-overlay');
    const callTitleText = document.getElementById('call-title-text');
    const callTimerDisplay = document.getElementById('call-timer-display');
    const callControls = document.getElementById('call-controls');
    const callExtraControls = document.getElementById('call-extra-controls');
    const callMoreOptionsBtn = document.getElementById('call-more-options');
    const closeExtraControlsBtn = document.getElementById('close-extra-controls');

    // Video call elements
    const videoContainer = document.getElementById('video-call-container');
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    const remoteVideoStatus = document.getElementById('remote-video-status');
    const toggleVideoBtn = document.getElementById('toggle-video-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const screenShareBtn = document.getElementById('screen-share-btn');
    const toggleMicVideoBtn = document.getElementById('toggle-mic-video-btn');
    const endVideoCallBtn = document.getElementById('end-video-call-btn');
    const videoCallTimer = document.getElementById('video-call-timer');
    const videoCallPeer = document.querySelector('.video-call-peer');

    // Check for required elements
    if (!messagesContainer) {
        console.error('❌ Messages container not found!');
        return;
    }

    let ws = null;
    let isRegistered = false;
    let sessionId = localStorage.getItem('miniChatSessionId') || null;
    let historyLoaded = false;
    let chatClosed = !sessionId;
    let lastMinuteKey = null;
    let currentCallId = null;
    let peerConnection = null;
    let localStream = null;
    let remoteAudio = null;
    let callTimerInterval = null;
    let callSeconds = 0;
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let originalViewportContent = '';
    let keyboardVisible = false;
    let widgetOriginalHeight = 0;
    let widgetOriginalBottom = 0;

    // Call management variables
    let callState = 'idle';
    let callStartTime = null;
    let callEndTime = null;
    let isSpeakerOn = false;
    let isBluetoothOn = false;
    let isMicOn = true;

    // Video variables
    let isVideoEnabled = false;
    let isScreenSharing = false;
    let currentFacingMode = 'user';
    let videoCallSeconds = 0;
    let videoCallTimerInterval = null;

    // Ringtone variables
    let ringtoneAudio = null;
    let ringtonePlaying = false;

    // Messages array
    let messages = [];

    // Admin status variables
    let adminStatus = 'offline';
    let adminLastSeen = null;

    // Storage for deleted messages
    if (!window.deletedMessages) {
        window.deletedMessages = new Set();
    }

    // Replace with placeholder ICE configuration
    const ICE_CONFIG = {
        iceServers: [
            { urls: 'stun:stun.placeholder.com:19302' },
            { urls: 'turn:placeholder-turn.example.com:3478?transport=udp', username: 'PLACEHOLDER_USER', credential: 'PLACEHOLDER_CRED' },
            { urls: 'turn:placeholder-turn.example.com:3478?transport=tcp', username: 'PLACEHOLDER_USER', credential: 'PLACEHOLDER_CRED' },
            { urls: 'turns:placeholder-turn.example.com:5349?transport=tcp', username: 'PLACEHOLDER_USER', credential: 'PLACEHOLDER_CRED' }
        ]
    };

    let CLIENT_ID = localStorage.getItem('miniChatClientId');
    if (!CLIENT_ID) {
        CLIENT_ID = crypto.randomUUID();
        localStorage.setItem('miniChatClientId', CLIENT_ID);
    }
    let MY_NAME = 'Visitor_' + CLIENT_ID.slice(0, 5);

    // ==================== STATUS FUNCTIONS ====================

    const updateHeaderStatus = (status, timestamp = null) => {
        if (!statusContainer || !statusDot || !statusText) return;

        statusContainer.classList.remove('status-online', 'status-offline');

        if (status === 'online') {
            statusContainer.classList.add('status-online');
            statusDot.style.backgroundColor = '#4CAF50';
            statusText.textContent = 'support online';
        } else {
            statusContainer.classList.add('status-offline');
            statusDot.style.backgroundColor = '#9e9e9e';

            if (timestamp) {
                const lastSeenDate = new Date(normalizeTimestamp(timestamp));
                const now = new Date();
                const diffMs = now - lastSeenDate;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                let timeString = '';
                if (diffMins < 1) {
                    timeString = 'just now';
                } else if (diffMins < 60) {
                    timeString = `${diffMins} ${getMinutesWord(diffMins)} ago`;
                } else if (diffHours < 24) {
                    timeString = `${diffHours} ${getHoursWord(diffHours)} ago`;
                } else if (diffDays === 1) {
                    timeString = 'yesterday';
                } else if (diffDays < 5) {
                    timeString = `${diffDays} ${getDaysWord(diffDays)} ago`;
                } else {
                    timeString = lastSeenDate.toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }
                statusText.textContent = `last seen ${timeString}`;
            } else {
                statusText.textContent = 'offline';
            }
        }
    };

    const getMinutesWord = (minutes) => {
        if (minutes >= 11 && minutes <= 14) return 'minutes';
        const lastDigit = minutes % 10;
        if (lastDigit === 1) return 'minute';
        if (lastDigit >= 2 && lastDigit <= 4) return 'minutes';
        return 'minutes';
    };

    const getHoursWord = (hours) => {
        if (hours >= 11 && hours <= 14) return 'hours';
        const lastDigit = hours % 10;
        if (lastDigit === 1) return 'hour';
        if (lastDigit >= 2 && lastDigit <= 4) return 'hours';
        return 'hours';
    };

    const getDaysWord = (days) => {
        if (days >= 11 && days <= 14) return 'days';
        const lastDigit = days % 10;
        if (lastDigit === 1) return 'day';
        if (lastDigit >= 2 && lastDigit <= 4) return 'days';
        return 'days';
    };

    const checkAdminOnlineStatus = () => {
        if (ws && ws.readyState === WebSocket.OPEN && sessionId) {
            ws.send(JSON.stringify({
                type: 'get_admin_status',
                session_uuid: sessionId
            }));
        }
    };

    // ==================== HELPER FUNCTIONS ====================

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        });
    };

    const showNotification = (message) => {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            z-index: 100000;
            font-size: 13px;
            animation: fadeInOut 3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatFileMessage = (msg) => {
        if (!msg.fileUrl) return `File: ${msg.fileName}`;

        const ext = msg.fileName ? msg.fileName.split('.').pop().toLowerCase() : '';
        let icon = '📎';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) icon = '🖼️';
        else if (['pdf'].includes(ext)) icon = '📄';
        else if (['doc', 'docx'].includes(ext)) icon = '📝';
        else if (['xls', 'xlsx'].includes(ext)) icon = '📊';
        else if (['zip', 'rar', '7z'].includes(ext)) icon = '📦';
        else if (['mp3', 'wav', 'ogg'].includes(ext)) icon = '🎵';
        else if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) icon = '🎬';

        const size = msg.size ? ` (${formatFileSize(msg.size)})` : '';
        return `${icon} <a href="${msg.fileUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${msg.fileName}</a>${size}`;
    };

    const isOnlyEmoji = (text) => {
        const cleaned = text.trim();
        const noEmoji = cleaned.replace(/\p{Extended_Pictographic}/gu, '').replace(/\uFE0F/g, '').replace(/\s/g, '');
        return noEmoji.length === 0 && cleaned.length > 0;
    };

    const countEmoji = (text) => {
        const emojiRegex = /\p{Extended_Pictographic}/gu;
        const matches = text.match(emojiRegex);
        return matches ? matches.length : 0;
    };

    const normalizeTimestamp = (timestamp) => {
        let ts = timestamp;
        if (typeof ts === 'string') {
            ts = parseInt(ts, 10);
        }

        if (ts > 9999999999) {
            return ts;
        } else {
            return ts * 1000;
        }
    };

    const getMinuteKey = (timestamp) => {
        const ts = normalizeTimestamp(timestamp);
        const date = new Date(ts);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    };

    const formatLinksInText = (text) => {
        if (!text) return text;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => {
            let displayUrl = url;
            if (url.length > 50) {
                displayUrl = url.substring(0, 47) + '...';
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${displayUrl}</a>`;
        });
    };

    // ==================== FIXED GROUPING UPDATE FUNCTION ====================

    const markMessageGroup = (group) => {
        if (group.length === 0) return;
        
        if (group.length === 1) {
            // Single message
            group[0].classList.add('first-in-group', 'last-in-group');
        } else {
            // First message
            group[0].classList.add('first-in-group');
            
            // Last message
            group[group.length - 1].classList.add('last-in-group');
            
            // Middle messages
            for (let i = 1; i < group.length - 1; i++) {
                group[i].classList.add('middle-in-group');
            }
        }
    };

    const updateMessageGrouping = () => {
        const msgs = document.querySelectorAll('.incoming-msg, .outgoing-msg');
        
        // First remove all grouping classes
        msgs.forEach(msg => {
            msg.classList.remove('first-in-group', 'last-in-group', 'middle-in-group');
        });
        
        if (msgs.length === 0) return;
        
        // Get all elements in messages container
        const allElements = Array.from(messagesContainer.children);
        
        // Filter only messages and preserve order
        const messageElements = allElements.filter(el => 
            el.classList.contains('incoming-msg') || el.classList.contains('outgoing-msg')
        );
        
        // Group messages
        let currentGroup = [];
        let lastMessage = null;
        const ONE_MINUTE = 60 * 1000; // 1 minute in milliseconds
        
        for (let i = 0; i < messageElements.length; i++) {
            const currentMsg = messageElements[i];
            const currentAuthor = currentMsg.classList.contains('incoming-msg') ? 'incoming' : 'outgoing';
            const currentTime = parseInt(currentMsg.dataset.timestamp || '0');
            
            if (lastMessage) {
                const lastAuthor = lastMessage.classList.contains('incoming-msg') ? 'incoming' : 'outgoing';
                const lastTime = parseInt(lastMessage.dataset.timestamp || '0');
                const timeDiff = Math.abs(currentTime - lastTime);
                
                // Check if there's a time divider between messages
                const lastIndex = messageElements.indexOf(lastMessage);
                const currentIndex = i;
                let hasDividerBetween = false;
                
                // Check elements between lastMessage and currentMsg
                for (let j = lastIndex + 1; j < currentIndex; j++) {
                    if (allElements[j] && allElements[j].classList.contains('msg-time-divider')) {
                        hasDividerBetween = true;
                        break;
                    }
                }
                
                // If there's a divider, author changed, or more than 1 minute passed - start new group
                if (hasDividerBetween || lastAuthor !== currentAuthor || timeDiff > ONE_MINUTE) {
                    // Finish current group
                    if (currentGroup.length > 0) {
                        markMessageGroup(currentGroup);
                    }
                    // Start new group
                    currentGroup = [currentMsg];
                } else {
                    // Add to current group
                    currentGroup.push(currentMsg);
                }
            } else {
                // First message
                currentGroup = [currentMsg];
            }
            
            lastMessage = currentMsg;
        }
        
        // Finish last group
        if (currentGroup.length > 0) {
            markMessageGroup(currentGroup);
        }
        
        // Additional check: if there's a single message with a divider before it
        allElements.forEach((el, index) => {
            if (el.classList.contains('incoming-msg') || el.classList.contains('outgoing-msg')) {
                const prevEl = allElements[index - 1];
                const nextEl = allElements[index + 1];
                
                // If there's a divider before the message
                if (prevEl && prevEl.classList.contains('msg-time-divider')) {
                    const nextMsg = allElements.slice(index + 1).find(e => 
                        e.classList.contains('incoming-msg') || e.classList.contains('outgoing-msg')
                    );
                    
                    if (nextMsg) {
                        const currentTime = parseInt(el.dataset.timestamp);
                        const nextTime = parseInt(nextMsg.dataset.timestamp);
                        const timeDiff = Math.abs(nextTime - currentTime);
                        const nextAuthor = nextMsg.classList.contains('incoming-msg') ? 'incoming' : 'outgoing';
                        const currentAuthor = el.classList.contains('incoming-msg') ? 'incoming' : 'outgoing';
                        
                        // If next message is from same author and within a minute, it's first in group
                        if (nextAuthor === currentAuthor && timeDiff <= ONE_MINUTE) {
                            // Already marked as first-in-group
                        } else {
                            // Otherwise it's a single message
                            el.classList.add('first-in-group', 'last-in-group');
                        }
                    } else {
                        // If no messages after, it's a single message
                        el.classList.add('first-in-group', 'last-in-group');
                    }
                }
            }
        });
    };

    // ==================== ADD HANDLERS FUNCTION ====================

    const addMessageActions = (messageElement, messageText) => {
        let pressTimer;
        const longPressDuration = 500;
        
        const handleMouseDown = (e) => {
            if (e.button !== 0) return;
            pressTimer = setTimeout(() => {
                showMessageActions(messageElement, messageText, messageElement.dataset.timestamp);
            }, longPressDuration);
        };
        
        const handleMouseUp = () => {
            clearTimeout(pressTimer);
        };
        
        const handleMouseLeave = () => {
            clearTimeout(pressTimer);
        };
        
        const handleTouchStart = (e) => {
            pressTimer = setTimeout(() => {
                showMessageActions(messageElement, messageText, messageElement.dataset.timestamp);
            }, longPressDuration);
        };
        
        const handleTouchEnd = () => {
            clearTimeout(pressTimer);
        };
        
        const handleTouchCancel = () => {
            clearTimeout(pressTimer);
        };
        
        messageElement.addEventListener('mousedown', handleMouseDown);
        messageElement.addEventListener('mouseup', handleMouseUp);
        messageElement.addEventListener('mouseleave', handleMouseLeave);
        messageElement.addEventListener('touchstart', handleTouchStart);
        messageElement.addEventListener('touchend', handleTouchEnd);
        messageElement.addEventListener('touchcancel', handleTouchCancel);
    };

    // ==================== FIXED displayMessage FUNCTION ====================

    const displayMessage = (from, text, outgoing, timestamp, isNewMessage = true, messageId = null) => {
        const ts = normalizeTimestamp(timestamp);
        const minuteKey = getMinuteKey(ts);

        if (isNewMessage && minuteKey !== lastMinuteKey) {
            lastMinuteKey = minuteKey;
            const date = new Date(ts);
            const divider = document.createElement('div');
            divider.className = 'msg-time-divider';
            divider.textContent = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            messagesContainer.appendChild(divider);
        }

        const msg = document.createElement('div');
        msg.className = outgoing ? 'outgoing-msg' : 'incoming-msg';
        msg.dataset.sender = outgoing ? 'me' : 'peer';
        msg.dataset.timestamp = ts;
        msg.dataset.minuteKey = minuteKey;
        
        if (messageId) {
            msg.dataset.messageId = messageId;
        } else {
            msg.dataset.messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        const formattedText = text.replace(/\n/g, '<br>');
        msg.innerHTML = `<div class="msg-text">${formattedText}</div>`;

        const cleanText = text.replace(/<[^>]*>/g, '');
        if (isOnlyEmoji(cleanText)) {
            msg.classList.add('emoji-msg');
            if (countEmoji(cleanText) === 1) {
                msg.classList.add('single-emoji');
            }
        }

        // Add handlers for ALL own messages
        if (outgoing) {
            addMessageActions(msg, text);
        }

        messagesContainer.appendChild(msg);
        updateMessageGrouping();

        if (isNewMessage) {
            scrollToBottom();
        }
    };

    // ==================== EDIT/DELETE FUNCTIONS ====================

    const showMessageActions = (messageElement, messageText, messageTimestamp) => {
        window.getSelection().removeAllRanges();
        
        const menu = document.createElement('div');
        menu.className = 'message-actions-menu';
        
        const rect = messageElement.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (isMobile) {
            menu.style.left = '50%';
            menu.style.top = '50%';
            menu.style.transform = 'translate(-50%, -50%)';
        } else {
            let left = rect.left;
            let top = rect.top - 10;
            
            if (left + 200 > windowWidth) {
                left = windowWidth - 210;
            }
            if (left < 10) {
                left = 10;
            }
            if (top - 200 < 0) {
                top = rect.bottom + 10;
                menu.style.transform = 'none';
            } else {
                menu.style.transform = 'translateY(-100%)';
            }
            
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }
        
        const editBtn = document.createElement('div');
        editBtn.className = 'message-action-item';
        editBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
            color: var(--text-primary);
        `;
        editBtn.innerHTML = '<i class="fas fa-edit" style="width: 20px;"></i> <span>Edit</span>';
        editBtn.addEventListener('mouseenter', () => {
            editBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        editBtn.addEventListener('mouseleave', () => {
            editBtn.style.background = 'transparent';
        });
        editBtn.addEventListener('click', () => {
            menu.remove();
            editMessage(messageElement, messageText);
        });
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'message-action-item';
        deleteBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
            color: #ef4444;
        `;
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt" style="width: 20px;"></i> <span>Delete</span>';
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = 'rgba(239, 68, 68, 0.1)';
        });
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = 'transparent';
        });
        deleteBtn.addEventListener('click', () => {
            menu.remove();
            deleteMessage(messageElement);
        });
        
        menu.appendChild(editBtn);
        menu.appendChild(deleteBtn);
        document.body.appendChild(menu);
        
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    };

    // FIXED EDIT FUNCTION
    const editMessage = (messageElement, oldText) => {
        const msgText = messageElement.querySelector('.msg-text');
        const oldContent = msgText.innerHTML;
        const messageId = messageElement.dataset.messageId;
        
        console.log('✏️ Editing message:', { messageId, oldText });
        
        const input = document.createElement('textarea');
        input.value = oldText.replace(/<br\s*\/?>/g, '\n');
        input.style.cssText = `
            width: 100%;
            background: transparent;
            border: none;
            color: inherit;
            font-size: inherit;
            font-family: inherit;
            line-height: inherit;
            padding: 0;
            margin: 0;
            outline: none;
            resize: none;
            overflow: hidden;
        `;
        input.rows = 1;
        
        const autoResize = () => {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
        };
        
        input.addEventListener('input', autoResize);
        
        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== oldText) {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    console.error('❌ WebSocket not connected');
                    showNotification('Error: no server connection');
                    msgText.innerHTML = oldContent;
                    return;
                }
                
                if (!sessionId) {
                    console.error('❌ No sessionId');
                    showNotification('Error: session not found');
                    msgText.innerHTML = oldContent;
                    return;
                }
                
                const editRequest = {
                    type: 'edit_message',
                    session_uuid: sessionId,
                    message_id: messageId,
                    new_text: newText,
                    timestamp: Date.now()
                };
                
                console.log('📤 Sending edit request:', editRequest);
                ws.send(JSON.stringify(editRequest));
                
                msgText.innerHTML = formatLinksInText(newText.replace(/\n/g, '<br>'));
            } else {
                msgText.innerHTML = oldContent;
            }
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            }
        });
        
        input.addEventListener('blur', saveEdit);
        
        msgText.innerHTML = '';
        msgText.appendChild(input);
        input.focus();
        autoResize();
    };

    // FIXED DELETE FUNCTION
    const deleteMessage = (messageElement) => {
        if (!confirm('Delete this message?')) return;
        
        const msgText = messageElement.querySelector('.msg-text').textContent;
        const messageId = messageElement.dataset.messageId;
        const messageTimestamp = messageElement.dataset.timestamp;
        
        console.log('🗑️ Deleting message:', { messageId, msgText, sessionId });
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            showNotification('Error: no server connection');
            return;
        }
        
        if (!sessionId) {
            console.error('❌ No sessionId');
            showNotification('Error: session not found');
            return;
        }
        
        const deleteRequest = {
            type: 'delete_message',
            session_uuid: sessionId,
            message_id: messageId,
            timestamp: Date.now()
        };
        
        console.log('📤 Sending delete request:', deleteRequest);
        ws.send(JSON.stringify(deleteRequest));
        
        window.deletedMessages.add(messageId);
        
        messageElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'scale(0.8)';
        messageElement.style.maxHeight = '0';
        messageElement.style.margin = '0';
        messageElement.style.padding = '0';
        
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
                updateMessageGrouping();
            }
        }, 300);
    };

    // ==================== END OF EDIT/DELETE FUNCTIONS ====================

    const addMessageToArray = (msgData) => {
        const exists = messages.some(msg =>
            msg.timestamp === msgData.timestamp &&
            msg.from === msgData.from &&
            (msg.message === msgData.message || msg.fileName === msgData.fileName)
        );

        if (!exists) {
            const ts = normalizeTimestamp(msgData.timestamp);
            const minuteKey = getMinuteKey(ts);

            messages.push({
                ...msgData,
                displayText: msgData.type === 'file' ? formatFileMessage(msgData) : formatLinksInText(msgData.message),
                minuteKey: minuteKey,
                timestamp: ts
            });

            messages.sort((a, b) => a.timestamp - b.timestamp);
        }
    };

    const updateMessageStatus = (messageId, status) => {
        console.log(`Updating message status ${messageId} to ${status}`);
    };

    const updateMessageStatuses = (statuses) => {
        statuses.forEach(statusInfo => {
            updateMessageStatus(statusInfo.message_id, statusInfo.status);
        });
    };

    const deleteWelcomeMessage = () => {
        const incomingMessages = document.querySelectorAll('.incoming-msg');
        let welcomeMessageFound = false;

        incomingMessages.forEach(msg => {
            const msgText = msg.querySelector('.msg-text');
            if (msgText) {
                const textContent = msgText.textContent || '';

                const isWelcomeMessage =
                    textContent.includes('Daniel') ||
                    textContent.includes('Welcome') ||
                    textContent.includes('Hello!') ||
                    (textContent.includes('Support') && textContent.includes('Hello'));

                if (isWelcomeMessage) {
                    welcomeMessageFound = true;

                    msg.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    msg.style.opacity = '0';
                    msg.style.transform = 'translateX(-30px)';
                    msg.style.maxHeight = '0';
                    msg.style.marginTop = '0';
                    msg.style.marginBottom = '0';
                    msg.style.paddingTop = '0';
                    msg.style.paddingBottom = '0';
                    msg.style.overflow = 'hidden';

                    setTimeout(() => {
                        if (msg.parentNode) {
                            msg.parentNode.removeChild(msg);
                        }
                    }, 400);

                    messages = messages.filter(m => {
                        if (m.from === 'Support' && m.message) {
                            const msgTextStr = m.message.toString();
                            return !(msgTextStr.includes('Daniel') ||
                                    msgTextStr.includes('Welcome') ||
                                    msgTextStr.includes('Hello!'));
                        }
                        return true;
                    });
                }
            }
        });

        if (welcomeMessageFound) {
            setTimeout(() => {
                const timeDividers = document.querySelectorAll('.msg-time-divider');
                timeDividers.forEach(divider => {
                    const nextSibling = divider.nextElementSibling;
                    const prevSibling = divider.previousElementSibling;

                    const hasAdjacentMessage =
                        (nextSibling && (nextSibling.classList.contains('incoming-msg') ||
                                         nextSibling.classList.contains('outgoing-msg'))) ||
                        (prevSibling && (prevSibling.classList.contains('incoming-msg') ||
                                         prevSibling.classList.contains('outgoing-msg')));

                    if (!hasAdjacentMessage) {
                        divider.remove();
                    }
                });
                
                // Add grouping call after deleting welcome message
                updateMessageGrouping();
            }, 450);
        }
    };

    const forceCloseSessionUI = () => {
        sessionId = null;
        historyLoaded = false;
        chatClosed = true;
        lastMinuteKey = null;
        messagesContainer.innerHTML = '';
        messages = [];
        localStorage.removeItem('miniChatSessionId');
        if (ws) {
            ws.close();
        }
        widget.classList.remove('open');

        if (isMobile) {
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (viewportMeta && originalViewportContent) {
                viewportMeta.setAttribute('content', originalViewportContent);
            }
            widget.style.maxHeight = '';
            widget.style.height = '';
            widget.style.bottom = '';
        }
    };

    // ==================== SYSTEM MESSAGE FUNCTIONS ====================

    const addCallMessageToChat = (type, duration = null, isVideo = false) => {
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message call-system-message';

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });

        let messageText = '';
        const icon = isVideo ? '📹' : '📞';
        const callType = isVideo ? 'Video call' : 'Call';

        if (type === 'call_info' && duration) {
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;

            if (minutes > 0) {
                messageText = `${icon} ${callType} ${dateStr} at ${timeStr} • Duration: ${minutes} min ${seconds} sec`;
            } else {
                messageText = `${icon} ${callType} ${dateStr} at ${timeStr} • Duration: ${seconds} sec`;
            }
        } else if (type === 'missed') {
            messageText = `❌ Missed ${callType.toLowerCase()} ${dateStr} at ${timeStr}`;
        }

        messageDiv.textContent = messageText;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        
        // Add grouping call after adding system message
        updateMessageGrouping();
    };

    const displayCallLog = (data) => {
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message call-system-message';

        const date = new Date(data.timestamp || Date.now());
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });

        let messageText = '';
        const duration = data.call_duration || 0;
        const isVideo = data.call_type === 'video';
        const icon = isVideo ? '📹' : '📞';
        const callType = isVideo ? 'Video call' : 'Call';

        if (duration > 0) {
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;

            if (minutes > 0) {
                messageText = `${icon} ${callType} ${dateStr} at ${timeStr} • Duration: ${minutes} min ${seconds} sec`;
            } else {
                messageText = `${icon} ${callType} ${dateStr} at ${timeStr} • Duration: ${seconds} sec`;
            }
        } else {
            messageText = `❌ Missed ${callType.toLowerCase()} ${dateStr} at ${timeStr}`;
        }

        messageDiv.textContent = messageText;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        
        // Add grouping call after adding call log
        updateMessageGrouping();
    };

    // ==================== SIMPLIFIED VIDEO FUNCTIONS ====================

    const showVideoContainer = () => {
        if (videoContainer) {
            videoContainer.classList.remove('hidden');
        }
        hideCallOverlay();
    };

    const hideVideoContainer = () => {
        if (videoContainer) {
            videoContainer.classList.add('hidden');
        }
        stopVideoCallTimer();
    };

    const setupLocalVideo = (stream) => {
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.style.transform = 'scaleX(-1)';
            localVideo.setAttribute('playsinline', 'true');
            localVideo.setAttribute('autoplay', 'true');
            localVideo.setAttribute('muted', 'true');

            const playPromise = localVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log('Local video play error:', e);
                });
            }
        }
    };

    const setupRemoteVideo = (stream) => {
        if (!remoteVideo) return;

        console.log('🎥 Setting up remote video');

        remoteVideo.srcObject = stream;
        remoteVideo.setAttribute('playsinline', 'true');
        remoteVideo.setAttribute('autoplay', 'true');

        if (remoteVideoStatus) {
            remoteVideoStatus.classList.add('hidden');
        }

        const oldButton = document.getElementById('force-video-play');
        if (oldButton) oldButton.remove();

        setTimeout(() => {
            remoteVideo.play()
                .then(() => {
                    console.log('✅ Video playing');
                })
                .catch(e => {
                    console.log('❌ Auto-play failed:', e.message);

                    const playButton = document.createElement('button');
                    playButton.id = 'force-video-play';
                    playButton.textContent = '▶ Play video';
                    playButton.style.cssText = `
                        position: absolute; top: 50%; left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 2001;
                        background: #3b82f6; color: white;
                        border: none; border-radius: 30px;
                        padding: 12px 24px; font-size: 16px;
                        cursor: pointer;
                    `;

                    playButton.onclick = () => {
                        playButton.remove();
                        remoteVideo.play().catch(e => console.log('Play error:', e));
                    };

                    remoteVideo.parentNode.appendChild(playButton);
                });
        }, 1000);
    };

    const switchCamera = async () => {
        if (!localStream) return;

        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        const constraints = {
            audio: true,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: currentFacingMode
            }
        };

        try {
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newVideoTrack = newStream.getVideoTracks()[0];

            const sender = peerConnection?.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
                await sender.replaceTrack(newVideoTrack);
            }

            setupLocalVideo(newStream);
            videoTrack.stop();
            localStream = newStream;
        } catch (error) {
            console.error('Camera switch error:', error);
        }
    };

    const toggleVideo = () => {
        if (!localStream) return;

        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isVideoEnabled = videoTrack.enabled;

            if (toggleVideoBtn) {
                toggleVideoBtn.innerHTML = isVideoEnabled ?
                    '<i class="fas fa-video"></i>' :
                    '<i class="fas fa-video-slash"></i>';
            }
        }
    };

    const toggleMicVideo = () => {
        if (!localStream) return;

        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isMicOn = audioTrack.enabled;

            if (toggleMicVideoBtn) {
                toggleMicVideoBtn.innerHTML = isMicOn ?
                    '<i class="fas fa-microphone"></i>' :
                    '<i class="fas fa-microphone-slash"></i>';
                toggleMicVideoBtn.classList.toggle('mic-off', !isMicOn);
            }
        }
    };

    const toggleScreenShare = async () => {
        if (!peerConnection) return;

        if (isScreenSharing) {
            const constraints = {
                audio: true,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: currentFacingMode
                }
            };

            try {
                const newStream = await navigator.mediaDevices.getUserMedia(constraints);
                const newVideoTrack = newStream.getVideoTracks()[0];

                const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(newVideoTrack);
                }

                setupLocalVideo(newStream);

                if (localStream) {
                    localStream.getTracks().forEach(t => {
                        if (t.kind === 'video') t.stop();
                    });
                }

                localStream = newStream;
                isScreenSharing = false;

                if (screenShareBtn) {
                    screenShareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
                }
            } catch (error) {
                console.error('Error returning to camera:', error);
            }
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

                const videoTrack = screenStream.getVideoTracks()[0];

                const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }

                setupLocalVideo(screenStream);

                videoTrack.onended = () => {
                    toggleScreenShare();
                };

                const audioTrack = localStream.getAudioTracks()[0];
                screenStream.addTrack(audioTrack);

                localStream = screenStream;
                isScreenSharing = true;

                if (screenShareBtn) {
                    screenShareBtn.innerHTML = '<i class="fas fa-stop"></i>';
                }
            } catch (error) {
                console.error('Error sharing screen:', error);
            }
        }
    };

    // ==================== VIDEO TIMER FUNCTIONS ====================

    const startVideoCallTimer = () => {
        stopVideoCallTimer();
        videoCallSeconds = 0;
        updateVideoCallTimer();
        videoCallTimerInterval = setInterval(updateVideoCallTimer, 1000);
    };

    const updateVideoCallTimer = () => {
        videoCallSeconds++;
        const minutes = String(Math.floor(videoCallSeconds / 60)).padStart(2, '0');
        const seconds = String(videoCallSeconds % 60).padStart(2, '0');
        if (videoCallTimer) {
            videoCallTimer.textContent = `${minutes}:${seconds}`;
        }
    };

    const stopVideoCallTimer = () => {
        if (videoCallTimerInterval) {
            clearInterval(videoCallTimerInterval);
            videoCallTimerInterval = null;
        }
        videoCallSeconds = 0;
        if (videoCallTimer) {
            videoCallTimer.textContent = '00:00';
        }
    };

    // ==================== RINGTONE FUNCTIONS ====================

    const playRingtone = () => {
        if (ringtonePlaying) return;

        try {
            if (!ringtoneAudio) {
                ringtoneAudio = new Audio('https://placeholder-domain.com/uploads/ringtone.mp3');
                ringtoneAudio.loop = true;
                ringtoneAudio.volume = 0.7;
            }

            ringtoneAudio.play().then(() => {
                ringtonePlaying = true;
            }).catch(error => {
                console.error('Error playing ringtone:', error);
            });
        } catch (error) {
            console.error('Error starting ringtone:', error);
        }
    };

    const stopRingtone = () => {
        if (!ringtonePlaying || !ringtoneAudio) return;

        try {
            ringtoneAudio.pause();
            ringtoneAudio.currentTime = 0;
            ringtonePlaying = false;
        } catch (error) {
            console.error('Error stopping ringtone:', error);
        }
    };

    // ==================== AUDIO CALL INTERFACE FUNCTIONS ====================

    const showCallOverlay = (state) => {
        if (!callOverlay) return;

        callState = state;
        updateCallUI();
        callOverlay.classList.remove('hidden');

        const pulseAnimation = document.querySelector('.pulse-animation');
        if (pulseAnimation) {
            pulseAnimation.style.display = (state === 'connecting' || state === 'outgoing') ? 'block' : 'none';
        }
    };

    const hideCallOverlay = () => {
        if (callOverlay) {
            callOverlay.classList.add('hidden');
        }
    };

    const updateCallUI = () => {
        if (!callTitleText || !callControls) return;

        switch(callState) {
            case 'incoming':
                callTitleText.textContent = 'Incoming call';
                break;
            case 'outgoing':
                callTitleText.textContent = 'Outgoing call';
                break;
            case 'connecting':
                callTitleText.textContent = 'Connecting...';
                break;
            case 'connected':
                callTitleText.textContent = 'Call active';
                break;
        }

        if (callControls) {
            callControls.innerHTML = '';

            if (callState === 'incoming') {
                callControls.appendChild(createCallButton('decline', 'fas fa-phone-slash', 'Decline'));
                callControls.appendChild(createCallButton('accept', 'fas fa-phone', 'Accept'));
            } else if (callState === 'connected' || callState === 'connecting' || callState === 'outgoing') {
                callControls.appendChild(createCallButton('end', 'fas fa-phone-slash', 'End'));
            }
        }
    };

    const createCallButton = (action, icon, label) => {
        const button = document.createElement('button');
        button.className = 'call-button';
        button.setAttribute('data-action', action);

        const iconDiv = document.createElement('div');
        iconDiv.className = 'call-button-icon';

        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconDiv.appendChild(iconElement);

        if (action === 'end') {
            for (let i = 1; i <= 5; i++) {
                const colorSpot = document.createElement('div');
                colorSpot.className = `color-spot-${i}`;
                iconDiv.appendChild(colorSpot);
            }
        }

        const labelDiv = document.createElement('div');
        labelDiv.className = 'call-button-label';
        labelDiv.textContent = label;

        button.appendChild(iconDiv);
        button.appendChild(labelDiv);
        button.addEventListener('click', () => handleCallAction(action));

        return button;
    };

    const handleCallAction = (action) => {
        switch(action) {
            case 'accept':
                acceptCall();
                break;
            case 'decline':
                declineCall();
                break;
            case 'end':
                if (callEndBtn) {
                    callEndBtn.click();
                }
                break;
        }
    };

    // ==================== AUDIO TIMER FUNCTIONS ====================

    const startNewCallTimer = () => {
        callStartTime = Date.now();
        updateNewCallTimer();
        callTimerInterval = setInterval(updateNewCallTimer, 1000);
    };

    const updateNewCallTimer = () => {
        if (callStartTime) {
            const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');

            if (callTimerDisplay) {
                callTimerDisplay.textContent = `${minutes}:${seconds}`;
            }
            if (callTimerSpan) {
                callTimerSpan.textContent = `${minutes}:${seconds}`;
            }
        }
    };

    const startCallTimer = () => {
        stopCallTimer();
        callSeconds = 0;
        if (callTimerSpan) {
            callTimerSpan.textContent = '00:00';
        }

        let callText = callStatusBlock ? callStatusBlock.querySelector('.call-text') : null;
        if (!callText && callStatusBlock && callTimerSpan) {
            callText = document.createElement('span');
            callText.className = 'call-text';
            callText.textContent = 'Call in progress… ';
            callStatusBlock.insertBefore(callText, callTimerSpan);
        }

        callTimerInterval = setInterval(() => {
            callSeconds++;
            const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const s = String(callSeconds % 60).padStart(2, '0');
            if (callTimerSpan) {
                callTimerSpan.textContent = `${m}:${s}`;
            }
        }, 1000);
    };

    const stopCallTimer = () => {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        if (callTimerSpan) {
            callTimerSpan.textContent = '00:00';
        }

        const callText = callStatusBlock ? callStatusBlock.querySelector('.call-text') : null;
        if (callText) callText.remove();
    };

    // ==================== CALL MANAGEMENT FUNCTIONS ====================

    const acceptCall = () => {
        showCallOverlay('connecting');
        startNewCallTimer();
    };

    const declineCall = () => {
        stopRingtone();

        if (currentCallId && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'call_reject',
                callId: currentCallId,
                from: MY_NAME,
                session_uuid: sessionId
            }));
        }

        endCall(false);
    };

    const endCall = (sendSignal = true) => {
        stopRingtone();
        stopCallTimer();
        stopVideoCallTimer();

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }

        if (sendSignal && currentCallId && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'call_end',
                callId: currentCallId,
                from: MY_NAME,
                session_uuid: sessionId
            }));
        }

        hideCallOverlay();
        hideVideoContainer();

        currentCallId = null;
        callState = 'idle';
        callStartTime = null;
        callEndTime = null;
        callSeconds = 0;
        isVideoEnabled = false;
        isScreenSharing = false;

        if (callTimerDisplay) {
            callTimerDisplay.textContent = '00:00';
        }
        if (callTimerSpan) {
            callTimerSpan.textContent = '00:00';
        }

        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
        if (remoteVideoStatus) remoteVideoStatus.classList.remove('hidden');

        const playButton = document.getElementById('force-video-play');
        if (playButton) playButton.remove();
    };

    // ==================== EXTRA OPTIONS MANAGEMENT FUNCTIONS ====================

    const toggleExtraControls = () => {
        if (callExtraControls) {
            callExtraControls.classList.toggle('hidden');
        }
    };

    const toggleSpeaker = () => {
        isSpeakerOn = !isSpeakerOn;
        updateToggle('toggle-speaker', isSpeakerOn);
    };

    const toggleBluetooth = () => {
        isBluetoothOn = !isBluetoothOn;
        updateToggle('toggle-bluetooth', isBluetoothOn);
    };

    const toggleMic = () => {
        isMicOn = !isMicOn;
        updateToggle('toggle-mic', isMicOn);

        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMicOn;
            });
        }
    };

    const updateToggle = (action, state) => {
        const toggle = document.querySelector(`[data-action="${action}"] .toggle-switch`);
        if (toggle) {
            toggle.setAttribute('data-state', state ? 'on' : 'off');
        }
    };

    const initCallExtraControls = () => {
        if (callMoreOptionsBtn) {
            callMoreOptionsBtn.addEventListener('click', toggleExtraControls);
        }

        if (closeExtraControlsBtn) {
            closeExtraControlsBtn.addEventListener('click', toggleExtraControls);
        }

        document.querySelectorAll('.extra-control-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.getAttribute('data-action');
                switch(action) {
                    case 'toggle-speaker':
                        toggleSpeaker();
                        break;
                    case 'toggle-bluetooth':
                        toggleBluetooth();
                        break;
                    case 'toggle-mic':
                        toggleMic();
                        break;
                }
            });
        });
    };

    // ==================== INPUT FIELD INITIALIZATION FUNCTIONS ====================

    const autoResizeTextarea = () => {
        const textarea = inputField;
        if (!textarea) return;

        textarea.style.height = 'auto';
        const maxHeight = 80;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = newHeight + 'px';

        const inputBlock = document.getElementById('mini-chat-input-block');
        if (inputBlock) {
            const baseHeight = 52;
            const extraHeight = Math.max(0, newHeight - 32);
            inputBlock.style.height = (baseHeight + extraHeight) + 'px';
        }
    };

    const initInputField = () => {
        if (!inputField) return;

        const placeholder = inputField.getAttribute('placeholder') || 'Type a message...';

        if (inputField.tagName !== 'TEXTAREA') {
            const textarea = document.createElement('textarea');
            textarea.id = 'mini-chat-message';
            textarea.className = inputField.className;
            textarea.style.cssText = inputField.style.cssText;
            textarea.placeholder = placeholder;
            textarea.value = inputField.value;
            textarea.rows = 1;
            textarea.maxLength = 2000;
            textarea.style.resize = 'none';
            textarea.style.overflowY = 'hidden';
            textarea.style.minHeight = '36px';
            textarea.style.maxHeight = '80px';
            textarea.style.lineHeight = '1.35';
            textarea.style.padding = '8px 12px';
            textarea.style.boxSizing = 'border-box';

            if (inputField.parentNode) {
                inputField.parentNode.replaceChild(textarea, inputField);
            }
        }

        const newInputField = document.getElementById('mini-chat-message');
        if (!newInputField) return;

        newInputField.addEventListener('input', autoResizeTextarea);

        newInputField.addEventListener('focus', (e) => {
            if (isMobile) {
                const viewportMeta = document.querySelector('meta[name="viewport"]');
                if (!viewportMeta) return;

                widgetOriginalHeight = widget.offsetHeight;
                widgetOriginalBottom = parseInt(window.getComputedStyle(widget).bottom) || 0;

                viewportMeta.setAttribute('content',
                    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

                setTimeout(() => {
                    if (newInputField) {
                        newInputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);

                keyboardVisible = true;

                if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                    setTimeout(() => {
                        const visualViewport = window.visualViewport;
                        if (!visualViewport) return;

                        const availableHeight = visualViewport.height - 100;

                        widget.style.maxHeight = `${availableHeight}px`;
                        widget.style.height = `${Math.min(availableHeight, 600)}px`;

                        widget.style.bottom = `${visualViewport.height - availableHeight + 20}px`;

                        setTimeout(() => {
                            scrollToBottom();
                        }, 150);
                    }, 100);
                }
            }
        });

        newInputField.addEventListener('blur', (e) => {
            if (isMobile) {
                setTimeout(() => {
                    if (document.activeElement !== newInputField) {
                        const viewportMeta = document.querySelector('meta[name="viewport"]');
                        if (viewportMeta && originalViewportContent) {
                            viewportMeta.setAttribute('content', originalViewportContent);
                        }

                        widget.style.maxHeight = '';
                        widget.style.height = '';
                        widget.style.bottom = '';

                        if (window.innerWidth <= 480) {
                            widget.style.height = '75vh';
                            widget.style.maxHeight = '85vh';
                        }

                        keyboardVisible = false;

                        if (widget.classList.contains('open')) {
                            scrollToBottom();
                        }
                    }
                }, 300);
            }
        });

        newInputField.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }

            if (e.key === 'Enter' && e.shiftKey) {
                setTimeout(autoResizeTextarea, 0);
            }
        });

        newInputField.addEventListener('paste', e => {
            setTimeout(autoResizeTextarea, 0);
        });

        return newInputField;
    };

    // ==================== MESSAGE SENDING FUNCTIONS ====================

    const sendMessage = () => {
        const inputField = document.getElementById('mini-chat-message');
        if (!inputField) return;

        let text = inputField.value.trim();
        if (!text || !isRegistered) return;

        const timestamp = Date.now();
        const normalizedTimestamp = normalizeTimestamp(timestamp);

        const formattedText = formatLinksInText(text);

        displayMessage(MY_NAME, formattedText, true, normalizedTimestamp, true, null);

        addMessageToArray({
            from: MY_NAME,
            type: 'chat',
            message: text,
            timestamp: normalizedTimestamp
        });

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'chat',
                message: text,
                session_uuid: sessionId,
                timestamp: Math.floor(timestamp / 1000)
            }));
        }

        inputField.value = '';
        autoResizeTextarea();

        if (isMobile) {
            setTimeout(() => {
                inputField.blur();
                const viewportMeta = document.querySelector('meta[name="viewport"]');
                if (viewportMeta && originalViewportContent) {
                    viewportMeta.setAttribute('content', originalViewportContent);
                }
                widget.style.maxHeight = '';
                widget.style.height = '';
                widget.style.bottom = '';
            }, 100);
        } else {
            inputField.focus();
        }
    };

    // ==================== WEBRTC FUNCTIONS ====================

    const createPeerConnection = (withVideo = false) => {
        const pc = new RTCPeerConnection(ICE_CONFIG);

        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.autoplay = true;
            remoteAudio.style.display = 'none';
            document.body.appendChild(remoteAudio);
        }

        pc.ontrack = (e) => {
            console.log('📥 Track received:', e.track.kind);

            if (e.track.kind === 'audio') {
                remoteAudio.srcObject = e.streams[0];
            } else if (e.track.kind === 'video') {
                if (e.streams[0]) {
                    setupRemoteVideo(e.streams[0]);
                }
            }
        };

        pc.onicecandidate = e => {
            if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ice_candidate',
                    callId: currentCallId,
                    candidate: e.candidate,
                    session_uuid: sessionId
                }));
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' ||
                pc.iceConnectionState === 'failed' ||
                pc.iceConnectionState === 'closed') {
                endCall(false);
            }
        };

        return pc;
    };

    const connect = (action) => {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'register',
                    name: MY_NAME,
                    clientId: CLIENT_ID,
                    sessionId: sessionId || null,
                    action: action || null
                }));
            }
        };

        ws.onmessage = async e => {
            try {
                const data = JSON.parse(e.data);

                switch(data.type) {
                    case 'registered':
                        isRegistered = true;
                        sessionId = data.session_uuid;
                        localStorage.setItem('miniChatSessionId', sessionId);
                        historyLoaded = false;
                        chatClosed = false;
                        checkAdminOnlineStatus();
                        break;

                    case 'history':
                        if (historyLoaded) return;
                        historyLoaded = true;
                        messagesContainer.innerHTML = '';
                        lastMinuteKey = null;
                        messages = [];

                        const sortedHistory = data.messages.sort((a, b) => a.timestamp - b.timestamp);

                        let prevMinuteKey = null;

                        sortedHistory.forEach(msg => {
                            addMessageToArray(msg);

                            const ts = normalizeTimestamp(msg.timestamp);
                            const minuteKey = getMinuteKey(ts);

                            if (minuteKey !== prevMinuteKey) {
                                const date = new Date(ts);
                                const divider = document.createElement('div');
                                divider.className = 'msg-time-divider';
                                divider.textContent = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                messagesContainer.appendChild(divider);
                                prevMinuteKey = minuteKey;
                            }

                            const messageText = msg.type === 'file' ? formatFileMessage(msg) :
                                              formatLinksInText(msg.message);

                            displayMessage(
                                msg.from,
                                messageText,
                                msg.from === MY_NAME,
                                msg.timestamp,
                                false,
                                msg.message_id
                            );
                        });

                        setTimeout(() => {
                            scrollToBottom();
                            updateMessageGrouping();
                        }, 50);
                        break;

                    case 'chat':
                    case 'file':
                        if (window.deletedMessages && data.message_id && window.deletedMessages.has(data.message_id)) {
                            console.log('🚫 Ignoring deleted message');
                            break;
                        }
                        addMessageToArray(data);
                        const messageText = data.type === 'file' ? formatFileMessage(data) :
                                          formatLinksInText(data.message);

                        displayMessage(
                            data.from,
                            messageText,
                            data.from === MY_NAME,
                            data.timestamp,
                            true,
                            data.message_id
                        );
                        break;

                    case 'session_closed':
                        forceCloseSessionUI();
                        showNotification('Session was closed.');
                        break;

                    case 'session_archived':
                        showNotification('Chat was deleted by administrator.');
                        forceCloseSessionUI();
                        break;

                    case 'call_offer':
                        const hasVideo = data.hasVideo || false;
                        await handleIncomingCall(data.from, data.callId, data.sdp, data.session_uuid || sessionId, hasVideo);
                        break;

                    case 'call_answer':
                        stopRingtone();

                        if (peerConnection) {
                            await peerConnection.setRemoteDescription({ type: 'answer', sdp: data.sdp });
                            if (data.hasVideo) {
                                showVideoContainer();
                                startVideoCallTimer();
                            } else {
                                showCallOverlay('connected');
                                startNewCallTimer();
                            }
                        }
                        break;

                    case 'ice_candidate':
                        if (peerConnection && data.candidate) {
                            try {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                            } catch {}
                        }
                        break;

                    case 'call_reject':
                        stopRingtone();
                        endCall(false);
                        break;

                    case 'call_end':
                        stopRingtone();
                        endCall(false);
                        break;

                    case 'call_log':
                        // displayCallLog(data);
                        break;

                    case 'delete_welcome_message':
                        deleteWelcomeMessage();
                        break;

                    case 'message_status_update':
                        updateMessageStatus(data.message_id, data.status);
                        break;

                    case 'message_statuses':
                        updateMessageStatuses(data.statuses);
                        break;

                    case 'admin_status':
                        if (data.session_uuid === sessionId) {
                            if (data.status === 'online') {
                                adminStatus = 'online';
                                updateHeaderStatus('online');
                            } else if (data.status === 'offline') {
                                adminStatus = 'offline';
                                adminLastSeen = data.last_seen ? data.last_seen * 1000 : Date.now();
                                updateHeaderStatus('offline', adminLastSeen);
                            }
                        }
                        break;

                    case 'message_deleted':
                        console.log('🗑️ Message deleted from server:', data.message_id);
                        const deletedMsg = document.querySelector(`[data-message-id="${data.message_id}"]`);
                        if (deletedMsg && deletedMsg.parentNode) {
                            window.deletedMessages.add(data.message_id);
                            deletedMsg.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            deletedMsg.style.opacity = '0';
                            deletedMsg.style.transform = 'scale(0.8)';
                            deletedMsg.style.maxHeight = '0';
                            deletedMsg.style.margin = '0';
                            deletedMsg.style.padding = '0';
                            
                            setTimeout(() => {
                                deletedMsg.remove();
                                updateMessageGrouping();
                            }, 300);
                        }
                        break;

                    case 'message_edited':
                        console.log('✏️ Message edited from server:', data.message_id);
                        const editedMsg = document.querySelector(`[data-message-id="${data.message_id}"]`);
                        if (editedMsg) {
                            const msgText = editedMsg.querySelector('.msg-text');
                            if (msgText) {
                                msgText.innerHTML = formatLinksInText(data.new_text.replace(/\n/g, '<br>'));
                            }
                        }
                        break;

                    case 'error':
                        console.error('❌ Server error:', data);
                        if (data.message) {
                            showNotification(`Error: ${data.message}`);
                        }
                        break;
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        ws.onclose = () => {
            isRegistered = false;
            updateHeaderStatus('offline', Date.now());
            if (!chatClosed) setTimeout(() => connect(), 2000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (ws) ws.close();
        };
    };

    const handleIncomingCall = async (from, callId, sdp, incomingSessionId, hasVideo = false) => {
        currentCallId = callId;
        sessionId = incomingSessionId;

        const constraints = {
            audio: true,
            video: hasVideo ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } : false
        };

        try {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);

            if (hasVideo) {
                setupLocalVideo(localStream);
                showVideoContainer();
                isVideoEnabled = true;
                if (videoCallPeer) {
                    videoCallPeer.textContent = 'Support Service';
                }
            } else {
                showCallOverlay('incoming');
            }

            peerConnection = createPeerConnection(hasVideo);
            localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
            await peerConnection.setRemoteDescription({ type: 'offer', sdp });
            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: hasVideo
            });
            await peerConnection.setLocalDescription(answer);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'call_answer',
                    callId,
                    sdp: answer.sdp,
                    from: MY_NAME,
                    session_uuid: sessionId,
                    hasVideo: hasVideo
                }));
            }

            if (hasVideo) {
                startVideoCallTimer();
            }
        } catch (error) {
            console.error('Incoming call error:', error);
            endCall(true);
            showNotification('Could not access camera/microphone');
        }
    };

    const startCall = async (withVideo = false) => {
        try {
            currentCallId = Date.now().toString();

            const constraints = {
                audio: true,
                video: withVideo ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            };

            localStream = await navigator.mediaDevices.getUserMedia(constraints);

            if (withVideo) {
                setupLocalVideo(localStream);
                isVideoEnabled = true;
            }

            peerConnection = createPeerConnection(withVideo);
            localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: withVideo
            });

            await peerConnection.setLocalDescription(offer);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'call_offer',
                    callId: currentCallId,
                    sdp: offer.sdp,
                    from: MY_NAME,
                    session_uuid: sessionId,
                    hasVideo: withVideo
                }));
            }

            if (withVideo) {
                showVideoContainer();
                startVideoCallTimer();
                if (videoCallPeer) {
                    videoCallPeer.textContent = 'Support Service';
                }
            } else {
                showCallOverlay('outgoing');
                playRingtone();
            }

            if (callStatusBlock) {
                callStatusBlock.classList.remove('call-closed');
            }

            let callText = callStatusBlock ? callStatusBlock.querySelector('.call-text') : null;
            if (!callText && callStatusBlock && callTimerSpan) {
                callText = document.createElement('span');
                callText.className = 'call-text';
                callText.textContent = 'Call in progress… ';
                callStatusBlock.insertBefore(callText, callTimerSpan);
            }
        } catch (error) {
            console.error('Error starting call:', error);
            showNotification('Could not start call');
            stopRingtone();
            endCall(false);
        }
    };

    // ==================== EVENT HANDLERS ====================

    if (callBtn) {
        callBtn.onclick = () => startCall(false);
    }

    if (videoCallBtn) {
        videoCallBtn.onclick = () => startCall(true);
    }

    if (callEndBtn) {
        callEndBtn.onclick = () => {
            const finalCallId = currentCallId;

            if (finalCallId && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'call_end',
                    callId: finalCallId,
                    from: MY_NAME,
                    session_uuid: sessionId
                }));
            }

            endCall(false);
        };
    }

    if (toggleVideoBtn) {
        toggleVideoBtn.addEventListener('click', toggleVideo);
    }

    if (switchCameraBtn) {
        switchCameraBtn.addEventListener('click', switchCamera);
    }

    if (screenShareBtn) {
        screenShareBtn.addEventListener('click', toggleScreenShare);
    }

    if (toggleMicVideoBtn) {
        toggleMicVideoBtn.addEventListener('click', toggleMicVideo);
    }

    if (endVideoCallBtn) {
        endVideoCallBtn.addEventListener('click', () => {
            if (callEndBtn) {
                callEndBtn.click();
            }
        });
    }

    sendBtn.onclick = sendMessage;

    attachBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/placeholder-upload.php', { method: 'POST', body: formData });
                if (!res.ok) throw new Error(`Server returned ${res.status}`);

                const data = await res.json();
                if (data.fileUrl && data.fileName) {
                    const timestamp = Date.now();
                    const normalizedTimestamp = normalizeTimestamp(timestamp);
                    const fileMessage = formatFileMessage(data);

                    displayMessage(MY_NAME, fileMessage, true, normalizedTimestamp, true, null);

                    addMessageToArray({
                        from: MY_NAME,
                        type: 'file',
                        fileName: data.fileName,
                        fileUrl: data.fileUrl,
                        mimeType: data.mimeType || file.type,
                        size: data.size || file.size,
                        timestamp: normalizedTimestamp
                    });

                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'file',
                            fileName: data.fileName,
                            fileUrl: data.fileUrl,
                            mimeType: data.mimeType || file.type,
                            size: data.size || file.size,
                            session_uuid: sessionId,
                            timestamp: Math.floor(timestamp / 1000)
                        }));
                    }
                } else {
                    showNotification('File upload error');
                }
            } catch (err) {
                console.error(err);
                showNotification(`Error: ${err.message}`);
            }
        };
        input.click();
    };

    toggleBtn.onclick = () => {
        widget.classList.toggle('open');
        chatClosed = !widget.classList.contains('open');

        if (chatClosed) {
            if (ws) {
                ws.close();
            }
        } else {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                connect();
            } else {
                checkAdminOnlineStatus();
            }
            setTimeout(() => {
                updateMessageGrouping();
                const inputField = document.getElementById('mini-chat-message');
                if (inputField) {
                    if (!isMobile) {
                        inputField.focus();
                    }
                }
            }, 300);
        }
    };

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            if (!sessionId || !isRegistered || !ws) return;

            ws.send(JSON.stringify({ type: 'close_session', session_uuid: sessionId }));
            forceCloseSessionUI();
            showNotification('Chat closed. Have a great day!');
        });
    }

    if (remoteVideo) {
        console.log('✅ remoteVideo element found');
    } else {
        console.error('❌ remoteVideo element not found');
    }

    initInputField();
    initCallExtraControls();

    if (sessionId && !chatClosed) {
        widget.classList.add('open');
        connect();
    }

    setInterval(() => {
        if (widget.classList.contains('open') && ws && ws.readyState === WebSocket.OPEN) {
            checkAdminOnlineStatus();
        }
    }, 30000);
});