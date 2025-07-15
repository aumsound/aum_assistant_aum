# AUM Assistant

A voice-based AI assistant that simulates an iPhone call interface to generate personalized pass codes for the AUM center.

## Project Structure

```
/aum-assistant/
├── main.py             # FastAPI backend with WebSocket support
├── requirements.txt    # Python dependencies
├── Procfile           # Railway deployment configuration
├── prompt.txt         # AI assistant instructions and conversation flow
├── .env               # Environment variables (you need to create this)
├── README.md          # This file
└── /static/
    ├── index.html     # Main UI with iPhone-style call interface
    ├── style.css      # Styling for the call interface
    ├── script.js      # Frontend logic and WebSocket communication
    └── ringtone.mp3   # iPhone ringtone (you need to download this)
```

## Setup Instructions

### 1. Create Missing Files

**Create `.env` file:**
```bash
echo 'OPENAI_API_KEY="sk-your-api-key-here"' > .env
```

**Download iPhone Ringtone:**
- Go to a site like zedge.net or search for "iPhone ringtone mp3 download"
- Download the classic iPhone ringtone
- Rename it to `ringtone.mp3` and place it in the `/static/` folder

### 2. Configuration

**Update WhatsApp Number:**
- Edit `static/script.js`
- Find line: `const AUM_WHATSAPP_NUMBER = "1234567890";`
- Replace with your actual WhatsApp number (include country code, no + or spaces)

**Update Telegram Link:**
- Edit `static/script.js`
- Find line: `telegramLink.href = \`https://t.me/your_telegram_username?text=\${message}\`;`
- Replace `your_telegram_username` with your actual Telegram username

### 3. Deploy to Railway

1. **Create GitHub Repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/aum-assistant.git
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Sign up at railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your aum-assistant repository
   - Add PostgreSQL database service
   - Set OPENAI_API_KEY environment variable in Railway dashboard

### 4. Features

- **UNESCO Popup:** Initial consent screen for digital wellness innovation
- **iPhone Call Interface:** Authentic call simulation with accept/decline buttons
- **Voice Conversation:** Real-time voice chat with AI assistant using OpenAI Whisper and TTS
- **Pass Code Generation:** Unique AUM pass codes for each session
- **Messenger Integration:** WhatsApp and Telegram links to save pass codes
- **Sound Visualization:** Animated sound waves during conversation
- **Database Logging:** Conversation history stored in PostgreSQL

### 5. Technologies Used

- **Backend:** FastAPI, WebSockets, OpenAI API, PostgreSQL
- **Frontend:** Vanilla JavaScript, CSS3 animations, Web Audio API
- **Deployment:** Railway, Git
- **AI Services:** GPT-4 Turbo, Whisper, TTS

## Usage

1. User sees UNESCO innovation popup
2. Accepts and enters call simulation
3. iPhone ringtone plays
4. User accepts call and grants microphone permission
5. Voice conversation with Max (AUM assistant)
6. Assistant asks qualifying questions
7. User receives unique AUM pass code
8. Can save pass code via WhatsApp/Telegram links

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string (auto-configured by Railway)

Ready to deploy! 🚀 