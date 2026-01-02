# Focus Gem (Chrome extension)

This is a minimal Chrome MV3 extension to help you focus while studying.

Features
- Start a focus session by writing your plan and duration (minutes).
- Set allowed sites (domains). The extension checks the active tab every N minutes and shows a notification if you're on a non-allowed site.
- Shows a short motivational quote when distracted. Optional Gemini key placeholder exists in options but is not implemented.

How to load in Chrome
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked" and choose this folder

Notes
- This is an offline-first prototype. Gemini API integration is left as a placeholder — to integrate, add network code in `background.js#getQuote` and store an API key in options.
- The extension uses chrome.alarms with a minimum polling interval of 5 minutes.

Next steps you might want me to implement
- Real Gemini integration to fetch dynamic quotes.
- More granular scheduling (check every 1 minute, shorter intervals while active).
- In-page detection (content scripts) to detect scrolling or inactivity.
