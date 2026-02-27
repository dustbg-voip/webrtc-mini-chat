WebRTC Mini Chat Widget
A clean WhatsApp-style chat widget with WebRTC audio/video calls and automatic theme switching.

Download: github.com/dustbg-voip/webrtc-mini-chat

Features
Real-time chat via WebSocket

Audio and Video calls (WebRTC)

File sharing

Message editing/deletion

Automatic day/night theme

Fully responsive design

Quick Start
Install the plugin in WordPress (Plugins → Add New → Upload)

Configure your WebSocket server URL in Settings → WebRTC Chat

Add [mini_chat_widget] to any page or post

Server Configuration
In WordPress admin, go to Settings → WebRTC Chat and enter your WebSocket server URL:

Examples:

Production with SSL: wss://your-domain.com/ws

Local development: ws://localhost:8080

Demo server: wss://demo-chat.example.com

The plugin automatically injects this URL into the JavaScript – no manual editing required.

Works with WhisperCall iOS App
Admins can respond to visitors using the WhisperCall iOS app:
github.com/dustbg-voip/Whispercall (demo mode available)

Simply enter your site's unique chat address in the app to connect.

Demo Access
For demo access or questions about setting up your own server, contact:

Jordan Babov – jbabov@me.com

Usage
Visitors: Click the green chat button, type messages, use phone/video buttons for calls

Admins: Open WhisperCall app, enter your unique address, connect and reply

Important
Ensure your WebSocket server supports CORS and HTTPS (wss://) for production use.
