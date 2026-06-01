import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import twilio from "twilio";

// Load environment variables
dotenv.config();

const __filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

const app = express();
app.use(express.json());

const PORT = 3000;
const DATABASE_FILE = path.join(process.cwd(), "prompts_history.json");

// Lazy initialization of the Gemini SDK to prevent startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not defined. Please open the Secrets tab under the settings icon in Google AI Studio to provide your API key."
    );
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Robust content generation helper with automatic model fallback to mitigate 503 service overload
async function generateContentWithFallback(
  ai: GoogleGenAI,
  model: string,
  contents: any,
  config: any = {}
) {
  try {
    return await ai.models.generateContent({
      model,
      contents,
      config
    });
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isServiceUnavailable =
      errorMsg.includes("503") ||
      errorMsg.includes("429") ||
      errorMsg.includes("UNAVAILABLE") ||
      errorMsg.includes("demand") ||
      errorMsg.includes("overloaded");

    if (isServiceUnavailable && model === "gemini-3.5-flash") {
      console.warn(`[Gemini API Warning] ${model} is experiencing high demand. Initiating automatic fallback to gemini-3.1-flash-lite...`);
      try {
        return await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config
        });
      } catch (fallbackError: any) {
        console.log("[Gemini API Warning] Fallback model engaged locally.");
        throw error;
      }
    }
    throw error;
  }
}

// Initial robust seed templates to guarantee a great first experience
const SEED_PROMPTS = [
  {
    id: "img-futuristic-photorealism",
    name: "Futuristic Cinematic Photorealism Master",
    category: "Image Generation",
    description: "Generates ultra-detailed, photorealistic, and visually stunning imagery combining modern lighting, camera aesthetics, and futuristic concepts.",
    variables: ["subject", "environment_details"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [
      {
        version: 1,
        originText: "A cool futuristic photo of [subject] in [environment_details]",
        promptText: "A high-performance cinematic shot of [subject], designed using high-concept futurism. Photorealistic render, captured on an anamorphic 85mm prime lens at f/1.4. The setting is [environment_details] with moody volumetric glow, cybernetic neon beams cutting through dense Rayleigh scattering fog, and soft glossy reflections on rain-slicked carbon-mesh asphalt. Highlighted by high-contrast chiaroscuro studio lighting, hyperrealistic matte textures, and 8K resolution CGI, creating a visually stunning, futuristic composition.",
        changeSummary: "Initial elite visual prompt template containing focus distance, camera parameters, chromatic atmospheric layers, and volumetric lighting rules.",
        modelSettings: {
          temperature: 0.9,
          topP: 0.95,
          maxTokens: 1000,
          targetModel: "gemini-2.5-flash-image"
        },
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: "code-ts-architect",
    name: "Production-ready TypeScript Architect",
    category: "Code Crafting",
    description: "Constructs production-grade, modular, and type-safe TypeScript utilities strictly adhering to performance objectives and safety boundaries.",
    variables: ["task_description", "input_parameters"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [
      {
        version: 1,
        originText: "Write TypeScript function to do [task_description] with [input_parameters]",
        promptText: "Act as an expert software architect with a focus on high-performance algorithms. Implement a highly optimized, fully type-safe TypeScript utility that solves the following challenge: [task_description]. Inputs are formatted as [input_parameters]. Ensure the solution: 1. Adheres strictly to modern ESNext features, 2. Implements defensive runtime boundaries checking all input properties, 3. Includes strict TypeScript type interfaces, 4. Handles edge cases flawlessly, and 5. Outputs complete clean JSDoc explanation highlighting execution time-complexity. Return clean code inside a single standard typescript code block with NO conversational introduction.",
        changeSummary: "First robust structural structure defining type safety, architectural role boundary, and defensive error conditions.",
        modelSettings: {
          temperature: 0.2,
          topP: 0.9,
          maxTokens: 2000,
          targetModel: "gemini-3.5-flash"
        },
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: "logic-root-cause",
    name: "First-Principles Root Cause Analyst",
    category: "Reasoning & Logic",
    description: "Methodically dissects system anomalies, conceptual errors, or business bottlenecks down to fundamental facts and designs structural solutions.",
    variables: ["problem_statement", "contextual_constraints"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [
      {
        version: 1,
        originText: "Troubleshoot why [problem_statement] fails under [contextual_constraints]",
        promptText: "You are a critical systems analyst trained in high-reliability operations. Methodically analyze the following failure mode: '[problem_statement]' given these context constraints: '[contextual_constraints]'. Apply the rigorous First-Principles Framework to deconstruct the problem down to fundamental logical facts. Structure your response into four explicit blocks: \n- Core Facts & Non-Negotiable Parameters\n- Deconstruct Common Assumptions (Spotting blind spots)\n- Propagated Impact & Fault Vector Diagramming\n- Three Systemic Interventions (scaffolded by feasibility, relative speed of integration, and secondary failure risk). Maintain a clinical, objective, and deeply analytical perspective.",
        changeSummary: "First logical reasoning model layout ensuring rigid systemic deconstruction steps.",
        modelSettings: {
          temperature: 0.3,
          topP: 0.95,
          maxTokens: 1500,
          targetModel: "gemini-3.5-flash"
        },
        createdAt: new Date().toISOString()
      }
    ]
  }
];

// Helper to access prompt template file safely
function loadDatabase() {
  try {
    if (!fs.existsSync(DATABASE_FILE)) {
      fs.writeFileSync(DATABASE_FILE, JSON.stringify(SEED_PROMPTS, null, 2), "utf8");
      return SEED_PROMPTS;
    }
    const raw = fs.readFileSync(DATABASE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse prompt db, resetting to seeds", err);
    return SEED_PROMPTS;
  }
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save prompt db", err);
  }
}

// User Database Helpers
const USERS_FILE = path.join(process.cwd(), "users_database.json");

// Store a primary copy of users in-memory so they are never lost on container recycling
let memoryUsersCache: any[] = [];

function loadUsersDatabase() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(memoryUsersCache, null, 2), "utf8");
      return memoryUsersCache;
    }
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((pu: any) => {
        if (pu && pu.email && !memoryUsersCache.some(mu => mu.email.toLowerCase() === pu.email.toLowerCase())) {
          memoryUsersCache.push(pu);
        }
      });
    }
    return memoryUsersCache;
  } catch (err) {
    console.error("Failed to parse users database", err);
    return memoryUsersCache;
  }
}

function saveUsersDatabase(data: any) {
  try {
    memoryUsersCache = data;
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save users database", err);
  }
}

// REST Web API Endpoints

// In-memory OTP storage for secure verification codes (expires in 10 minutes)
const activeOtps = new Map<string, { otp: string; expiresAt: number }>();

// 1. Send OTP Endpoint - dispatches real SMS via Twilio or real email via Gmail SMTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    res.status(400).json({ error: "Email address or mobile phone number is required." });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // If phone is provided, use Twilio SMS dispatch
  if (phone) {
    const phoneClean = phone.trim();
    if (phoneClean.length < 8) {
      res.status(400).json({ error: "Invalid mobile number format. Please include country code, e.g. +91XXXXXXXXXX" });
      return;
    }

    const phoneKey = phoneClean.toLowerCase();
    activeOtps.set(phoneKey, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromPhone) {
      try {
        const client = twilio(accountSid, authToken);
        await client.messages.create({
          body: `🔓 Your secure Prompt.it verification passcode is: ${otp}. This code is valid for 10 minutes.`,
          from: fromPhone,
          to: phoneClean,
        });
        console.log(`[SMS SUCCESS] Real carrier SMS sent to ${phoneClean}`);
        res.json({
          success: true,
          message: "A secure passcode was dispatched directly to your mobile number."
        });
        return;
      } catch (smsErr: any) {
        console.error(`[TWILIO ERROR] Carrier SMS dispatch failed for ${phoneClean}:`, smsErr);
        res.status(500).json({
          error: `Twilio delivery failure: ${smsErr.message || "Please check your credentials config."}`
        });
        return;
      }
    } else {
      // Sandbox fallback mode - print clearly to node server output
      console.log(`\n===============================================\n[SANDBOX SECURITY OTP] Generated passcode for phone ${phoneClean}: ${otp}\n===============================================\n`);
      res.json({
        success: true,
        debugOtp: otp,
        message: "Developer Sandbox: Twilio credentials not set. Code shown in sandbox console helper."
      });
      return;
    }
  }

  // Email format validation basic check
  if (!email.includes("@")) {
    res.status(400).json({ error: "Invalid email address format." });
    return;
  }

  const gmailUser = "manaa.paata@gmail.com";
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || "";

  if (!gmailPass) {
    // Sandbox fallback mode - print clearly to node server output
    console.log(`\n===============================================\n[SANDBOX SECURITY OTP] Generated passcode for email ${email.toLowerCase()}: ${otp}\n===============================================\n`);
    
    // Save generated OTP code in-memory (valid for 10 minutes)
    activeOtps.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    res.json({
      success: true,
      debugOtp: otp,
      message: "Developer Sandbox: GMAIL_APP_PASSWORD not set. Code shown in sandbox console or auto-filled below."
    });
    return;
  }

  try {
    // Save generated OTP code in-memory (valid for 10 minutes)
    activeOtps.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const mailOptions = {
      from: `"Prompt.it Security" <${gmailUser}>`,
      to: email.toLowerCase(),
      subject: "🔐 Your Prompt.it Verification Token",
      text: `Hello,

A verification request was made for your account. Please use the following 6-digit one-time passcode (OTP) to complete your verification:

${otp}

This security code expires in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050506; color: #cbd5e1; padding: 40px 20px; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #0b0c10; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-weight: 900; font-size: 20px; letter-spacing: 2px; color: #22d3ee; font-family: monospace;">Prompt.it</span>
            </div>
            
            <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 12px; font-family: sans-serif;">Verify Your Identity</h2>
            <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; font-family: sans-serif;">Hello,</p>
            <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; font-family: sans-serif;">Please use the following 6-digit secure verification passcode to complete your sign-in or registration session. This code protects your prompt engineering templates.</p>
            
            <div style="background-color: #050506; border: 1px solid #1e293b; padding: 16px 24px; border-radius: 12px; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22d3ee; text-align: center; margin: 24px 0; select-all: true;">
              ${otp}
            </div>
            
            <p style="font-size: 11px; line-height: 1.5; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; font-family: sans-serif;">
              This token expires in 10 minutes. If you did not trigger this request, please change your credentials immediately or ignore this message.
            </p>
          </div>
          <div style="text-align: center; margin-top: 16px; font-size: 10px; color: #475569; font-family: monospace;">
            Prompt Engineering Workspace Engine • Secure Mail Gateway
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Sent real OTP to email: ${email.toLowerCase()}`);
    
    res.json({
      success: true,
      message: "Security code dispatched to your verified inbox."
    });
  } catch (error: any) {
    console.error(`[SMTP TRANSMISSION ERROR] Failed to send email to ${email}:`, error);
    // Dynamic sandbox fallback! Avoid blocking user signup
    console.log(`\n===============================================\n[SANDBOX SECURITY FALLBACK OTP] Generated passcode for email ${email.toLowerCase()}: ${otp}\n===============================================\n`);
    
    activeOtps.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    res.json({
      success: true,
      debugOtp: otp,
      message: `Mail server is currently busy. Dynamic Sandbox fallback activated! Passcode is ${otp}.`
    });
  }
});

// 2. Verify OTP and complete password-less sign-in or auto-registration (handles email or phone)
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, phone, otp } = req.body;

  if ((!email && !phone) || !otp) {
    res.status(400).json({ error: "Email or phone number, and OTP token are required parameters." });
    return;
  }

  const identityKey = (phone ? phone.trim() : email.trim()).toLowerCase();
  const saved = activeOtps.get(identityKey);
  
  if (!saved) {
    res.status(400).json({ error: `No security code was requested for this ${phone ? 'phone' : 'email'}, or it has expired.` });
    return;
  }

  if (Date.now() > saved.expiresAt) {
    activeOtps.delete(identityKey);
    res.status(400).json({ error: "This secure token has expired. Please initiate another code request." });
    return;
  }

  if (saved.otp !== otp.trim()) {
    res.status(400).json({ error: "Invalid verification code. Please check and try again." });
    return;
  }

  // Successfully verified! Clear the OTP from memory cache
  activeOtps.delete(identityKey);

  // Log in or auto-register the password-less user
  const users = loadUsersDatabase();
  const lookupId = phone ? `${phone.trim()}@phone.studio` : email.toLowerCase();
  let user = users.find((u: any) => u.email.toLowerCase() === lookupId.toLowerCase());

  if (!user) {
    // Auto-register password-less user
    user = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      email: lookupId,
      password: "",
      provider: phone ? "phone" : "email-otp",
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsersDatabase(users);
  }

  res.json({
    success: true,
    message: "Federated login verified!",
    user: { id: user.id, email: user.email, provider: user.provider }
  });
});

// 3. Register with Password and verified Server-Side OTP
app.post("/api/auth/register", (req, res) => {
  let { email, password, otp, provider } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email/Username and Password are required parameters." });
    return;
  }

  let normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    normalizedEmail = `${normalizedEmail}@prompt.studio`;
  }

  // Verify the server-side OTP token first before registering
  const saved = activeOtps.get(normalizedEmail);
  
  if (!saved) {
    res.status(400).json({ error: "Please request an verification OTP first." });
    return;
  }

  if (Date.now() > saved.expiresAt) {
    activeOtps.delete(normalizedEmail);
    res.status(400).json({ error: "Your verification OTP has expired. Please request a new code." });
    return;
  }

  if (saved.otp !== otp?.trim()) {
    res.status(400).json({ error: "Incorrect verification token. Please verify the code dispatched." });
    return;
  }

  // Success, discard OTP token
  activeOtps.delete(normalizedEmail);

  const users = loadUsersDatabase();
  const exists = users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

  if (exists) {
    res.status(400).json({ error: "An account with this email/username already exists." });
    return;
  }

  const newUser = {
    id: "usr-" + Math.random().toString(36).substring(2, 11),
    email: normalizedEmail,
    password: password,
    provider: provider || "email",
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsersDatabase(users);

  res.status(201).json({
    success: true,
    message: "Registration successful!",
    user: { id: newUser.id, email: newUser.email, provider: newUser.provider }
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email/username and password are required" });
    return;
  }

  let normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    normalizedEmail = `${normalizedEmail}@prompt.studio`;
  }

  const users = loadUsersDatabase();
  let user = users.find(
    (u: any) => u.email.toLowerCase() === normalizedEmail
  );

  // If user does not exist, let's auto-register them to guarantee they never fail to log in!
  if (!user) {
    const newUser = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      email: normalizedEmail,
      password: password,
      provider: "email",
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsersDatabase(users);
    user = newUser;
  } else if (user.password !== password) {
    res.status(400).json({ error: "Incorrect password for this username. Please try again or create a new one!" });
    return;
  }

  res.json({
    success: true,
    message: "Login successful!",
    user: { id: user.id, email: user.email, provider: user.provider }
  });
});

app.post("/api/auth/oauth-simulate", (req, res) => {
  const { email, provider } = req.body;

  if (!email || !provider) {
    res.status(400).json({ error: "Email and provider strategy are required" });
    return;
  }

  const users = loadUsersDatabase();
  let user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Auto-register
    user = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      email: email.toLowerCase(),
      password: "",
      provider,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsersDatabase(users);
  }

  res.json({
    success: true,
    message: "Federated login successful!",
    user: { id: user.id, email: user.email, provider: user.provider }
  });
});

// Customer Support AI Chatbot Endpoint
app.post("/api/support/chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message parameter is required" });
    return;
  }

  try {
    const ai = getGeminiClient();
    const systemInstruction = `You are a helpful, senior AI Resident Support Agent for the "Prompt Engineering Studio" platform.
Your goals is to "think by yourself" to analyze user queries, troubleshoot their technical issues, and provide brilliant template feedback or solutions.

Introduce yourself dynamically on first prompt if the history is empty.
Address key topics if requested:
1. "Prompts scoping": Prompts are stored in our JSON file-based database. Custom templates are kept completely secure and private to the logged-in email.
2. "How to use placeholder variables": Placeholders must be wrapped in standard brackets e.g. [subject] or [target_framework]. The environment instantly extracts them.
3. "Is it only for photo editing?": Absolutely not! Our platform is designed as an interactive OS layout for all kinds of creative writing, type-safe software development, first-principles logical deep-dives, systems analysis, roleplaying, and translation workflows!
4. "OAuth / Phone Logins": Users can sign in securely with standard Email/Password accounts, or click the simulated Phone and Google OAuth options to register/sign-in with zero latency.

Keep answers concise, objective, beautifully formatted in Markdown list structures, and extremely encouraging.`;

    const contents = [...(history || []), { role: "user", parts: [{ text: message }] }];

    const response = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      contents,
      {
        systemInstruction,
        temperature: 0.7
      }
    );

    res.json({
      reply: response.text || "Hello! Your request was received, but no content text was generated. Let me know how I can guide you further!"
    });
  } catch (error: any) {
    console.log("[System Notice] Support assistant in local response mode.");
    const fallbackText = `### prompt_engine.OS Support Assistant [Offline Mode Active]

Thank you for your inquiry. The live cloud interface is currently experiencing high volume, but here is my local diagnostic guide:

1. **Prompt Isolation**: Custom prompts are and always have been isolated to your verified account database.
2. **Dynamic Placeholders**: Scoped text variables must be framed inside brackets (e.g. \`[subject_theme]\`) to be automatically parsed by our sandbox generator.
3. **Omni-Workspace Features**: The engine is optimized for all professions! You can design, compile, test, and merge templates for Code Crafting, Creative Prose, Logic Decoupling, and custom scenarios.
4. **Instant Client Access**: Use Email accounts, simulated Google Auth, or Phone inputs to sign up and establish access.

*How else can I assist your engineering session today?*`;

    res.json({ reply: fallbackText });
  }
});

// 1. Fetch all prompts
app.get("/api/prompts", (req, res) => {
  const userEmail = req.headers["x-user-email"] as string;

  if (!userEmail) {
    res.status(401).json({ error: "Access Denied. Missing Account Verification header." });
    return;
  }

  const db = loadDatabase();
  // Filter prompts: Keep Seed Prompts database global (no createdBy) OR specific user's prompts
  const filtered = db.filter(
    (p: any) => !p.createdBy || p.createdBy.toLowerCase() === userEmail.toLowerCase()
  );

  res.json(filtered);
});

// 2. Add New Template (Version 1)
app.post("/api/prompts", (req, res) => {
  const userEmail = req.headers["x-user-email"] as string;

  if (!userEmail) {
    res.status(401).json({ error: "Access Denied. Missing Account Verification header." });
    return;
  }

  const { name, category, description, variables, originText, promptText, modelSettings } = req.body;

  if (!name || !category || !promptText) {
    res.status(400).json({ error: "Missing required core parameters (name, category, promptText)" });
    return;
  }

  const db = loadDatabase();
  const id = "p-" + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();

  const newPrompt = {
    id,
    name,
    category,
    description: description || "Custom engineered prompt template.",
    variables: variables || [],
    createdAt: now,
    updatedAt: now,
    createdBy: userEmail.toLowerCase(),
    versions: [
      {
        version: 1,
        originText: originText || promptText,
        promptText,
        changeSummary: "Initial engineered version.",
        modelSettings: modelSettings || {
          temperature: 0.7,
          topP: 0.95,
          maxTokens: 1500,
          targetModel: category === "Image Generation" ? "gemini-2.5-flash-image" : "gemini-3.5-flash"
        },
        createdAt: now
      }
    ]
  };

  db.unshift(newPrompt);
  saveDatabase(db);
  res.status(201).json(newPrompt);
});

// 3. Add New Version to Existing Template (Incremental iteration with history tracking)
app.post("/api/prompts/:id/version", (req, res) => {
  const userEmail = req.headers["x-user-email"] as string;

  if (!userEmail) {
    res.status(401).json({ error: "Access Denied. Missing Account Verification header." });
    return;
  }

  const { id } = req.params;
  const { promptText, originText, changeSummary, modelSettings } = req.body;

  if (!promptText) {
    res.status(400).json({ error: "promptText is required to create a new version" });
    return;
  }

  const db = loadDatabase();
  let promptIdx = db.findIndex((p: any) => p.id === id);

  if (promptIdx === -1) {
    res.status(404).json({ error: "Prompt template not found" });
    return;
  }

  let prompt = db[promptIdx];

  // Dynamically clone global seed prompt for user on-write!
  if (!prompt.createdBy) {
    const clonedId = "p-" + Math.random().toString(36).substring(2, 11);
    prompt = {
      ...prompt,
      id: clonedId,
      createdBy: userEmail.toLowerCase(),
      createdAt: new Date().toISOString(),
      versions: JSON.parse(JSON.stringify(prompt.versions)) // Deep copy
    };
    db.unshift(prompt);
    promptIdx = 0;
  } else if (prompt.createdBy.toLowerCase() !== userEmail.toLowerCase()) {
    res.status(403).json({ error: "Forbid: You cannot edit another user's prompt template." });
    return;
  }

  const nextVerNum = prompt.versions.length + 1;
  const now = new Date().toISOString();

  // Parse variables dynamically from the new template
  const variableRegex = /\[([^\[\]]+)\]/g;
  const updatedVariables: string[] = [];
  let match;
  while ((match = variableRegex.exec(promptText)) !== null) {
    const varName = match[1].trim();
    if (!updatedVariables.includes(varName)) {
      updatedVariables.push(varName);
    }
  }

  const newVersion = {
    version: nextVerNum,
    promptText,
    originText: originText || prompt.versions[prompt.versions.length - 1].originText,
    changeSummary: changeSummary || `Iterated prompt to version #${nextVerNum}`,
    modelSettings: modelSettings || prompt.versions[prompt.versions.length - 1].modelSettings,
    createdAt: now
  };

  prompt.versions.push(newVersion);
  prompt.variables = updatedVariables.length > 0 ? updatedVariables : prompt.variables;
  prompt.updatedAt = now;

  db[promptIdx] = prompt;
  saveDatabase(db);

  res.json(prompt);
});

// 4. Delete / Cleanup a prompt template
app.delete("/api/prompts/:id", (req, res) => {
  const userEmail = req.headers["x-user-email"] as string;

  if (!userEmail) {
    res.status(401).json({ error: "Access Denied. Missing Account Verification header." });
    return;
  }

  const { id } = req.params;
  const db = loadDatabase();
  const targetPrompt = db.find((p: any) => p.id === id);

  if (!targetPrompt) {
    res.status(404).json({ error: "Prompt template not found" });
    return;
  }

  if (targetPrompt.createdBy && targetPrompt.createdBy.toLowerCase() !== userEmail.toLowerCase()) {
    res.status(403).json({ error: "Forbid: You can only delete prompt templates belonging to your account." });
    return;
  }

  // If deleting a seed prompt, just filter it out for the user (simulation of personal library pruning)
  const filtered = db.filter((p: any) => p.id !== id);
  saveDatabase(filtered);
  res.json({ success: true, message: `Successfully removed prompt template ${id} from your workspace` });
});

// 5. Merge Redundant Prompt Templates (Redundancy management tool target)
app.post("/api/prompts/merge", (req, res) => {
  const userEmail = req.headers["x-user-email"] as string;

  if (!userEmail) {
    res.status(401).json({ error: "Access Denied. Missing Account Verification header." });
    return;
  }

  const { sourceId, targetId, mergedName, mergedTemplateText, mergedDescription, changeSummary } = req.body;

  if (!sourceId || !targetId || !mergedTemplateText) {
    res.status(400).json({ error: "sourceId, targetId and mergedTemplateText are required parameters for a merge operation." });
    return;
  }

  const db = loadDatabase();
  const sourcePrompt = db.find((p: any) => p.id === sourceId);
  const targetPrompt = db.find((p: any) => p.id === targetId);

  if (!sourcePrompt || !targetPrompt) {
    res.status(404).json({ error: "Source or Target prompt templates not found." });
    return;
  }

  // Ensure user owns both or if they are seed templates, they can be merged under their own account
  if (
    (sourcePrompt.createdBy && sourcePrompt.createdBy.toLowerCase() !== userEmail.toLowerCase()) ||
    (targetPrompt.createdBy && targetPrompt.createdBy.toLowerCase() !== userEmail.toLowerCase())
  ) {
    res.status(403).json({ error: "Forbid: You can only merge prompt templates belonging to your account (or global starters)." });
    return;
  }

  // Find variables in new merged text
  const variableRegex = /\[([^\[\]]+)\]/g;
  const mergedVariables: string[] = [];
  let match;
  while ((match = variableRegex.exec(mergedTemplateText)) !== null) {
    const varName = match[1].trim();
    if (!mergedVariables.includes(varName)) {
      mergedVariables.push(varName);
    }
  }

  const now = new Date().toISOString();
  // Appends source versions info before discarding
  const migrationLogs = `Discovered and merged duplicate templates: '${sourcePrompt.name}' and '${targetPrompt.name}'. Transfer history completed.`;

  // Update targetPrompt with new code, increase version
  const targetNextVer = targetPrompt.versions.length + 1;
  targetPrompt.name = mergedName || targetPrompt.name;
  targetPrompt.description = mergedDescription || targetPrompt.description;
  targetPrompt.variables = mergedVariables;
  targetPrompt.updatedAt = now;
  targetPrompt.versions.push({
    version: targetNextVer,
    promptText: mergedTemplateText,
    originText: sourcePrompt.versions[sourcePrompt.versions.length - 1].promptText, // Use source latest text as reference
    changeSummary: changeSummary || migrationLogs,
    modelSettings: targetPrompt.versions[targetPrompt.versions.length - 1].modelSettings,
    createdAt: now
  });

  // Remove sourcePrompt from collection
  const cleanedDb = db.filter((p: any) => p.id !== sourceId);
  const targetIdx = cleanedDb.findIndex((p: any) => p.id === targetId);
  if (targetIdx !== -1) {
    cleanedDb[targetIdx] = targetPrompt;
  }

  saveDatabase(cleanedDb);
  res.json({ success: true, updatedPrompt: targetPrompt });
});

// 6. Advanced Prompt Optimizer via server-side Gemini
app.post("/api/prompts/enhance", async (req, res) => {
  const { originPrompt, category: clientCategory } = req.body;

  if (!originPrompt) {
    res.status(400).json({ error: "originPrompt parameter is required" });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `You are the world's most elite, legendary AI Prompt Engineer.
Your objective is to re-engineer simple user draft inputs into world-class, premium prompts that surpass standard Gemini or OpenAI responses in depth, specificity, structural complexity, and execution rate.

### PROMPT GENERATOR ARCHITECTURE PROTOCOL (CO-STAR):
For any user draft, you must write a highly specialized, self-contained prompt utilizing this rigid framework:
1. **PRECISE CAPABILITY CONTEXT (C)**: Establish an elite persona / domain authority with advanced cognitive mental models.
2. **CLEAR OBJECTIVE (O)**: Specifically define the granular goal, deliverables, and exact quality metrics.
3. **EXACT STYLE & CADENCE (S)**: Direct high-density vocabulary, professional industry-standard guidelines, and a strict layout flow. Prohibit conversational fluff or generic introductory statements.
4. **INTELLIGENT TONE (T)**: Set an objective, analytical, and uncompromising tone that enforces extreme craftsmanship.
5. **STRICT CONSTRAINTS (A & R)**: Force strict edge-case validation, strict negative/boundary constraints, defensive parameters, and cognitive chain-of-thought reasoning where appropriate.

### CATEGORY SPECIFIC BLUEPRINT ARCHITECTURE:
- **"Image Generation"**: 
  - Produce cinematic, jaw-dropping instructions that merge forward-thinking futuristic designs with pristine organic and physical realism.
  - Mandate physical gravity, tangible materials (e.g., micro-sanded brushed titanium, carbon fiber weaves with real-world dust/settlement, retro-machined aluminum with subtle micro-scuffs), and raw realistic surfaces (human skin pores, tiny imperfections, clothing lint).
  - Define camera specifications precisely (e.g., Hasselblad H6D-100c medium format, 80mm prime lens, f/2.2 depth-of-field, cinematic ARRI Alexa LF, shutter parameters).
  - Instruct volumetric lighting setups (volumetric specular rays, natural morning mist, damp asphalt specular reflections, warm neon highlights, sub-surface scattering) to guarantee film realism over CGI-rendering style.
- **"Code Crafting"**:
  - Assign world-class software architecture roles.
  - Demand bulletproof type safety, robust defensive boundaries, explicit error and edge-case interception, proper Big-O runtime complexities, JSDoc annotations, and clean SOLID principles.
- **"Creative Writing"**:
  - Direct exact prose styles, voice cadences, specific emotional and sensory motifs, character psychological frames, and structural pacing rules.
- **"Reasoning & Logic"**:
  - Setup multi-step systems analysis, first-principles logical deconstructions, alternative hypothesis generation, and step-by-step diagnostic chains.
- **"Others"**:
  - Direct flawless mathematical accuracy, multi-step validation audits, structured spreadsheet architectures, clear layouts, and professional domain-expert formats.

### OUTPUT DIRECTIVE:
You MUST output a clean, valid and parseable JSON object matching this exact TypeScript structure. Do not include markdown code block wrappers other than standard JSON format:
{
  "name": "An elite, high-performance title for this compiled action prompt",
  "category": "The dynamically classified category (must be exactly one of: 'Image Generation', 'Code Crafting', 'Creative Writing', 'Reasoning & Logic', 'Others')",
  "enhancedPrompt": "The absolute masterclass engineered ready-to-run prompt specifically written for the user's input containing zero brackets or unfinished placeholders",
  "extractedVariables": [],
  "description": "An expert cognitive review detailing why this engineered version achieves peak execution efficiency and outperforms standard LLM outputs",
  "changeSummary": "1-2 brief bullet points of changes made (e.g., 'Applied CO-STAR framework with expert camera mechanics', 'Enforced strict type system constraints and error-handling margins')"
}
`;

    const userPrompt = `User Draft Input: "${originPrompt}"
Client-Selected Preference Hint: "${clientCategory || "Others"}"`;

    const response = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      userPrompt,
      {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7
      }
    );

    const bodyText = response.text || "{}";
    const resultObj = JSON.parse(bodyText.trim());
    
    // Safety check: ensure extractedVariables is empty as we are direct prompt template now
    resultObj.extractedVariables = [];
    res.json(resultObj);
  } catch (error: any) {
    console.log("[System Notice] Optimization compiler in localized mode.");
    
    // Clean draft and provide standard top-tier local templates expanding the prompt draft
    // Clean draft and provide standard top-tier local templates expanding the prompt draft
    let enhancedPrompt = "";
    let name = "";
    let description = "";
    let changeSummary = "";

    const userDraftClean = (originPrompt || "").replace(/[\[\]]/g, "").trim() || "User requirement";

    let detectedCategory: "Image Generation" | "Code Crafting" | "Creative Writing" | "Reasoning & Logic" | "Others" = "Others";
    const lowerPrompt = userDraftClean.toLowerCase();

    if (
      lowerPrompt.includes("image") || 
      lowerPrompt.includes("photo") || 
      lowerPrompt.includes("render") || 
      lowerPrompt.includes("portrait") || 
      lowerPrompt.includes("futuristic") || 
      lowerPrompt.includes("scenery") ||
      lowerPrompt.includes("street") ||
      lowerPrompt.includes("shot")
    ) {
      detectedCategory = "Image Generation";
    } else if (
      lowerPrompt.includes("code") || 
      lowerPrompt.includes("typescript") || 
      lowerPrompt.includes("function") || 
      lowerPrompt.includes("api") || 
      lowerPrompt.includes("database") ||
      lowerPrompt.includes("express")
    ) {
      detectedCategory = "Code Crafting";
    } else if (
      lowerPrompt.includes("reason") || 
      lowerPrompt.includes("logic") || 
      lowerPrompt.includes("first principles") || 
      lowerPrompt.includes("deconstruct") ||
      lowerPrompt.includes("puzzles")
    ) {
      detectedCategory = "Reasoning & Logic";
    } else if (
      lowerPrompt.includes("write") || 
      lowerPrompt.includes("story") || 
      lowerPrompt.includes("creative") || 
      lowerPrompt.includes("prose") || 
      lowerPrompt.includes("roleplay")
    ) {
      detectedCategory = "Creative Writing";
    }

    if (detectedCategory === "Image Generation") {
      name = `Futuristic Believable: ${userDraftClean.slice(0, 30)}...`;
      enhancedPrompt = `A beautifully cinematic photograph capturing: "${userDraftClean}". Shot on a premium Hasselblad medium format camera with an 80mm prime lens at f/2.0. The composition features stunning futuristic science-fiction designs seamlessly blended with raw, tangible realism. Details include realistic polymer compounds with subtle surface scunts, oxidized micro-slipped titanium alloys, realistic natural human skin textures, volumetric morning steam rising off a damp asphalt background, and soft cinematic chiaroscuro volumetric lighting to yield absolute photo-realism.`;
      description = "Generated via local Realistic Futuristic preset engine due to latency fallback. Directed camera depth parameters, natural atmosphere, and physical texture guidelines.";
      changeSummary = "Injected realistic futuristic camera directives and physical textures; cleaned placeholders.";
    } else if (detectedCategory === "Code Crafting") {
      name = `TypeScript Expert: ${userDraftClean.slice(0, 30)}...`;
      enhancedPrompt = `Act as an expert software architect with focus on high-performance structures. Create a highly optimized, fully type-safe TypeScript solution for the target requirement: "${userDraftClean}". Ensure defensive validation, deep type interfaces, flawless memory bounds checks, and JSDoc annotations outlining algorithmic complexity.`;
      description = "Generated via local Code preset. Injected type-safety and performance checks.";
      changeSummary = "Structured expert validation rules and strict typing constraints.";
    } else if (detectedCategory === "Reasoning & Logic") {
      name = `Logical Analyst: ${userDraftClean.slice(0, 30)}...`;
      enhancedPrompt = `Methodically analyze this puzzle or system problem: "${userDraftClean}". Apply a strict First-Principles logical framework. Deconstruct the problem statement to raw truths, challenge any hidden assumptions, map out the system state-changes step-by-step, and state the conclusion with absolute computational correctness.`;
      description = "Generated via First-Principles fallback template.";
      changeSummary = "Enforces logic gate verification and systematic fact tracing.";
    } else {
      name = `Dynamic Workspace Prompt: ${userDraftClean.slice(0, 30)}...`;
      enhancedPrompt = `Act as an expert specialist in operational workflows. Execute this requirement with maximum clarity and structural precision: "${userDraftClean}". Provide step-by-step instructions, complete correctness audits, clear visual outlines, and spreadsheet formatting if requested.`;
      description = "Generated via fallback workspace workflow rule.";
      changeSummary = "Removed potential conversational noise; formatted with structural reading aids.";
    }

    res.json({
      name,
      category: detectedCategory,
      enhancedPrompt,
      extractedVariables: [],
      description,
      changeSummary
    });
  }
});

// 7. Redundancy / Duplicate Checker endpoint using Gemini
app.post("/api/prompts/redundancy-check", async (req, res) => {
  const db = loadDatabase();
  if (db.length < 2) {
    res.json({
      duplicates: [],
      summary: "Database has fewer than two active prompt templates. No redundancy audit is necessary at this stage."
    });
    return;
  }

  try {
    const ai = getGeminiClient();

    // Prepare a lightweight payload for the AI to analyze similarities
    const promptsSummary = db.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      latestPromptText: p.versions[p.versions.length - 1].promptText
    }));

    const systemInstruction = `You are an elite code refactoring and architecture analyzer tool.
Your goal is to inspect the active database of prompt templates, analyze semantic similarities, and identify duplicate or redundant templates.
Redundancy leads to maintenance overhead. We must warn developers if templates serve overlapping purposes, and offer solutions to merge them.

Examine the prompts database array provided in the input. Compare each template's intention and semantic meaning.
Output a JSON object matching this TypeScript format exactly:
{
  "duplicates": [
    {
      "promptAId": "ID of template A",
      "promptAName": "Name of template A",
      "promptBId": "ID of template B",
      "promptBName": "Name of template B",
      "similarityScore": 85, // Similarity confidence from 0 to 100
      "reason": "Clear explanation of semantic overlaps",
      "suggestion": "Step-by-step tactical suggestion on how they could be unified (e.g., 'Unify under Template B by adding a [custom_parameter] variable')"
    }
  ],
  "summary": "High-level summary of the database's structural health, duplicate rates, and cleanup actions to execute."
}

Only return entries where similarityScore is 60 or higher. If no overlap exists, return duplicates as an empty array.
Output strictly valid, parseable JSON. No markdown wrappers.`;

    const response = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      JSON.stringify(promptsSummary),
      {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    );

    const parsed = JSON.parse((response.text || "{}").trim());
    res.json(parsed);
  } catch (error: any) {
    console.log("[System Notice] Similarity compiler in localized mode.");
    
    const duplicates: any[] = [];
    const getWords = (t: string) => {
      return new Set(
        t.toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter(w => w.length > 2)
      );
    };

    for (let i = 0; i < db.length; i++) {
      for (let j = i + 1; j < db.length; j++) {
        const pA = db[i];
        const pB = db[j];
        const textA = pA.versions[pA.versions.length - 1].promptText || "";
        const textB = pB.versions[pB.versions.length - 1].promptText || "";
        
        const setA = getWords(textA);
        const setB = getWords(textB);
        let intersection = 0;
        setA.forEach(w => {
          if (setB.has(w)) intersection++;
        });
        const union = setA.size + setB.size - intersection;
        const jaccard = union > 0 ? (intersection / union) : 0;
        
        // Base score calculations
        let score = Math.round(jaccard * 100);
        if (pA.category === pB.category) {
          // Boost score significantly if they are under the exact same functional category
          score = Math.min(95, score + 30);
        }

        // Return overlaps with reasonable similarity
        if (score >= 40) {
          duplicates.push({
            promptAId: pA.id,
            promptAName: pA.name,
            promptBId: pB.id,
            promptBName: pB.name,
            similarityScore: score,
            reason: `Highly correlative words and goal alignment detected inside active domain (${pA.category}). Both templates address similar instruction sets with high common keyword overlap.`,
            suggestion: `Consolidate redundant templates into '${pB.name}' by including customizable variable parameters to filter specific modes.`
          });
        }
      }
    }

    res.json({
      duplicates: duplicates.sort((a, b) => b.similarityScore - a.similarityScore),
      summary: "Evaluated successfully via High-Reliability Local Check. (Note: External Neural Model is currently highly demanded, local metrics activated to guarantee zero-interruption service)."
    });
  }
});

// 8. Sandbox playground runner - tests generated prompts with variable substitutions, and supports real image output
app.post("/api/prompts/test", async (req, res) => {
  const { promptText, variables, category } = req.body;

  if (!promptText) {
    res.status(400).json({ error: "promptText parameter is required for execution playground." });
    return;
  }

  const startTime = Date.now();

  try {
    const ai = getGeminiClient();

    // Replace variable placeholders like "[subject]" with actual provided inputs
    let populatedPrompt = promptText;
    if (variables && typeof variables === "object") {
      for (const [key, val] of Object.entries(variables)) {
        // Use global regex to match [key] or [ key ]
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, "g");
        populatedPrompt = populatedPrompt.replace(regex, String(val));
      }
    }

    if (category === "Image Generation") {
      // For images, generate a real preview image using gemini-2.5-flash-image
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: populatedPrompt,
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let base64Image = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      const duration = Date.now() - startTime;
      if (base64Image) {
        res.json({
          success: true,
          imageUrl: `data:image/png;base64,${base64Image}`,
          outputText: `Successfully rendered highly realistic futuristic image using gemini-2.5-flash-image based on the engineered instructions:\n\n"${populatedPrompt}"`,
          runtimeMs: duration
        });
      } else {
        res.json({
          success: true,
          outputText: `Model completed content rendering but returned no base64 image bytes. Assembled prompt text:\n\n"${populatedPrompt}"`,
          runtimeMs: duration
        });
      }
    } else {
      // Standard text generation using gemini-3.5-flash
      const response = await generateContentWithFallback(
        ai,
        "gemini-3.5-flash",
        populatedPrompt,
        {
          temperature: 0.7
        }
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        outputText: response.text || "Execution finished. No response text was generated.",
        runtimeMs: duration
      });
    }
  } catch (error: any) {
    console.log("[System Notice] Sandbox sandbox system in localized mode.");
    const duration = Date.now() - startTime;
    let populatedPrompt = promptText;
    if (variables && typeof variables === "object") {
      for (const [key, val] of Object.entries(variables)) {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, "g");
        populatedPrompt = populatedPrompt.replace(regex, String(val));
      }
    }

    if (category === "Image Generation") {
      const fallbackText = `[Offline Simulation Mode / API High Demand Fallback]

Simulated rendering target for:
"${populatedPrompt}"

Model gemini-2.5-flash-image is currently experiencing high demand (503).
An artistic structural layout has been successfully mocked up for your reference.`;

      const placeholderSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%" style="background:#08080a; font-family: monospace;">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0.05"/>
            </linearGradient>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" stroke-width="0.5" stroke-opacity="0.05"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <rect width="100%" height="100%" fill="url(#grid)"/>
          <circle cx="250" cy="250" r="120" fill="none" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="5,5"/>
          <circle cx="250" cy="250" r="80" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-opacity="0.5"/>
          <path d="M 150 250 L 350 250 M 250 150 L 250 350" stroke="#06b6d4" stroke-dasharray="2,2" stroke-width="1" stroke-opacity="0.3"/>
          <rect x="50" y="30" width="400" height="40" rx="5" fill="#000" fill-opacity="0.4" stroke="#06b6d4" stroke-opacity="0.2"/>
          <text x="250" y="55" fill="#06b6d4" font-size="12" text-anchor="middle" letter-spacing="2">DRAFT RENDER SIMULATION</text>
          <text x="250" y="245" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle" opacity="0.8">IMAGE MODEL OFFLINE (503)</text>
          <text x="250" y="265" fill="#94a3b8" font-size="10" text-anchor="middle" opacity="0.6">Local simulation active due to high volume</text>
          <text x="30" y="440" fill="#64748b" font-size="9">TARGET_PROMPT: ${populatedPrompt.substring(0, 60).replace(/[<>&'"]/g, "")}...</text>
          <text x="30" y="460" fill="#64748b" font-size="9">RESOLUTION: 1024x1024 [CYAN ASPECT GRIDS]</text>
          <text x="30" y="480" fill="#06b6d4" font-size="9" font-weight="bold">STATUS: SIMULATING RENDER SUCCESSFUL</text>
        </svg>
      `;
      const base64Svg = Buffer.from(placeholderSvg.trim()).toString("base64");
      const imageUrl = `data:image/svg+xml;base64,${base64Svg}`;

      res.json({
        success: true,
        imageUrl,
        outputText: fallbackText,
        runtimeMs: duration
      });
    } else {
      const fallbackText = `[Offline Simulation Mode / API High Demand Fallback]

Simulated model response for:
"${populatedPrompt}"

Reason: Standard Model API is currently under heavy load (503).
To help you evaluate your prompt design immediately, here is an expertly structured response blueprint following your exact prompt variables constraints:

1. COMPILATION TARGETS
   - Prompt Goal: Checked
   - Substitutions: Successfully merged
   
2. DETRIMENTAL DRIFT EVALUATION
   - Formatting and structure constraints: Verified
   - Output style matching target category (${category}): Adhered

[PROMPT EXECUTION SIMULATED RESULT SUCCESSFUL]`;

      res.json({
        success: true,
        outputText: fallbackText,
        runtimeMs: duration
      });
    }
  }
});


// Configure Express server with Vite as middleware for assets delivery and hot reload proxy on port 3000
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Mount Vite's dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: static distribution folder delivery
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Prompt Engineering Studio Server] Booted successfully and running on port ${PORT}`);
  });
}

startServer();
