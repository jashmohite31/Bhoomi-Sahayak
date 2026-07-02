# 🏛️ Bhoomi Sahayak (भूमि सहायक)

Bhoomi Sahayak is a secure, modern, government-style portal designed to help citizens navigate land and property disputes in India. By providing clear guidance, automated records fetching, partition share estimation under Class I heir laws, and a dedicated Indian Property Law AI assistant, the application bridges the gap between complex legal statutes and everyday landowners.

---

## 💡 Origin & Development

- **Conceptualized & Designed by**: **Jash Mohite** (User Idea, Flow Design & Features)
- **Developed & Coded with AI Collaboration**: Built utilizing **Claude** and **Google Antigravity** AI assistants to write secure backend services, modern layouts, dynamic SVG trees, and localized translation dictionaries.

---

## 🌟 Key Features

### 1. Government-Style Registry Portal (Sign In vs. Register)
- **Separated Flows**: A secure login modal separating registered sign-ins from new account registries.
- **Identity Gating**: Restricts access to sensitive components (Land Valuation, Alerts, Family Trees, AI Chat) until the user verifies their session.
- **SMS OTP Simulation**: Uses a test code (`123456`) to simulate official OTP verification processes.
- **Active Session Tracker**: Reads and displays client User-Agent, IP address, and connection timestamps inside the profile console.

### 2. Read-Only Succession & Legal Heir Tree
- **Seeded Hereditary Trees**: Automatically generates a verified 6-member Class I hereditary hierarchy (matching the registrant's last name) upon signup.
- **HSA 1956 Partition Calculator**: Automatically parses Class I heirs (Self, Spouse, Son, Daughter, Mother) and splits ownership shares dynamically (e.g. `1/5 share`).
- **Tehsildar Amendment Portal**: Since hereditary registers are official records, direct dashboard editing is disabled. Users must click **Request Succession / Heir Correction** to submit a formal correction petition (simulates uploads, triggers validation, and creates a pending Case ID added directly to the alerts feed).

### 3. Land Valuation & Satellite Mapper
- **Revenue Database Mapping**: Connects to a mock state Bhulekh registry with dynamic survey loading animations.
- **Interactive Circle Rate Valuer**: A custom slider to adjust acreage on the map and automatically compute the estimated market cost based on local Circle Rates.
- **High-Resolution Cadastral Map**: Shows boundary overlays on a localized satellite parcel layout.

### 4. Search Throttling & Cooldown Locks
- **Security Throttling**: Limits land fetches to a maximum of 5 attempts within a rolling 10-second window.
- **Lockout Timer**: If exceeded, the server returns a `429 Too Many Requests` state, triggering a visual **60-second cooldown timer overlay** on the search interface.

### 5. Indian Property Law AI Assistant
- **Gemini 1.5 Integration**: Uses the Google Gemini API to offer conversational assistance.
- **Statute Grounding**: The system prompt grounds Gemini strictly in Indian Property and Land codes (including *RERA 2016*, *Hindu Succession Act 1956*, *Specific Relief Act 1963*, and state *Land Revenue Acts*).
- **Multilingual Support**: Header language toggle seamlessly translates UI strings (English/Hindi) and alerts the AI model to respond strictly in the selected language.

### 6. Prototype Safeguards
- A highly visible, bilingual warning banner floats at the top of the browser to prevent users from typing real credentials and state that the app is an educational portfolio prototype.

---

## 🛠️ Tech Stack
- **Frontend**: Single-page application built with HTML5, CSS3 (Custom variables, glassmorphism), and Vanilla Javascript.
- **Backend**: Node.js, Express, and local file storage (`database.json`) for data persistence.
- **AI Integrations**: Gemini 1.5 Flash via native HTTP fetch.

---

## 🚀 Setup & Installation

### 1. Clone & Install Dependencies
First, clone the repository, navigate into the project directory, and install the Express dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template file to create your active configuration:
```bash
cp .env.example .env
```
Open `.env` in your editor and input your Google Gemini API Key:
```env
PORT=3000
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
```
*Note: Make sure `.env` is listed in your `.gitignore` to avoid exposing keys on public remotes.*

### 3. Launch the Server
Start the local server using npm:
```bash
npm start
```
The server will boot on `http://localhost:3000`.

### 4. Run the Client
Open [index.html](file:///index.html) directly in any modern browser (or serve it using a local static server). All client fetches are configured to hit `http://localhost:3000` automatically.

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/otp/send`: Generates and sends a dummy OTP to a mobile number.
- `POST /api/auth/otp/verify`: Validates OTP (`123456`), checks user registry status, seeds default family tree on registration, and returns a session token.

### Registry
- `GET /api/registry/load`: Validates the bearer session token and returns active profile details.
- `POST /api/registry/search-land`: Throttled route to query local Bhulekh land coordinates.
- `POST /api/registry/save`: Syncs current family and land records back to the database.

### AI Assistant
- `POST /api/chat`: Proxies user prompts to the Gemini API, injected with the legal system prompt and current language configuration.

---

## 👤 Seeded Dummy Logins for Testing

To test the portal's gated features, session tracking, and unique satellite maps without registering a new account, use any of these pre-seeded dummy identities during **Sign In**:

| Name | Aadhaar Number (12 digits) | Mobile Number (10 digits) | Land Location Details (Pre-filled & Registered) | Circle Rate (sq yd) | Area (Acres) |
|---|---|---|---|---|---|
| **Jash Mohite** | `956854125896` | `8528558555` | Gujarat -> Daskroi -> Jetalpur (Survey: `89-A`) | ₹3,500 | 2.7 |
| **Ramesh Sharma** | `111111111111` | `9876543211` | Maharashtra -> Haveli -> Wagholi (Survey: `45/A`) | ₹4,500 | 2.5 |
| **Rajesh Verma** | `222222222222` | `9876543212` | Karnataka -> Bangalore South -> Begur (Survey: `102`) | ₹5,200 | 1.2 |
| **Amit Patel** | `333333333333` | `9876543213` | Maharashtra -> Daskroi -> Wagholi (Survey: `45/A`) | ₹4,500 | 1.8 |
| **Priya Das** | `444444444444` | `9876543214` | West Bengal -> Barasat -> Bhatra (Survey: `204`) | ₹2,500 | 0.8 |

*Note: For all logins, enter simulated OTP **`123456`** when prompted to complete verification.*

---

## ⚖️ Legal Disclaimer

This repository is built as a personal portfolio project. All land lookup coordinates, satellite survey marks, circle rates, and OTP authorizations are simulated for demonstration purposes. It has no government affiliation.
