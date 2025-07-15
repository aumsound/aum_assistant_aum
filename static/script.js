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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

            ws.onopen = () => {
                console.log("WebSocket connection established.");
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                mediaRecorder.addEventListener('dataavailable', event => {
                    if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        ws.send(event.data);
                    }
                });
                
                // Send audio in chunks every 250ms
                setInterval(() => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.requestData();
                    }
                }, 250);

                mediaRecorder.start();
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'audio') {
                    playAudio(data.data);
                } else if (data.type === 'session_code') {
                    sessionCode = data.code;
                    updateMessengerLinks();
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
}); 