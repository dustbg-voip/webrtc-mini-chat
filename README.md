WebRTC Mini Chat Widget
Version: 3.2
Author: Jordan Babov
License: MIT
WhatsApp-style mini chat widget with WebRTC audio/video calls and automatic theme switching. Perfect for WordPress sites needing direct visitor-to-admin communication with unique addresses (like 3CX).
 
Table of Contents
•	Features
•	System Requirements
•	Installation in WordPress
•	Configuration
•	Replacing Placeholders with Real Servers
•	Unique Addresses (Like 3CX)
•	Usage
•	Creating Your Own Signaling Server
•	Troubleshooting
•	Files Structure
•	Support
 
Features
•	Real-time chat with WebSocket connection
•	Audio calls via WebRTC
•	Video calls with camera switching and screen sharing
•	File sharing with progress indication
•	Automatic theme switching (day/night based on time)
•	Fully responsive mobile design
•	Unique connection addresses 
•	Message editing and deletion
•	Admin online status display
•	Modern glass-morphism UI
 
System Requirements
•	WordPress: 5.0 or higher
•	PHP: 7.4 or higher
•	SSL Certificate: Required for WebRTC (HTTPS)
•	WebSocket Support: On your server
•	Browsers: Chrome, Firefox, Safari, Edge (latest versions)
•	Node.js and npm: For custom signaling server development (optional)
 
Installation in WordPress
Method 1: Via WordPress Admin Panel
1.	Download the plugin archive (webrtc-mini-chat.zip)
2.	In WordPress admin, go to Plugins -> Add New
3.	Click "Upload Plugin"
4.	Select the downloaded archive and click "Install Now"
5.	After installation, click "Activate"
Method 2: Via FTP
1.	Extract the plugin archive
2.	Upload the webrtc-mini-chat folder to /wp-content/plugins/
3.	In WordPress admin, go to Plugins and activate the plugin
Method 3: Via Git
cd /wp-content/plugins/
git clone https://github.com/dustbg-voip/webrtc-mini-chat.git
Then activate from WordPress admin panel.
 
Configuration
Adding the Widget to Your Site
Use the shortcode [mini_chat_widget] anywhere on your site:
In a post or page:
[mini_chat_widget]
In theme files (header.php, footer.php):
<?php echo do_shortcode('[mini_chat_widget]'); ?>
In a sidebar widget:
Add a "Text" widget and paste the shortcode.
WordPress Admin Settings
After activation, go to Settings -> Mini Chat in your WordPress admin panel. You will find:
Setting	Description
Unique Address	Automatically generated connection URL (like 3CX)
Admin Status	Set admin online/away/busy/offline
Welcome Message	Customize the first message sent to new visitors
Generate New Address	Create a new unique connection URL
 
Replacing Placeholders with Real Servers
The plugin comes with placeholder values for security. You must replace them with your actual server details in the mini-chat.js file.
1. WebSocket Server (Signaling Server)
In js/mini-chat.js, find and replace:
BEFORE (placeholder):
const WS_URL = 'wss://placeholder-websocket.example.com/ws';
AFTER (your real server):
const WS_URL = 'wss://your-domain.com/ws';
For local development:
const WS_URL = 'ws://localhost:8080';
2. STUN/TURN Servers (ICE Configuration)
In js/mini-chat.js, find the ICE_CONFIG array and replace:
BEFORE (placeholders):
const ICE_CONFIG = {
iceServers: [
{ urls: 'stun:stun.placeholder.com:19302' },
{ urls: 'turn:placeholder-turn.example.com:3478?transport=udp',
username: 'PLACEHOLDER_USER',
credential: 'PLACEHOLDER_CRED' },
]
};
AFTER (real servers):
const ICE_CONFIG = {
iceServers: [
{ urls: 'stun:stun.l.google.com:19302' },
{ urls: 'stun:stun1.l.google.com:19302' },
{ urls: 'stun:stun2.l.google.com:19302' },
{ urls: 'stun:stun3.l.google.com:19302' },
{ urls: 'stun:stun4.l.google.com:19302' },
{
urls: 'turn:your-turn-server.com:3478',
username: 'your-username',
credential: 'your-password'
},
{
urls: 'turns:your-turn-server.com:5349',
username: 'your-username',
credential: 'your-password'
}
]
};
3. File Upload Endpoint
In js/mini-chat.js, find and replace:
BEFORE:
const res = await fetch('/placeholder-upload.php', { method: 'POST', body: formData });
AFTER (WordPress AJAX endpoint):
const res = await fetch('/wp-admin/admin-ajax.php?action=upload_chat_file', { method: 'POST', body: formData });
4. Ringtone URL
In js/mini-chat.js, find and replace:
BEFORE:
ringtoneAudio = new Audio('https://placeholder-domain.com/uploads/ringtone.mp3');
AFTER (your actual file):
ringtoneAudio = new Audio('https://your-domain.com/wp-content/uploads/ringtone.mp3');
 
Unique Addresses (Like 3CX)
Upon installation, the plugin automatically generates a unique address:
https://your-site.com/chat/ABC123XYZ
How It Works
1.	For website visitors: When opening the widget, they connect to this unique address
2.	For administrator: In the iOS app, enter the same address to connect
3.	Direct connection: This address establishes a direct P2P WebRTC connection
Finding Your Unique Address
•	WordPress Admin: Settings -> Mini Chat -> Unique Address field
•	Database: wp_options table, mini_chat_unique_address key
Generating a New Address
If you need a new address:
1.	Go to WordPress Admin -> Settings -> Mini Chat
2.	Click "Generate New Address" button
3.	The old address will stop working immediately
Address Structure
https://your-domain.com/chat/[RANDOM-8-CHARACTERS]
The random part uses: A-Z, a-z, 0-9 (62 possible characters per position)
Security Features
•	Addresses are stored in WordPress options table
•	Each address can be manually revoked anytime
•	Rate limiting on connection attempts
 
Usage
For Website Visitors
1.	Open chat: Click the green chat button (bottom right corner)
2.	Send message: Type and press Enter
3.	Send files: Click paperclip icon, select file
4.	Audio call: Click phone icon
5.	Video call: Click video camera icon
6.	During call: Mute, switch camera, share screen
7.	Edit/Delete: Long press or right-click on your messages
For Administrator (iOS App)
1.	Download "Mini Chat Admin" from App Store
2.	Enter your unique address from WordPress admin
3.	Connect and start responding to visitors
4.	Receive notifications for new messages
5.	Make audio/video calls back to visitors
Status Indicators
Status	Dot Color	Description
Online	Green	Admin is active
Offline	Gray	Admin disconnected
Away	Yellow	Away from keyboard
Busy	Red	On another call
Typing	Red (pulsing)	Admin is typing
 
Creating Your Own Signaling Server
If you don't have a WebSocket server, create a simple signaling server with Node.js.
Basic Signaling Server (server.js)
javascript
const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();
const sessions = new Map();

wss.on('connection', (ws) => {
    const clientId = generateId();
    clients.set(clientId, ws);
    
    console.log(`Client connected: ${clientId}`);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(clientId, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clients.delete(clientId);
    });
});

function handleMessage(clientId, data) {
    console.log('Received:', data.type, 'from:', clientId);
    
    switch(data.type) {
        case 'register':
            handleRegister(clientId, data);
            break;
        case 'chat':
        case 'file':
            handleChatMessage(clientId, data);
            break;
        case 'call_offer':
        case 'call_answer':
        case 'ice_candidate':
        case 'call_reject':
        case 'call_end':
            handleCallSignaling(clientId, data);
            break;
        case 'get_admin_status':
            handleGetAdminStatus(clientId, data);
            break;
    }
}

function handleRegister(clientId, data) {
    const { name, clientId: userClientId, sessionId } = data;
    
    let sessionUuid = sessionId;
    if (!sessionUuid || !sessions.has(sessionUuid)) {
        sessionUuid = generateSessionId();
        sessions.set(sessionUuid, clientId);
    }
    
    sendToClient(clientId, {
        type: 'registered',
        session_uuid: sessionUuid,
        client_id: userClientId
    });
    
    broadcastAdminStatus('online');
}

function sendToClient(clientId, data) {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
    }
}

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substring(2, 15);
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
    console.log(`WebSocket URL: ws://localhost:${PORT}`);
});
Running the Signaling Server
bash
npm init -y
npm install ws
node server.js
For production, use PM2:
bash
npm install -g pm2
pm2 start server.js --name signaling-server
Setting Up with SSL (WSS)
javascript
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');

const server = https.createServer({
    cert: fs.readFileSync('/path/to/cert.pem'),
    key: fs.readFileSync('/path/to/key.pem')
});

const wss = new WebSocket.Server({ server });

server.listen(8443, () => {
    console.log('Secure WebSocket server running on wss://your-domain.com:8443');
});
 
Troubleshooting
WebSocket Connection Issues
Symptom	Solution
WebSocket connection failed	Check SSL certificate (must be valid for wss://)
Connection refused	Ensure port is open in firewall
404 Not Found	Wrong WebSocket path - check WS_URL
Certificate error	Use valid SSL certificate, not self-signed
Quick checklist:
bash
npm install -g wscat
wscat -c wss://your-domain.com/ws
Video/Audio Call Issues
Symptom	Solution
Failed to access camera	Check browser permissions
No audio in call	Verify microphone permissions, check STUN servers
Video not showing	Ensure HTTPS is enabled, check localStream creation
ICE connection failed	Configure TURN servers for NAT traversal
Test STUN/TURN servers:
javascript
const pc = new RTCPeerConnection({
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
});
pc.createDataChannel('test');
pc.createOffer().then(offer => pc.setLocalDescription(offer));
pc.onicecandidate = (e) => {
    if (e.candidate) console.log('ICE candidate:', e.candidate.candidate);
};
File Upload Issues
Symptom	Solution
Upload fails	Check PHP upload_max_filesize and post_max_size
404 on upload	Verify AJAX action is registered in WordPress
File too large	Increase limits in php.ini
Permission denied	Check folder permissions for uploads directory
Session Management Issues
Symptom	Solution
Session not found	Check sessionId in localStorage, verify server storage
Messages not loading	Ensure history endpoint returns correct data
Duplicate messages	Check message deduplication logic
 
Files Structure
text
webrtc-mini-chat/
├── webrtc-mini-widget.php        # Main plugin file
├── js/
│   └── mini-chat.js              # Core JavaScript
├── css/
│   └── mini-chat.css             # Styles
├── README.md                      # This file
└── .gitignore                     # Git ignore rules
Key Files Explained
webrtc-mini-widget.php:
•	Plugin header and metadata
•	Enqueues scripts and styles
•	Shortcode registration
•	WordPress admin settings
•	REST API endpoints
js/mini-chat.js:
•	WebSocket connection management
•	WebRTC peer connection handling
•	Message display and grouping
•	Call interface (audio/video)
•	File upload handling
•	Mobile responsiveness
css/mini-chat.css:
•	Theme variables (day/night)
•	Widget styling
•	Call overlay design
•	Message bubbles
•	Responsive media queries
 
Support
Documentation
Full documentation: https://your-domain.com/docs
Contact
Email: support@your-domain.com
GitHub Issues: https://github.com/dustbg-voip/webrtc-mini-chat/issues
Contributing
1.	Fork the repository
2.	Create feature branch (git checkout -b feature/amazing-feature)
3.	Commit changes (git commit -m 'Add amazing feature')
4.	Push to branch (git push origin feature/amazing-feature)
5.	Open a Pull Request
License
This project is licensed under the MIT License.

