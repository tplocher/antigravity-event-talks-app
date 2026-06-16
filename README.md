# BigQuery Release Pulse 📡📊

An interactive, high-fidelity web dashboard built with **Python Flask** and **Vanilla JS/CSS** that dynamically parses, filters, and shares official Google BigQuery release notes.

[![Python Version](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/flask-3.1.2-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](#)

---

## 🌟 Key Features

- **Mixed-Note Granular Parsing**: Google structures its feed in bulk daily updates. BQ Pulse splits these bundles into itemized cards by type (e.g., `Feature`, `Issue`, `Change`, `Deprecation`) so you don't have to sift through bulk text.
- **Glassmorphic Dark Theme**: Sleek slate dashboard with database-themed glowing accents, hover states, and smooth element transitions.
- **Instant Search & Category Filters**: Search keywords through descriptions, dates, or headings instantly. Filter the timeline with one click using dedicated status badges.
- **Interactive X (Twitter) Composer**: Click **Tweet** on any card to open a custom sharing modal featuring a verified mockup card. The app auto-composes the tweet and crops the update content to perfectly fit X's **280-character limit** (calculating prefix text and URLs).
- **One-Click Clipboard copy**: Copy the direct release notes anchor link or sanitize HTML down to raw text for copy/pasting.
- **Micro-Interaction Toasts**: Custom built Toast notifications that slide in to confirm clipboard copies or refresh successes.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, Flask 3.1.2, XML ElementTree (Standard Library)
- **Frontend**: Plain Vanilla HTML5, JavaScript (ES6+), CSS3 (Modern custom variables, Flexbox/Grid, transitions, backdrops)
- **Fonts & Icons**: Outfit & Inter (Google Fonts), FontAwesome (Icon CDN)

---

## 📂 Project Structure

```text
├── app.py                # Flask server, Atom feed scraper & parser engine
├── templates/
│   └── index.html        # Glassmorphic single-page dashboard layout
├── static/
│   ├── css/
│   │   └── style.css     # CSS style sheet, variables, animations & layouts
│   └── js/
│       └── main.js       # App controller: Ajax fetch, search, filter, share logic
├── .gitignore            # Excludes caches, venvs, IDE configs, and OS junk
└── README.md             # Project documentation
```

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/tplocher/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Set Up Virtual Environment (Optional but Recommended)
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Flask
Since this application only relies on Python standard libraries for parsing, you only need Flask:
```bash
pip install Flask
```

### 4. Launch the Server
```bash
python3 app.py
```

By default, the application will boot on port `5001`. 
Open your browser and navigate to:
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🔍 Architecture & Data Flow

```text
[Google BigQuery Feed] 
       │ (XML Atom Feed)
       ▼
[Flask Backend (app.py)] 
       │ 1. Fetches XML raw feed
       │ 2. ElementTree extracts daily entries
       │ 3. Regex splits HTML content by <h3> headers
       │ 4. HTML stripped to plain-text for X sharing
       ▼ (Returns structured JSON)
[Client JavaScript (main.js)]
       │ 1. Triggers loading skeleton UI
       │ 2. Fetches and saves updates state
       │ 3. Renders interactive Timeline cards
       ▼ (User Interactions)
[UI View (index.html & style.css)]
       ├─► Search & Category badges filter lists
       ├─► Share modal calculates Tweet limits (280 chars)
       └─► Copy buttons write text/links to OS Clipboard
```

---

## 📜 License

Distributed under the MIT License. Feel free to use, modify, and distribute for personal or commercial projects.
