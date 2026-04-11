<div align="center">
  <img src="icons/icon128.png" alt="AI Meeting Copilot Logo" width="120" />

  # AI Meeting Copilot

  **Privacy-first, real-time meeting intelligence without the intrusive bots.**  
  *Never ask "what did I miss?" again.*

  [![Version](https://img.shields.io/badge/Version-1.0.0-black?style=for-the-badge&logo=googlechrome)](https://github.com/shouri123/Late-Meet)
  [![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Google_Meet-black?style=for-the-badge&logo=googlemeet)](https://meet.google.com)
</div>

<br />

## 🌟 The Problem
Joining a meeting late or losing focus for a moment leaves participants disconnected and scrambling for context. Existing AI note-takers add an obnoxious "Bot has joined" participant to your call, invade your team's privacy by storing transcripts on remote servers, and often generate massive, unreadable blocks of text instead of punchy, actionable insights.

## 💡 Our Solution
**AI Meeting Copilot** lives entirely natively within your browser. Without adding any disruptive bots to the call, it securely captures audio directly from the Chrome tab, leverages **OpenAI Whisper & GPT models** to process the conversation, and provides a stunning, high-performance side-panel dashboard.

We designed this with a **local-first philosophy**: all meeting data is processed locally using `chrome.storage.local` during the session, and you only need an OpenAI API key. No external databases. No user tracking.

---

## 🚀 Key Features

* **Invisible & Native:** Uses modern Chrome `tabCapture` and Offscreen APIs to intercept audio securely without adding bots to the participant list.
* **Local-First & Private:** All sessions are saved directly to your browser's local storage. You decide whether to save or discard data after a meeting.
* **Voice Activity Detection (VAD):** Smart audio recording skips prolonged silence, saving bandwidth and transcription costs.
* **Live Dashboards:** See real-time transcription tracking, topic identification, sentiment analysis, and action items.
* **Late-Joiner Briefings:** Instantly catches up late participants with targeted, private overlay briefings summarizing what they missed.
* **Bring Your Own Key (BYOK):** Full control over your data. Supply your own OpenAI API key for transcription and summarization tasks.
* **Premium Interface:** A visually striking deep-monochrome UI with glassmorphism effects, smooth animations, and zero clutter. 

---

## 🏗️ Architecture & How It Works

The extension is built natively on Manifest V3 using vanilla JavaScript to minimize bloat and maximize execution speed. 

Here is how the distinct parts of the extension interact:

1. **`background.js` (The Conductor):** Acts as the central state manager. It routes messages between the popup, the dashboard, the offscreen document, and the content script. It runs the main polling loop that drives the AI generation cycle and maintains the "Rolling Context Window" (the last 3 AI responses) to give the LLM continuity.
2. **`offscreen.html` & `offscreen.js` (The Audio Engine):** Bypasses Manifest V3 restrictions on DOM media APIs by running a hidden offscreen document. It uses `chrome.tabCapture` to get the raw audio stream from Google Meet. We run a `Web Audio API AnalyserNode` here to implement **Voice Activity Detection (VAD)**. Audio is only chunked (every 8 seconds) and sent for transcription if the volume exceeds our RMS threshold.
3. **`content.js` (The UI Injector):** Injects our custom UI elements (the floating Copilot button and the Briefing Overlay) directly into the Google Meet DOM. It isolates styles to prevent conflicts with Google's CSS and communicates exclusively via Chrome's messaging API.
4. **`utils/api.js` & `utils/prompts.js` (The AI Layer):** Handles the network requests to OpenAI. We use Whisper for transcription (with the last transcription passed as a prompt for continuity) and dynamic GPT models (like `gpt-4o-mini`) for processing the text into structured json summaries of Topics, Actions, and Insights.
5. **Session Management (`chrome.storage.local`):** No cloud databases. We use the browser's native local storage. At the end of a meeting, you are prompted to Save or Discard the meeting. Saved meetings viewable in the **Dashboard** side-panel, where they can be exported to Markdown or deleted.

---

## ⚙️ Installation & Setup (Developer Mode)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shouri123/Late-Meet.git
   cd Late-Meet
   ```
2. **Load into Chrome:**
   - Open Google Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the root directory of this extension.
3. **Configure the Copilot:**
   - Click the extension icon in the toolbar.
   - Enter your **OpenAI API Key** (required for transcription and intelligence).
   - *Tip:* You can also configure your preferred LLM (e.g., `gpt-4o-mini` or `gpt-4o`) directly in the extension options.
4. **Join a Meeting:**
   - Join any active Google Meet.
   - Click the floating **Start Copilot** button.
   - Open the full Side Panel dashboard to view live intelligence!

---

## 🛠 Technology Stack

* **Extension Architecture:** Manifest V3 compliant, Offscreen Documents, Service Workers.
* **Design System:** Custom Vanilla CSS, high-contrast monochrome aesthetic, SVG-native iconography.
* **Storage:** `chrome.storage.local` (Local-first, NO BAAS dependencies).
* **AI Pipeline:** OpenAI Whisper (Transcription via `verbose_json`) and dynamic GPT models (Intelligence/Summarization).

---

## 🗺 Roadmap

### Phase 1: Core Foundation ✅
- Native Google Meet integration without bot participants.
- Real-time offline audio capture via Chrome Offscreen APIs.
- Premium monochrome UI extension & side panel.
- BYOK integration for processing.

### Phase 2: Local & Privacy Overhaul ✅
- Strip Supabase/backend dependencies.
- Local-first session management and storage.
- VAD (Voice Activity Detection) implementation to reduce API cost.
- Intelligent rolling LLM context prompting.

### Phase 3: Platform Expansion 🔄 *(Planned)*
- **Offline/Native Support:** Transition to an NPM package / Terminal CLI to support desktop apps like Zoom and Microsoft Teams.
- **Smart Tracking:** Enhanced detection for action item assignee routing based on voice mapping.
- **On-the-fly Translation:** Bridging language gaps during international calls.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues). 

When contributing:
1. Emphasize vanilla, zero-dependency Javascript workflows where possible.
2. Adhere strictly to the monochromatic UI design system.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <br />
  <i>Built for high-performance teams who value focus.</i>
</div>
