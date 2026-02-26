<?php
/*
Plugin Name: WebRTC Mini Chat Widget
Description: WhatsApp-style mini chat widget with WebRTC audio/video calls and automatic theme switching.
Version: 3.2
Author: Jordan Babov
*/

if (!defined('ABSPATH')) exit;

function mini_chat_widget_enqueue() {
    wp_enqueue_script(
        'mini-chat-js',
        plugin_dir_url(__FILE__) . 'js/mini-chat.js',
        array(),
        '3.2',
        true
    );

    wp_enqueue_style(
        'mini-chat-css',
        plugin_dir_url(__FILE__) . 'css/mini-chat.css',
        array(),
        '3.2'
    );

    wp_enqueue_style(
        'mini-chat-icons',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    );
    
    // Add inline CSS for fixed status width
    wp_add_inline_style('mini-chat-css', '
        /* Fixed status width in header */
        #mini-chat-status {
            width: 160px !important;
            min-width: 160px !important;
            max-width: 160px !important;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: var(--status-bg);
            border-radius: 50px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border-color);
            box-shadow: 0 2px 6px var(--shadow-color);
            overflow: hidden;
            box-sizing: border-box;
            margin: 0 8px;
        }
        
        /* Status text with ellipsis */
        #mini-chat-status .status-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            letter-spacing: 0.02em;
            flex: 1;
        }
        
        /* Status dot */
        #mini-chat-status .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        /* Colors for different statuses */
        #mini-chat-status.status-online .status-dot {
            background: #4CAF50;
            box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
        }
        
        #mini-chat-status.status-online .status-text {
            color: #4CAF50;
        }
        
        #mini-chat-status.status-offline .status-dot {
            background: #9e9e9e;
            box-shadow: 0 0 8px rgba(158, 158, 158, 0.5);
        }
        
        #mini-chat-status.status-offline .status-text {
            color: #9e9e9e;
        }
        
        #mini-chat-status.status-away .status-dot {
            background: #FFC107;
            box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
        }
        
        #mini-chat-status.status-away .status-text {
            color: #FFC107;
        }
        
        #mini-chat-status.status-busy .status-dot {
            background: #F44336;
            box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
        }
        
        #mini-chat-status.status-busy .status-text {
            color: #F44336;
        }
        
        #mini-chat-status.status-typing .status-dot {
            background: #ef4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
            animation: status-pulse 1.5s infinite;
        }
        
        #mini-chat-status.status-typing .status-text {
            color: #ef4444;
        }
        
        @keyframes status-pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
        }
        
        /* Mobile responsiveness */
        @media (max-width: 480px) {
            #mini-chat-status {
                width: 140px !important;
                min-width: 140px !important;
                max-width: 140px !important;
                padding: 4px 10px;
            }
            
            #mini-chat-status .status-text {
                font-size: 12px;
            }
            
            #mini-chat-status .status-dot {
                width: 8px;
                height: 8px;
            }
        }
        
        @media (max-width: 375px) {
            #mini-chat-status {
                width: 120px !important;
                min-width: 120px !important;
                max-width: 120px !important;
            }
        }
    ');
    
    // Add inline script for theme setup before page load
    wp_add_inline_script('mini-chat-js', '
        (function() {
            function setThemeByTime() {
                const hour = new Date().getHours();
                const body = document.body;
                
                if (hour >= 9 && hour < 18) {
                    body.classList.remove("night-theme");
                    body.classList.add("day-theme");
                } else {
                    body.classList.remove("day-theme");
                    body.classList.add("night-theme");
                }
            }
            
            // Set theme immediately
            setThemeByTime();
            
            // Update theme every hour
            setInterval(setThemeByTime, 3600000);
            
            // Listen for system theme changes
            if (window.matchMedia) {
                window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", setThemeByTime);
            }
        })();
    ', 'before');
}
add_action('wp_enqueue_scripts', 'mini_chat_widget_enqueue');

function mini_chat_widget_shortcode() {
    ob_start(); ?>
    
    <div id="mini-chat-button" style="font-size:26px; color:#25D366;">
        <i class="fas fa-comment"></i>
    </div>

    <div id="mini-chat-widget" class="closed">
        <!-- Widget header -->
        <div id="mini-chat-header">
            <div id="mini-chat-close">
                <i class="fas fa-times"></i>
            </div>
            
            <div id="mini-chat-status" class="status-offline">
                <span class="status-dot"></span>
                <span class="status-text">loading...</span>
            </div>
            
            <div id="mini-chat-header-buttons">
                <button id="mini-chat-call-button" title="Audio call">
                    <i class="fas fa-phone"></i>
                </button>
                <button id="mini-chat-video-button" title="Video call">
                    <i class="fas fa-video"></i>
                </button>
            </div>
        </div>

        <!-- Audio call overlay -->
        <div id="call-overlay" class="call-overlay hidden">
            <div class="call-container">
                <div class="pulse-animation"></div>
                
                <div class="call-avatar">
                    <div class="avatar-circle">
                        <span class="avatar-letter">S</span>
                    </div>
                </div>
                
                <div class="call-info">
                    <div class="call-title" id="call-title-text">Incoming call</div>
                    <div class="call-duration" id="call-timer-display">00:00</div>
                    <div class="call-peer">Support Service</div>
                </div>
                
                <div class="call-controls" id="call-controls"></div>
                
                <div class="call-extra-controls hidden" id="call-extra-controls">
                    <div class="extra-controls-header">
                        <span>Audio devices</span>
                        <button class="close-extra" id="close-extra-controls">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="extra-controls-list">
                        <div class="extra-control-item" data-action="toggle-speaker">
                            <div class="extra-control-left">
                                <i class="fas fa-volume-up"></i>
                                <span>Speakerphone</span>
                            </div>
                            <div class="extra-control-toggle">
                                <div class="toggle-switch" data-state="off">
                                    <div class="toggle-slider"></div>
                                </div>
                            </div>
                        </div>
                        <div class="extra-control-item" data-action="toggle-bluetooth">
                            <div class="extra-control-left">
                                <i class="fas fa-bluetooth"></i>
                                <span>Bluetooth</span>
                            </div>
                            <div class="extra-control-toggle">
                                <div class="toggle-switch" data-state="off">
                                    <div class="toggle-slider"></div>
                                </div>
                            </div>
                        </div>
                        <div class="extra-control-item" data-action="toggle-mic">
                            <div class="extra-control-left">
                                <i class="fas fa-microphone"></i>
                                <span>Microphone</span>
                            </div>
                            <div class="extra-control-toggle">
                                <div class="toggle-switch" data-state="on">
                                    <div class="toggle-slider"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button class="call-more-options" id="call-more-options">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>
        </div>

        <!-- VIDEO CONTAINER -->
        <div id="video-call-container" class="video-call-container hidden">
            <div class="remote-video-container">
                <video id="remote-video" autoplay playsinline></video>
                <div class="remote-video-status" id="remote-video-status">
                    <i class="fas fa-video-slash"></i>
                    <span>Peer camera is off</span>
                </div>
            </div>
            
            <div class="local-video-container">
                <video id="local-video" autoplay playsinline muted></video>
                <div class="local-video-label">You</div>
            </div>
            
            <div class="video-controls">
                <button id="toggle-video-btn" class="video-control-btn" data-action="toggle-video" title="Toggle video">
                    <i class="fas fa-video"></i>
                </button>
                <button id="switch-camera-btn" class="video-control-btn" data-action="switch-camera" title="Switch camera">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button id="screen-share-btn" class="video-control-btn" data-action="screen-share" title="Share screen">
                    <i class="fas fa-desktop"></i>
                </button>
                <button id="toggle-mic-video-btn" class="video-control-btn" data-action="toggle-mic" title="Toggle microphone">
                    <i class="fas fa-microphone"></i>
                </button>
                <button id="end-video-call-btn" class="video-control-btn end-call" data-action="end-call" title="End call">
                    <i class="fas fa-phone-slash"></i>
                </button>
            </div>
            
            <div class="video-call-info">
                <span class="video-call-timer" id="video-call-timer">00:00</span>
                <span class="video-call-peer">Support Service</span>
            </div>
        </div>

        <!-- Old call status block (hidden) -->
        <div id="mini-chat-call-status" class="call-closed">
            <span id="call-status-text"></span>
            <span id="call-timer">00:00</span>
            <button id="call-end-button">
                <i class="fas fa-phone-slash"></i>
            </button>
        </div>

        <!-- Messages container -->
        <div id="mini-chat-messages"></div>

        <!-- Message input block -->
        <div id="mini-chat-input-block">
            <button id="mini-chat-add-file">
                <i class="fas fa-paperclip"></i>
            </button>
            <input type="text" id="mini-chat-message" placeholder="Message">
            <button id="mini-chat-send">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>
    
    <?php
    return ob_get_clean();
}
add_shortcode('mini_chat_widget', 'mini_chat_widget_shortcode');

// Add endpoint for call logs
function mini_chat_register_rest_routes() {
    register_rest_route('mini-chat/v1', '/call-log', array(
        'methods' => 'POST',
        'callback' => 'mini_chat_handle_call_log',
        'permission_callback' => '__return_true',
    ));
}
add_action('rest_api_init', 'mini_chat_register_rest_routes');

function mini_chat_handle_call_log($request) {
    $params = $request->get_json_params();
    error_log('Call log: ' . print_r($params, true));
    return rest_ensure_response(array('success' => true));
}