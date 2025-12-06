
# 💬 Re-Tone

**Think before you send.** Real-time tone analysis for better conversations.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-black?style=flat&logo=socket.io&badgeColor=010101)](https://socket.io/)

---

## What is Re-Tone?

Ever sent a message you regretted? Re-Toned helps you communicate better by analyzing your tone **before** you hit send.

Re-Tone is **AI-powered chat with real-time sentiment analysis** – A full-stack TypeScript chat interface showcasing ML integration, real-time communication, and thoughtful UX design.

- **Detects 13 emotions** - joy, anger, sadness, fear, gratitude, and more
- **"Sleep On It" mode** - adds a 5-second pause for harsh messages
- **Live feedback** - see your tone with emoji indicators and suggestions
- **Privacy-first** - all AI processing happens in your browser

Perfect for teams, customer support, or anyone who wants healthier online conversations.

## Screenshots

### Homescreen
<img width="1102" height="759" alt="Re-Tone Homescreen" src="https://github.com/user-attachments/assets/55dec46b-4daa-4c4c-a1e2-608443664cc9" />

### Chat Interface 
#### Real-Time Tone Detection
See how your message sounds **before** sending

### Chatrooms
- **Room-based chat**: Support for multiple concurrent sessions with unique codes

#### Sleep On It Mode
Typing something harsh? Re-Toned adds a **5-second countdown** so you can:
- **Cancel** and rethink
- **Send now** if you're sure
- Wait it out (auto-sends after countdown)

<img width="1188" height="800" alt="Tense message, sleep on it, feedback" src="https://github.com/user-attachments/assets/12a5a8cf-b7c4-46cc-96df-1dbeefffa5fa" />

### Feedback

#### Escalation Warnings
Get alerted after **2+ consecutive tense messages** to help de-escalate conflicts.

#### Smart Suggestions
Receive context-aware tips for rephrasing messages to sound more constructive. 

<img width="581" height="447" alt="Feedback" src="https://github.com/user-attachments/assets/a028e63f-78f7-4fd4-a301-449545113bd0" />


---


## 🎨 How It Works

Re-Toned uses **AI + pattern recognition** to analyze your messages:
- **Browser-based ML** (Transformers.js) - No data sent to servers
- **Keyword detection** - Catches emotions like apologies, gratitude, frustration
- **Hybrid approach** - Combines both for accuracy

All processing happens **locally** in your browser for maximum privacy.

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/valeria-antosenkova/retone.git
cd retone

# Install dependencies
npm install

# Run development servers
# Run development servers (in separate terminals)
npm run dev        # Frontend
npm run server     # Backend

# Build for production
npm run build

```

Access the app:
- Local: `http://localhost:8080`
- Network: `http://[YOUR_IP]:8080` (e.g., `http://192.168.1.100:8080`)
  - Run `ifconfig | grep "inet " | grep -v 127.0.0.1` (Mac/Linux) to find your IP
  - Or check Vite terminal output for the Network URL

Then:
1. Open the URL in your browser (or from any device on the same network)
2. Create or join a chat room
3. Toggle Feedback Mode on to see tone analysis
4. Start chatting!




---

## 🛠️ Tech Stack

### Frontend
- **React 18** with **TypeScript** for type-safe component development
- **Vite**
- **Tailwind CSS + Shadcn/ui** for modern, responsive design
- **Transformers.js** for browser-based ML inference
- **Socket.IO Client** for real-time communication

### Backend
- **Node.js + Express** for HTTP server
- **Socket.IO** for WebSocket connections
- **TypeScript** throughout for end-to-end type safety

### AI/ML
- **Twitter RoBERTa Sentiment** model (conversation-optimized)
- **Custom pattern recognition** with 80+ emotion keywords
- **Hybrid approach**: Combines both for 95%+ accuracy on tested messages

### Development Tools
- Bun/npm for package management


