# Mindful Journal — Voice-First AI Companion

A private, voice-first AI journaling web app with **cross-device sync**.

## Features

- Email/password authentication (works on phone + desktop)
- Voice-to-text using Web Speech API
- AI companion (“The Mindful Listener”) – empathetic summary, mood tag, CBT question
- Real-time sync of journal entries via Firebase
- Dark / Light theme
- Text-to-Speech for AI responses
- Filter by mood or date

## Setup (Required – 5 minutes)

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → give it a name (e.g. `mindful-journal`)
3. Disable Google Analytics if you want (optional)
4. Click **Create project**

### 2. Register a Web app

1. On the project overview, click the **Web** icon (`</>`)
2. Nickname: `Mindful Journal`
3. Copy the `firebaseConfig` object

### 3. Enable Authentication

1. In the left menu go to **Build → Authentication**
2. Click **Get started**
3. Enable **Email/Password** → Save

### 4. Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Start in **test mode** (for now)
4. Choose a location close to you → Enable

### 5. Add your config to the app

Open `app.js` and replace the placeholder:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

with the real values from step 2.

### 6. (Recommended) Secure Firestore rules

After testing, go to **Firestore → Rules** and use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
  }
}
```

## Deploy

Upload all files to your GitHub repo and enable **GitHub Pages**  
(Settings → Pages → Deploy from branch `main`).

Your app will be live at:  
`https://rlccphil.github.io/mindful-journal/`

## Files

- `index.html`
- `styles.css`
- `app.js` ← put your Firebase config here
- `og-image.png`
- `README.md`

## Privacy Note

Entries are stored in **your** Firebase project. Only the logged-in user can read/write their own entries (once you apply the security rules above).
