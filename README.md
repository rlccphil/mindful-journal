# Mindful Journal — Voice-First AI Companion

A private, browser-based journaling web app designed for zero-distraction voice journaling with an empathetic AI companion.

## Features

### 1. Authentication & Privacy
- Simple username/password sign-up and log-in
- All data stored exclusively in the browser’s `localStorage`
- No server, no cloud, no external AI calls — private by design

### 2. Voice-to-Text Recording
- Prominent **Tap to Speak** microphone button
- Uses the free, built-in **Web Speech API** for real-time transcription
- Manual editing of the transcript before saving
- Works best in Chrome, Edge, Safari (desktop & mobile)

### 3. AI Companion — “The Mindful Listener”
When you save an entry, a local analysis engine generates:
- A warm, 2-sentence empathetic summary
- A dominant mood tag (Grateful, Hopeful, Calm, Anxious, Overwhelmed, Sad, Reflective, Energized)
- One targeted CBT / mindfulness follow-up question

### 4. Entry Feed & History
- Beautiful timeline of past entries
- Shows date, mood badge, original text, and AI response
- Filter by mood or date range
- Delete entries permanently
- Listen to any AI response with Text-to-Speech

### 5. Clean UI/UX
- Minimalist, calming design
- Dark / Light theme toggle
- Fully responsive (optimized for mobile)
- Text-to-Speech button for AI responses

## How to Run

Simply open `index.html` in a modern browser (Chrome recommended for best speech recognition support).

```bash
# From the project folder
open index.html
# or
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Privacy Note

Everything stays on your device. There are no network requests for AI analysis or data storage. The “AI” is a carefully crafted local keyword + template system designed to feel supportive while remaining fully offline.

## Browser Support

| Feature              | Chrome | Edge | Safari | Firefox |
|----------------------|--------|------|--------|---------|
| Speech Recognition   | ✅     | ✅   | ✅     | ❌      |
| Text-to-Speech       | ✅     | ✅   | ✅     | ✅      |
| localStorage         | ✅     | ✅   | ✅     | ✅      |

## License

MIT — feel free to adapt for personal or commercial use.
