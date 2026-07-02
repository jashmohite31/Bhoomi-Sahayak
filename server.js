const dotenv = require('dotenv');
const envConfig = dotenv.config();
const parsedKey = envConfig.parsed ? envConfig.parsed.GEMINI_API_KEY : null;
const GEMINI_API_KEY = parsedKey || process.env.GEMINI_API_KEY;

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from the current directory
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
const DATABASE_FILE = path.join(__dirname, 'database.json');

// System prompt grounded in Indian property laws
const SYSTEM_PROMPT = `You are a qualified legal consultant on "Bhoomi Sahayak", a website that helps people in India figure out the right legal first steps and remedies for land and property disputes (including boundary/encroachment, inheritance/partition, tenant-landlord, builder/RERA).

Rules:
- Provide legally-grounded, practical guidance based on Indian laws.
- Ground your responses in specific statutes such as:
  * The Real Estate (Regulation and Development) Act, 2016 (RERA) for builder delays or project issues.
  * The Hindu Succession Act, 1956 (specifically Class I heirs, partition, intestate succession) and the Indian Succession Act, 1925 for inheritance.
  * The Specific Relief Act, 1963 (Section 5/6 for recovery of possession, Section 34 for declaration, Section 38 for permanent injunction) for boundary & encroachment.
  * State Rent Control Acts (e.g. Maharashtra Rent Control Act 1999) or the Model Tenancy Act for tenancy issues.
  * The Limitation Act, 1963 (for adverse possession/encroachment time limits).
- Point to the correct legal authority or forum (e.g. Tehsildar, Revenue Court, Rent Controller, RERA Authority, Civil Court, Lok Adalat).
- Always state clearly that this is general legal information for guidance, not a substitute for a personal lawyer, since exact procedures vary by state.
- Keep answers concise (under 150 words) and end with a suggested legal next action.
- Answer in the user's preferred language (English or Hindi). If the user asks in Hindi or if the preferred language is Hindi, you must respond strictly in Hindi.
- If the question is unrelated to land/property disputes, politely state that this assistant is scoped to Indian land dispute guidance only.`;

// In-memory active session token storage
const activeSessions = new Map();

// In-memory search rate limiter cache
const searchLimits = new Map();

// Helper to read database
function readDb() {
  try {
    if (!fs.existsSync(DATABASE_FILE)) {
      fs.writeFileSync(DATABASE_FILE, JSON.stringify({ users: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading DB:', err);
    return { users: {} };
  }
}

// Helper to write database
function writeDb(data) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Authentication Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing token.' });
  }

  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }

  // Update last active
  session.lastActive = new Date().toISOString();
  req.userId = session.userId;
  req.sessionInfo = session;
  next();
}

// ---------- Auth Endpoints ----------

// Mock sending OTP
app.post('/api/auth/otp/send', (req, res) => {
  const { aadhaar, name, mobile, isRegister } = req.body;
  if (!aadhaar || !mobile) {
    return res.status(400).json({ error: 'Missing Aadhaar or mobile number.' });
  }
  if (isRegister && !name) {
    return res.status(400).json({ error: 'Missing name for registration.' });
  }

  // Validate basic patterns
  if (aadhaar.length !== 12 || isNaN(aadhaar)) {
    return res.status(400).json({ error: 'Invalid Aadhaar. Must be exactly 12 digits.' });
  }
  if (mobile.length !== 10 || isNaN(mobile)) {
    return res.status(400).json({ error: 'Invalid mobile. Must be exactly 10 digits.' });
  }

  const db = readDb();
  if (!isRegister && !db.users[aadhaar]) {
    return res.status(400).json({ error: 'Aadhaar number not found in the Land Registry. Please Register first.' });
  }

  // Simulated OTP dispatch
  res.json({ success: true, message: 'OTP sent successfully to registered mobile.' });
});

// Verify OTP
app.post('/api/auth/otp/verify', (req, res) => {
  const { aadhaar, name, mobile, otp, isRegister } = req.body;
  if (!aadhaar || !mobile || !otp) {
    return res.status(400).json({ error: 'Missing credentials or OTP.' });
  }

  if (otp !== '123456') {
    return res.status(400).json({ error: 'Invalid OTP. Enter the test code: 123456' });
  }

  const db = readDb();
  const userId = aadhaar; // Secure partition by Aadhaar

  if (isRegister) {
    if (!name) {
      return res.status(400).json({ error: 'Name is required for registration.' });
    }
    if (db.users[userId]) {
      return res.status(400).json({ error: 'Aadhaar number is already registered in the Land Registry. Please sign in instead.' });
    }
    const nameParts = name.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Kumar';
    const seededTree = [
      { id: '1', name: name, relation: 'Self', avatar: 'male-adult', parentId: null },
      { id: '2', name: `Anil ${lastName}`, relation: 'Father', avatar: 'male-elder', parentId: null },
      { id: '3', name: `Surekha ${lastName}`, relation: 'Mother', avatar: 'female-elder', parentId: null },
      { id: '4', name: `Pooja ${lastName}`, relation: 'Spouse', avatar: 'female-adult', parentId: null },
      { id: '5', name: `Karan ${lastName}`, relation: 'Son', avatar: 'boy', parentId: '1' },
      { id: '6', name: `Riya ${lastName}`, relation: 'Daughter', avatar: 'girl', parentId: '1' }
    ];

    db.users[userId] = {
      name,
      aadhaar,
      mobile,
      landRecord: null,
      familyTree: seededTree,
      notifications: [
        { id: 1, type: 'warning', message: 'Adjoining plot owner filed a boundary survey request.', date: new Date().toISOString().slice(0, 10) },
        { id: 2, type: 'success', message: 'No unauthorized sales caveats or transaction blocks found on this Khasra.', date: new Date().toISOString().slice(0, 10) }
      ]
    };
    writeDb(db);
  } else {
    if (!db.users[userId]) {
      return res.status(400).json({ error: 'Aadhaar number not found in the Land Registry. Please register first.' });
    }
    // Auto-seed tree if user exists but has no familyTree (e.g. manually added to database.json)
    if (!db.users[userId].familyTree) {
      const nameParts = db.users[userId].name.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Kumar';
      db.users[userId].familyTree = [
        { id: '1', name: db.users[userId].name, relation: 'Self', avatar: 'male-adult', parentId: null },
        { id: '2', name: `Anil ${lastName}`, relation: 'Father', avatar: 'male-elder', parentId: null },
        { id: '3', name: `Surekha ${lastName}`, relation: 'Mother', avatar: 'female-elder', parentId: null },
        { id: '4', name: `Pooja ${lastName}`, relation: 'Spouse', avatar: 'female-adult', parentId: null },
        { id: '5', name: `Karan ${lastName}`, relation: 'Son', avatar: 'boy', parentId: '1' },
        { id: '6', name: `Riya ${lastName}`, relation: 'Daughter', avatar: 'girl', parentId: '1' }
      ];
      writeDb(db);
    }
  }

  const user = db.users[userId];

  // Generate Session Token
  const token = 'BHOOMI-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const session = {
    userId,
    name: user.name,
    sessionCreated: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    userAgent: req.headers['user-agent'] || 'Unknown Browser',
    ip: req.ip || '127.0.0.1'
  };

  activeSessions.set(token, session);

  res.json({
    success: true,
    token,
    user: {
      name: user.name,
      aadhaar: `XXXX-XXXX-${aadhaar.slice(-4)}`,
      mobile: user.mobile,
      landRecord: user.landRecord,
      familyTree: user.familyTree,
      notifications: user.notifications
    },
    session
  });
});

// ---------- Land Record Search Rate Limiter ----------
function rateLimitSearch(req, res, next) {
  const userId = req.userId;
  const now = Date.now();
  const timeWindowMs = 10000; // 10 seconds
  const maxAttempts = 5;

  if (!searchLimits.has(userId)) {
    searchLimits.set(userId, []);
  }

  const attempts = searchLimits.get(userId).filter(timestamp => now - timestamp < timeWindowMs);
  attempts.push(now);
  searchLimits.set(userId, attempts);

  if (attempts.length > maxAttempts) {
    return res.status(429).json({
      error: 'Too many search requests. Please wait 60 seconds before searching again.'
    });
  }
  next();
}

// ---------- Gated API Endpoints ----------

// Search/Fetch Land (Gated + Rate Limited)
app.post('/api/registry/search-land', requireAuth, rateLimitSearch, (req, res) => {
  const { state, district, taluka, village, surveyNo } = req.body;
  if (!state || !district || !taluka || !village || !surveyNo) {
    return res.status(400).json({ error: 'Missing land location details.' });
  }

  const db = readDb();
  const userId = req.userId;
  const user = db.users[userId];

  // Only allow fetching land records which are registered under their name
  if (!user.landRecord) {
    return res.status(404).json({ error: 'No registered land records found under your Aadhaar registration.' });
  }

  const registeredLand = user.landRecord;
  const isMatch = 
    registeredLand.taluka.toLowerCase().trim() === taluka.toLowerCase().trim() &&
    registeredLand.village.toLowerCase().trim() === village.toLowerCase().trim() &&
    registeredLand.surveyNo.toLowerCase().trim() === surveyNo.toLowerCase().trim();

  if (!isMatch) {
    return res.status(404).json({ 
      error: 'No data found.' 
    });
  }

  res.json({ success: true, landRecord: registeredLand });
});

// Save Registry (Gated)
app.post('/api/registry/save', requireAuth, (req, res) => {
  const { familyTree, landRecord } = req.body;
  const db = readDb();
  const userId = req.userId;

  if (familyTree !== undefined) {
    db.users[userId].familyTree = familyTree;
  }
  if (landRecord !== undefined) {
    db.users[userId].landRecord = landRecord;
  }

  writeDb(db);
  res.json({ success: true, message: 'Registry saved successfully.' });
});

// Load Registry Data (Gated)
app.get('/api/registry/load', requireAuth, (req, res) => {
  const db = readDb();
  const userId = req.userId;
  const user = db.users[userId];

  res.json({
    success: true,
    user: {
      name: user.name,
      aadhaar: `XXXX-XXXX-${user.aadhaar.slice(-4)}`,
      mobile: user.mobile,
      landRecord: user.landRecord,
      familyTree: user.familyTree,
      notifications: user.notifications
    },
    session: req.sessionInfo
  });
});

// Chat Endpoint (Gated)
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { message, language } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing "message" in request body.' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Server is missing GEMINI_API_KEY. Add it to your .env file.'
      });
    }

    // Force language instructions based on active selection
    let langInstruction = '';
    if (language === 'hi') {
      langInstruction = ' IMPORTANT: The user preferred language is Hindi. Translate and respond strictly in clean, readable Hindi.';
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: message
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT + langInstruction
            }
          ]
        },
        generationConfig: {
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      const errMsg = data.error?.message || 'Unknown upstream error';
      return res.status(502).json({ error: `Upstream AI request failed: ${errMsg}` });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    res.json({ answer });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Something went wrong handling the chat request.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Bhoomi Sahayak backend running on http://localhost:${PORT}`);
  console.log(`Active API Key Preview: ${GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 12) + '...' : 'None'}`);
});
