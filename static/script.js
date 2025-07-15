document.addEventListener('DOMContentLoaded', () => {
    const unescoPopup = document.getElementById('unesco-popup');
    const acceptUnescoBtn = document.getElementById('accept-unesco');
    const callScreen = document.getElementById('call-screen');
    const acceptCallBtn = document.getElementById('accept-call');
    const declineCallBtn = document.getElementById('decline-call');
    const conversationScreen = document.getElementById('conversation-screen');
    const ringtone = document.getElementById('ringtone');

    const whatsappLink = document.getElementById('whatsapp-link');
    const telegramLink = document.getElementById('telegram-link');
    const AUM_WHATSAPP_NUMBER = "1234567890"; // IMPORTANT: Replace with your number, including country code, no + or spaces

    let ws;
    let mediaRecorder;
    let audioContext;
    let sessionCode = '';

    acceptUnescoBtn.addEventListener('click', () => {
        unescoPopup.classList.add('hidden');
        callScreen.classList.remove('hidden');
        ringtone.play();
    });

    declineCallBtn.addEventListener('click', () => {
        ringtone.pause();
        callScreen.classList.add('hidden');
        // Optionally, show a "Call ended" message
    });

    acceptCallBtn.addEventListener('click', async () => {
        ringtone.pause();
        callScreen.classList.add('hidden');
        conversationScreen.classList.remove('hidden');
        await startConversation();
    });

    const startConversation = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            // Set up WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

            ws.onopen = () => {
                console.log("WebSocket connection established.");
                
                // Try different MIME types for better iPhone compatibility
                let mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported('audio/webm')) {
                    if (MediaRecorder.isTypeSupported('audio/mp4')) {
                        mimeType = 'audio/mp4';
                    } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                        mimeType = 'audio/wav';
                    } else {
                        mimeType = ''; // Let browser choose
                    }
                }
                
                console.log(`Using MIME type: ${mimeType}`);
                mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
                
                let audioChunks = [];
                let recordingTimeout;

                mediaRecorder.addEventListener('dataavailable', event => {
                    console.log('📼 Audio data available:', event.data.size, 'bytes');
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                });
                
                mediaRecorder.addEventListener('stop', () => {
                    console.log('⏹️ Recording stopped, chunks:', audioChunks.length);
                    if (audioChunks.length > 0 && ws.readyState === WebSocket.OPEN) {
                        const audioBlob = new Blob(audioChunks, { type: mimeType });
                        console.log('📤 Sending audio blob:', audioBlob.size, 'bytes');
                        ws.send(audioBlob);
                        audioChunks = [];
                    } else {
                        console.warn('⚠️ No audio to send or WebSocket closed');
                    }
                    
                    // Restart recording after a short delay
                    setTimeout(startRecording, 500);
                });

                mediaRecorder.addEventListener('error', (e) => {
                    console.error('🚨 MediaRecorder error:', e);
                });

                const startRecording = () => {
                    if (ws.readyState === WebSocket.OPEN && mediaRecorder.state === 'inactive') {
                        console.log('▶️ Starting recording...');
                        audioChunks = [];
                        try {
                            mediaRecorder.start();
                            // Stop after 4 seconds to create chunks
                            recordingTimeout = setTimeout(() => {
                                if (mediaRecorder.state === 'recording') {
                                    console.log('⏰ Stopping recording after 4 seconds');
                                    mediaRecorder.stop();
                                }
                            }, 4000);
                        } catch (e) {
                            console.error('🚨 Failed to start recording:', e);
                        }
                    }
                };
                
                // Start the recording loop
                startRecording();
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'audio') {
                    playAudio(data.data);
                } else if (data.type === 'session_code') {
                    sessionCode = data.code;
                    updateMessengerLinks();
                } else if (data.type === 'status') {
                    updateStatus(data.status);
                } else if (data.type === 'debug') {
                    console.error('🚨 Server debug:', data.message);
                    // Show debug message to user temporarily
                    const debugDiv = document.createElement('div');
                    debugDiv.style.cssText = 'position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;border-radius:5px;z-index:1000;max-width:300px;';
                    debugDiv.textContent = data.message;
                    document.body.appendChild(debugDiv);
                    setTimeout(() => document.body.removeChild(debugDiv), 5000);
                }
            };

            ws.onclose = () => {
                console.log("WebSocket connection closed.");
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
            };

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Microphone access is required to speak with the assistant.');
            conversationScreen.classList.add('hidden');
        }
    };

    const playAudio = async (base64_string) => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioData = atob(base64_string);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
            uint8Array[i] = audioData.charCodeAt(i);
        }

        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    };

    const updateMessengerLinks = () => {
        const message = encodeURIComponent(`My AUM Pass: ${sessionCode}`);
        whatsappLink.href = `https://wa.me/${AUM_WHATSAPP_NUMBER}?text=${message}`;
        // Add your Telegram username or group link
        telegramLink.href = `https://t.me/your_telegram_username?text=${message}`; 
    };

    const updateStatus = (status) => {
        const soundWave = document.querySelector('.sound-wave');
        const statusIndicator = document.getElementById('status-indicator');
        
        // Remove all status classes
        soundWave.classList.remove('listening', 'processing', 'speaking');
        
        // Add current status class
        soundWave.classList.add(status);
        
        // Update status text
        if (statusIndicator) {
            switch(status) {
                case 'listening':
                    statusIndicator.textContent = '🎤 Listening...';
                    break;
                case 'processing':
                    statusIndicator.textContent = '⏳ Processing...';
                    break;
                case 'speaking':
                    statusIndicator.textContent = '🗣️ Speaking...';
                    break;
            }
        }
    };
}); 