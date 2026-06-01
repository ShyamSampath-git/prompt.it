import React, { useState, useEffect } from "react";
import {
  Sparkles,
  History,
  GitCompare,
  Layers,
  Cpu,
  CheckCircle2,
  Wand2,
  Play,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Save,
  Info,
  Image,
  Video,
  Quote,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Check,
  Copy,
  ChevronRight,
  ChevronLeft,
  X,
  Sliders,
  Settings,
  AlertCircle,
  LogOut,
  Keyboard,
  ArrowUp,
  Sun,
  Moon,
  Plus
} from "lucide-react";
import { PromptTemplate, PromptVersion, RedundancyAnalysis, SandboxTestResponse } from "./types";
import PromptWizard from "./components/PromptWizard";

const IMAGE_PROMPTS = [
  "Imagine a futuristic cityscape with neon signs, cybernetic skyscrapers, flying vehicles, and heavy rain reflecting hologram streetlights.",
  "A cozy log cabin in the snow-covered Swiss Alps during sunset, with smoke coming from the chimney and a warm golden glow inside.",
  "A high-fidelity oil painting of an astronaut floating in a colorful cosmic nebula with swirling galaxies and stardust, 8k, detailed.",
  "A serene Japanese temple garden with blooming pink cherry blossoms, a quiet stone pathway across a koi pond, and soft volumetric morning fog.",
  "A majestic, crystalline dragon perched on a cliff under an emerald aurora borealis night sky, fantasy digital art.",
  "A microphotograph of a magical water drop resting on a golden leaf, reflecting an entire miniature enchanted forest inside.",
  "Unbelievably detailed steam-punk clockwork pocket watch resting on an old leather-bound spellbook, surrounded by soft warm brass gears.",
  "A surreal desert landscape with giant floating jellyfish in the dark violet sky, illuminated by two giant glowing crescent moons."
];

const VIDEO_PROMPTS = [
  "Cinematic drone shot soaring through a dense, foggy redwood pine forest as sunbeams pierce through the ancient towering trees.",
  "Slow-motion close up of a futuristic sports car tearing down a wet coastal highway, neon tail lights splashing rain behind it.",
  "A time-lapse of a bustling cyberpunk street market in downtown Neo-Tokyo, with vibrant holographic billboards and crowd flow.",
  "Stunning tracking shot of a majestic humpback whale breach-jumping out of a calm sparkling ocean during a golden hour sunset.",
  "An animated 3D tracking shot of a glowing potion bottle bubbling gently on a wizard's desk, casting magical light sparkles.",
  "High-speed macro footage of paint droplets of contrasting turquoise and orange colors swirling in clear water, creating colorful nebulae.",
  "A peaceful camera walk down a medieval cobblestone village street at night, with vintage iron lanterns flickering in gentle breeze.",
  "Epic hyper-lapse of storm clouds gathering over an active volcano, glowing rivers of lava slowly tracing down the slopes."
];

const QUOTE_PROMPTS = [
  "Generate an inspiring, deep quote about perseverance, human potential, and the beauty of continuous growth through life's trials.",
  "Compose a thought-provoking, philosophical quote about time, memory, and the imperceptible transition of seasons in our life.",
  "Create a comforting, poetic quote about quiet inner peace, gentle rainy mornings, and finding joy in the simplest modern moments.",
  "Draft a bold, motivating quote on innovation, paving your own path, and daring to build what others deem impossible.",
  "Formulate an elegant, zen-like quote about the power of silence, listening to the wind, and understanding the universe's understated patterns.",
  "Produce a beautiful, literary-style quote celebrating curiosity, reading books, and exploration beyond the edge of our comfort zones.",
  "Create a short, witty quote about artificial intelligence, human friendship, and the curious dance of carbon and silicon minds."
];

const getNewRandomPrompt = (current: string, pool: string[]): string => {
  const filtered = pool.filter(p => p !== current);
  if (filtered.length === 0) return pool[0];
  const randIdx = Math.floor(Math.random() * filtered.length);
  return filtered[randIdx];
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(() => {
    const saved = localStorage.getItem("prompt_os_user");
    const loginTime = localStorage.getItem("prompt_os_login_time");
    if (saved && loginTime) {
      const parsedTime = parseInt(loginTime, 10);
      if (!isNaN(parsedTime)) {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - parsedTime > thirtyDaysMs) {
          localStorage.removeItem("prompt_os_user");
          localStorage.removeItem("prompt_os_login_time");
          return null;
        }
      }
    }
    return saved ? JSON.parse(saved) : null;
  });

  const [usageHistory, setUsageHistory] = useState<{
    id: string;
    type: "auth" | "sandbox" | "save" | "version" | "merge" | "delete";
    title: string;
    detail: string;
    timestamp: string;
  }[]>(() => {
    const saved = localStorage.getItem("prompt_os_history");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "log-init-1",
        type: "auth",
        title: "Session Primed",
        detail: "Established core pipeline connections. Sharded structures online.",
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
      },
      {
        id: "log-init-2",
        type: "save",
        title: "Seed Repository Merged",
        detail: "Integrated default template profiles into workspace library.",
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("prompt_os_history", JSON.stringify(usageHistory));
  }, [usageHistory]);

  const addLog = (type: "auth" | "sandbox" | "save" | "version" | "merge" | "delete", title: string, detail: string) => {
    const newLog = {
      id: "log-" + Math.random().toString(36).substring(2, 11),
      type,
      title,
      detail,
      timestamp: new Date().toISOString()
    };
    setUsageHistory(prev => [newLog, ...prev]);
  };

  const [activeTab, setActiveTab] = useState<string>("templates");
  const [tabHistory, setTabHistory] = useState<string[]>(["templates"]);

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    setTabHistory(prev => {
      if (prev[prev.length - 1] === tabId) return prev;
      return [...prev, tabId];
    });
  };

  const handleGoBack = () => {
    if (activeTab === "templates") {
      // already on main screen (home page of application), no action
      return;
    }
    if (tabHistory.length > 1) {
      const newHistory = [...tabHistory];
      newHistory.pop(); // remove current tab
      const prevTab = newHistory[newHistory.length - 1] || "templates";
      setActiveTab(prevTab);
      setTabHistory(newHistory);
    } else {
      setActiveTab("templates");
      setTabHistory(["templates"]);
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isRedundancyModalOpen, setIsRedundancyModalOpen] = useState<boolean>(false);
  const [dashboardDraft, setDashboardDraft] = useState<string>("");
  const isDarkMode = true; // Statically lock to dark mode as requested by the user
  const toggleTheme = () => {};
  const [attachedImages, setAttachedImages] = useState<Array<{ name: string; url: string; size?: string }>>([]);
  const [wizardInitialDraft, setWizardInitialDraft] = useState<string>("");
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [variablesInput, setVariablesInput] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Sandbox execution state
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<SandboxTestResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Redundancy audit state
  const [redundancyData, setRedundancyData] = useState<RedundancyAnalysis>({ duplicates: [], summary: "" });
  const [isAuditing, setIsAuditing] = useState(false);
  const [mergeState, setMergeState] = useState<{
    isMerging: boolean;
    error: string | null;
  }>({ isMerging: false, error: null });

  // System loading state
  const [isLoading, setIsLoading] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Authentication Fields state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // OTP and OAuth simulation states
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [userEnteredOtp, setUserEnteredOtp] = useState<string>("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [showGoogleChooser, setShowGoogleChooser] = useState<boolean>(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(true);
  const draftTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isKeyboardOpen && draftTextareaRef.current) {
      draftTextareaRef.current.focus();
    }
  }, [isKeyboardOpen]);

  // Support Chatbot state
  const [supportMessages, setSupportMessages] = useState<{ role: "user" | "model"; parts: { text: string }[] }[]>([
    {
      role: "model",
      parts: [{ text: "Hello! Welcome to Prompt.it. I am your resident autonomous AI Support agent, ready to analyze, debug, and design brilliant instructions. What developer questions can I resolve for you today?" }]
    }
  ]);
  const [supportInput, setSupportInput] = useState("");
  const [isSupportTyping, setIsSupportTyping] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchPrompts();
      fetchRedundancy();
    }
  }, [currentUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and Password are required parameters.");
      return;
    }

    if (authMode === "register") {
      if (!otpSent) {
        setAuthLoading(true);
        setAuthError(null);
        try {
          const res = await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: authEmail.toLowerCase() })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to trigger security code transmission.");
          }
          setOtpSent(true);
          setAuthError(null);
          if (data.debugOtp) {
            setDebugOtp(data.debugOtp);
            setUserEnteredOtp(data.debugOtp);
            addLog("auth", "Registration OTP Transmitted (SIMULATED)", `Sandbox mode activated: Auto-filled simulated OTP "${data.debugOtp}" for ${authEmail.toLowerCase()}`);
          } else {
            setUserEnteredOtp("");
            addLog("auth", "Registration OTP Transmitted", `Real secure OTP emailed to registered email: ${authEmail.toLowerCase()}`);
          }
        } catch (err: any) {
          setAuthError(err.message || "Could not dispatch verification code.");
        } finally {
          setAuthLoading(false);
        }
        return;
      }
    }

    setAuthLoading(true);
    setAuthError(null);

    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    try {
      const payload: any = { email: authEmail.toLowerCase(), password: authPassword };
      if (authMode === "register") {
        payload.otp = userEnteredOtp;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication procedure failed.");
      }
      
      const userObj = { email: authEmail.toLowerCase() };
      setCurrentUser(userObj);
      localStorage.setItem("prompt_os_user", JSON.stringify(userObj));
      localStorage.setItem("prompt_os_login_time", Date.now().toString());
      addLog("auth", "Session Active", `Email session established: ${authEmail.toLowerCase()}`);
      
      // Reset OTP states
      setOtpSent(false);
      setOtpCode("");
      setUserEnteredOtp("");
    } catch (err: any) {
      setAuthError(err.message || "An error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthSimulate = async (provider: "google", customEmail?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const simulatedEmail = customEmail || "developer.expert@gmail.com";
      
      const res = await fetch("/api/auth/oauth-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: simulatedEmail, provider })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "OAuth Connection interrupted.");
      }
      
      const userObj = { email: simulatedEmail.toLowerCase() };
      setCurrentUser(userObj);
      localStorage.setItem("prompt_os_user", JSON.stringify(userObj));
      localStorage.setItem("prompt_os_login_time", Date.now().toString());
      addLog("auth", "SSO Token Linked", `Linked session via verified Google provider: "${simulatedEmail.toLowerCase()}"`);
    } catch (err: any) {
      setAuthError(err.message || "OAuth Connection interrupted.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("prompt_os_user");
    localStorage.removeItem("prompt_os_login_time");
    setPrompts([]);
    setSelectedPrompt(null);
    setActiveTab("templates");
    setTabHistory(["templates"]);
  };

  const sendSupportMessage = async (customText?: string) => {
    const textToSend = customText || supportInput;
    if (!textToSend.trim()) return;

    const query = textToSend;
    if (!customText) {
      setSupportInput("");
    }

    const updatedHistory = [...supportMessages, { role: "user" as const, parts: [{ text: query }] }];
    setSupportMessages(updatedHistory);
    setIsSupportTyping(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, history: supportMessages })
      });
      if (!res.ok) {
        throw new Error("Support link offline");
      }
      const data = await res.json();
      setSupportMessages(prev => [...prev, { role: "model" as const, parts: [{ text: data.reply }] }]);
    } catch (err) {
      console.error(err);
      setSupportMessages(prev => [
        ...prev,
        {
          role: "model" as const,
          parts: [{ text: `### prompt_engine.OS Resident Assistant [Fallback Mode] \n\nI am currently experiencing connection constraints while executing cloud reasoning, but direct your queries to: \n\n - **Formatting variable scopes**: Encase arguments inside \`[variable_name]\`. \n - **Template ownership**: Prompts are secure and fully scoped to your logged-in verified profile. \n - **Omni-work domains**: Explore Creative, Logic, Coding, and Language domains inside our workshop dashboard.` }]
        }
      ]);
    } finally {
      setIsSupportTyping(false);
    }
  };

  const fetchPrompts = async (selectId?: string) => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/prompts", {
        headers: { "x-user-email": currentUser.email }
      });
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
        if (data.length > 0) {
          // If selectId is passed, select it. If selectedPrompt is already set, find updated copy. Else keep null.
          const newSelected = selectId 
            ? data.find((p: any) => p.id === selectId) || data[0]
            : (selectedPrompt ? data.find((p: any) => p.id === selectedPrompt.id) || null : null);
          
          if (newSelected) {
            setSelectedPrompt(newSelected);
            setSelectedVersionIndex(newSelected.versions.length - 1); // Latest version
            initializeVariables(newSelected);
          } else {
            setSelectedPrompt(null);
          }
        } else {
          setSelectedPrompt(null);
        }
      }
    } catch (e) {
      console.error("Failed to load prompts", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRedundancy = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/prompts/redundancy-check", { 
        method: "POST",
        headers: { "x-user-email": currentUser.email }
      });
      if (res.ok) {
        const data = await res.json();
        setRedundancyData(data);
      }
    } catch (e) {
      console.error("Failed to audit redundancy metrics", e);
    }
  };

  const initializeVariables = (prompt: PromptTemplate) => {
    const defaultInputs: Record<string, string> = {};
    prompt.variables.forEach(v => {
      // Sample values to make visual testing satisfying and stun out of the box
      if (v.toLowerCase() === "subject") {
        defaultInputs[v] = prompt.category === "Image Generation" 
          ? "a cybernetic neon cat driving a high-speed motorcycle in Neo-Kyoto"
          : "customer signup service with authorization handles";
      } else if (v.toLowerCase().includes("environment") || v.toLowerCase().includes("context")) {
        defaultInputs[v] = prompt.category === "Image Generation"
          ? "heavy rain intersecting chromatic holographic street lights, cinematic volumetric fog, 8k resolution design"
          : "strict microservice constraints, high availability mode";
      } else if (v.toLowerCase() === "task_description") {
        defaultInputs[v] = "optimize a dynamic payment routing gateway";
      } else if (v.toLowerCase() === "input_parameters") {
        defaultInputs[v] = "{ amount: number, currency: string, userGeo: string }";
      } else {
        defaultInputs[v] = `[enter custom ${v}]`;
      }
    });
    setVariablesInput(defaultInputs);
    setTestResponse(null);
    setTestError(null);
  };

  const handleSelectPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setSelectedVersionIndex(prompt.versions.length - 1);
    initializeVariables(prompt);
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariablesInput(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const executeSandbox = async () => {
    if (!selectedPrompt) return;
    setIsTesting(true);
    setTestError(null);
    setTestResponse(null);

    const activeVersion = selectedPrompt.versions[selectedVersionIndex];

    try {
      const res = await fetch("/api/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: activeVersion.promptText,
          variables: variablesInput,
          category: selectedPrompt.category
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Sandbox run failed.");
      }

      const result = await res.json();
      setTestResponse(result);
      addLog("sandbox", "Sandbox Execution Run", `Executed substituted blueprint playground for: "${selectedPrompt.name}" (${selectedPrompt.category})`);
    } catch (err: any) {
      console.error(err);
      setTestError(err.message || "An unexpected error occurred while executing the sandbox.");
    } finally {
      setIsTesting(false);
    }
  };

  const triggerAudit = async () => {
    setIsAuditing(true);
    try {
      await fetchRedundancy();
    } finally {
      setIsAuditing(false);
    }
  };

  const executeMerge = async (duplicate: any) => {
    setMergeState({ isMerging: true, error: null });
    try {
      const sourceId = duplicate.promptAId;
      const targetId = duplicate.promptBId;

      // Find templates to build a beautiful combined template
      const sourcePrompt = prompts.find(p => p.id === sourceId);
      const targetPrompt = prompts.find(p => p.id === targetId);

      if (!sourcePrompt || !targetPrompt) {
        throw new Error("Could not find matching source or target templates in active store.");
      }

      const mergedName = `${targetPrompt.name} (Unified Unified-Engine)`;
      const mergedTemplateText = 
`// Unified Engineered Template
// Combined Overlapping Goals:
// - Overlap Source: ${sourcePrompt.name}
// - Overlap Target: ${targetPrompt.name}

${targetPrompt.versions[targetPrompt.versions.length - 1].promptText}

// Alternative Modifiers:
// Set [alternate_focus_mode] to true to inherit parameters from ${sourcePrompt.name}:
// ${sourcePrompt.versions[sourcePrompt.versions.length - 1].promptText}`;

      const res = await fetch("/api/prompts/merge", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser?.email || ""
        },
        body: JSON.stringify({
          sourceId,
          targetId,
          mergedName,
          mergedTemplateText,
          mergedDescription: `Consolidated hybrid suite resolving high semantic similarity of ${duplicate.similarityScore}%.`,
          changeSummary: `Hot-merged to eliminate prompt redundancy.`
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed merging overlapping nodes.");
      }

      // Success
      await fetchPrompts(targetId);
      await fetchRedundancy();
      addLog("merge", "Hot-Merged Templates", `Unified duplicate node "${sourcePrompt.name}" into optimized target node "${targetPrompt.name}"`);
    } catch (e: any) {
      console.error(e);
      setMergeState({ isMerging: false, error: e.message || "Merge action failed" });
    } finally {
      setMergeState({ isMerging: false, error: null });
    }
  };

  const handleDeleteTemplate = async (id: string, force: boolean = false) => {
    const targetPrompt = prompts.find(p => p.id === id);
    const targetName = targetPrompt ? targetPrompt.name : id;
    
    if (!force) {
      setDeletingId(id);
      return;
    }
    
    setDeletingId(null);
    try {
      const res = await fetch(`/api/prompts/${id}`, { 
        method: "DELETE",
        headers: {
          "x-user-email": currentUser?.email || ""
        }
      });
      if (res.ok) {
        addLog("delete", "Pruned Template", `Permanently removed template document: "${targetName}"`);
        
        // If the deleted items was selected, automatically select the next remaining one to avoid blank state.
        if (selectedPrompt?.id === id) {
          const remaining = prompts.filter(p => p.id !== id);
          if (remaining.length > 0) {
            setSelectedPrompt(remaining[0]);
            setSelectedVersionIndex(remaining[0].versions.length - 1);
            initializeVariables(remaining[0]);
          } else {
            setSelectedPrompt(null);
          }
        }
        
        await fetchPrompts();
        await fetchRedundancy();
      } else {
        const errorData = await res.json();
        // Fallback friendly logs or state error
        addLog("delete", "Prune Failure", `Could not delete prompt template: ${errorData.error || "Permission Denied"}`);
      }
    } catch (e: any) {
      console.error("Delete template failed", e);
      addLog("delete", "Prune Error", `System interaction error: ${e.message || "Failed to prune"}`);
    }
  };

  const handleAddPresetImage = (presetName: string, presetUrl: string) => {
    const isExist = attachedImages.find(img => img.name === presetName);
    if (isExist) return;
    const freshAttachment = {
      name: presetName,
      url: presetUrl,
      size: "Style Preset"
    };
    setAttachedImages(prev => [...prev, freshAttachment]);
    addLog("save", "Linked Style Preset", `Linked high-fidelity reference template "${presetName}" as prompt context.`);
  };

  const triggerCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText("Prompt copied!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getSubstitutedPrompt = () => {
    if (!selectedPrompt) return "";
    let promptText = selectedPrompt.versions[selectedVersionIndex].promptText;
    selectedPrompt.variables.forEach(v => {
      const substitutedValue = variablesInput[v] || `[${v}]`; // Fallback if empty
      promptText = promptText.split(`[${v}]`).join(substitutedValue);
    });
    return promptText;
  };

  // Helper calculation for global system metadata stats
  const totalCount = prompts.length;
  const totalVersions = prompts.reduce((sum, p) => sum + p.versions.length, 0);
  const duplicateCount = redundancyData.duplicates.length;

  if (!currentUser) {
    return (
      <div className="w-full min-h-screen bg-[#050506] text-slate-200 flex items-center justify-center font-sans relative select-none p-4">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-[radial-gradient(circle_at_50%_0%,_rgba(34,211,238,0.06)_0%,_transparent_55%)] pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#08080a]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md relative z-10 space-y-6 shadow-2xl">
          {/* Brand/Platform Icon */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-widest text-[#22d3ee] mt-4 font-serif italic flex items-center justify-center gap-1.5">
              <span>Prompt.it</span>
            </h1>
            <p className={`text-xs max-w-xs mx-auto leading-relaxed font-sans ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Unlock a full-stack advanced prompting suite. Account synchronization, template version tracking, and instant support are fully supported.
            </p>
          </div>

          {/* Mode Switch tabs */}
          <div className={`grid grid-cols-2 p-1 rounded-xl border text-xs text-center font-semibold ${
            isDarkMode ? "bg-black/40 border-white/5 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
          }`}>
            <button
              onClick={() => { setAuthMode("login"); setAuthError(null); setOtpSent(false); }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                authMode === "login" 
                  ? (isDarkMode ? "bg-gradient-to-r from-cyan-950 to-indigo-950 text-cyan-300 border border-cyan-500/20 shadow-xs" : "bg-white text-indigo-600 border border-slate-200 shadow-2xs font-bold") 
                  : (isDarkMode ? "hover:text-white" : "hover:text-slate-800")
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(null); setOtpSent(false); }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                authMode === "register" 
                  ? (isDarkMode ? "bg-gradient-to-r from-cyan-950 to-indigo-950 text-cyan-300 border border-cyan-500/20 shadow-xs" : "bg-white text-indigo-600 border border-slate-200 shadow-2xs font-bold") 
                  : (isDarkMode ? "hover:text-white" : "hover:text-slate-800")
              }`}
            >
              Register
            </button>
          </div>

          {/* Forms Section */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 font-mono text-xs text-left">
            {!otpSent ? (
              <>
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Email Address</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={`w-full text-xs p-3 rounded-xl focus:outline-hidden transition-all font-sans ${
                      isDarkMode 
                        ? "bg-black/60 border border-white/10 text-slate-200 focus:border-cyan-400" 
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-600 focus:bg-white"
                    }`}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Choose Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full text-xs p-3 rounded-xl focus:outline-hidden transition-all font-sans ${
                      isDarkMode 
                        ? "bg-black/60 border border-white/10 text-slate-200 focus:border-cyan-400" 
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-600 focus:bg-white"
                    }`}
                    required
                  />
                </div>
              </>
            ) : (
              <div className={`space-y-4 font-sans border p-4 rounded-xl ${
                isDarkMode ? "border-cyan-500/20 bg-cyan-950/15" : "border-indigo-500/20 bg-indigo-50/50"
              }`}>
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Secure Verification Gateway</span>
                  {debugOtp ? (
                    <div className="my-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2 text-center rounded-lg font-mono text-[9px] font-extrabold tracking-wider space-y-1">
                      <div className={isDarkMode ? "text-emerald-400" : "text-emerald-600"}>✓ Developer Sandbox Mode Auto-Filled Code:</div>
                      <div className="text-lg text-emerald-500 tracking-widest font-bold">{debugOtp}</div>
                    </div>
                  ) : (
                    <p className={`text-[11px] leading-relaxed font-sans ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                      🔐 A secure registration passcode has been dispatched to <strong className="text-cyan-400 font-sans">{authEmail}</strong>. Please check your email inbox (and spam folder) to retrieve and enter your 6-digit verification code below.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Enter registration OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={userEnteredOtp}
                    onChange={(e) => setUserEnteredOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit token"
                    className={`w-full text-center text-sm tracking-widest font-mono p-3 rounded-xl focus:outline-hidden ${
                      isDarkMode 
                        ? "bg-black/60 border border-white/10 text-slate-200 focus:border-cyan-400" 
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-indigo-600 focus:bg-white"
                    }`}
                    required
                  />
                </div>
              </div>
            )}

            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-[11px] text-red-100 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-sans">{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-11 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(34,211,238,0.2)] disabled:opacity-50 font-sans cursor-pointer mt-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronizing Secure Keys...</span>
                </>
              ) : (
                <span>
                  {authMode === "register" 
                    ? (otpSent ? "Verify OTP & Confirm Registration" : "Send Registration OTP") 
                    : "Establish Secure Session"}
                </span>
              )}
            </button>
          </form>

          {/* Quick-Disclaimer */}
          <div className="text-[10px] text-slate-500 leading-normal text-center font-mono max-w-xs mx-auto">
            Authorized session tokens are committed locally to browser keystores and scoped directly into JSON repository mirrors.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white transition-colors duration-300 ${
      isDarkMode ? "bg-[#050506] text-slate-200" : "bg-slate-50 text-slate-800"
    }`}>
      {/* Immersive Navigation Header */}
      <nav className={`h-14 border-b flex items-center justify-between px-6 backdrop-blur-md sticky top-0 z-50 select-none transition-all duration-300 ${
        isDarkMode ? "border-white/10 bg-black/40 text-slate-200" : "border-slate-200 bg-white/80 text-slate-800"
      }`}>
        <div className="flex items-center gap-3">
          {/* Go Back Arrow Button */}
          <button
            onClick={handleGoBack}
            className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
              activeTab === "templates"
                ? "border-transparent bg-transparent text-slate-700/60 " +
                  "hover:text-slate-700/60 cursor-default"
                : isDarkMode
                  ? "border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-cyan-400"
                  : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600"
            }`}
            title="Navigate to previous tab"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold tracking-wide text-sm text-[#22d3ee] font-serif italic">Prompt.it</span>
            </div>
          </div>
        </div>

        {/* Cleared Similarity Health stats on top right menu */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full h-full">

        {/* Tiny vertical docking trigger on far right when sidebar is collapsed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#08080a] hover:bg-slate-950 border-y border-l border-white/10 hover:border-cyan-500/40 text-cyan-400 p-2.5 rounded-l-2xl shadow-xl z-40 transition-all duration-300 flex flex-col items-center gap-3 group cursor-pointer"
            title="Open Sliding Menu"
          >
            <ChevronLeft className="w-4 h-4 animate-pulse text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-[9px] uppercase font-bold tracking-widest font-mono text-slate-500 [writing-mode:vertical-lr] my-1">
              OPEN WORKSPACES
            </span>
            <Sliders className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
          </button>
        )}

        {/* Floating Backdrop blur cover */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 transition-opacity duration-300" 
          />
        )}
        
        {/* Sliding floating Workspace sidebar drawer (aligned to far right, w-72) */}
        <div 
          className={`absolute top-0 bottom-0 right-0 w-72 border-l z-40 transform transition-transform duration-300 ease-out flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.85)] ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          } ${
            isDarkMode ? "bg-[#08080a] border-white/10" : "bg-white border-slate-200 shadow-xl"
          }`}
        >
          {/* USER PROFILE SECTION */}
          <div className={`p-5 border-b relative overflow-hidden group ${
            isDarkMode ? "border-white/10 bg-black/30 text-white" : "border-slate-200 bg-slate-50 text-slate-850"
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] uppercase tracking-widest text-cyan-500 font-mono block font-bold leading-none">DEVELOPER</span>
                  <span className={`text-xs font-bold block truncate mt-1 leading-none ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>{currentUser?.email}</span>
                </div>
              </div>

              {/* Close Drawer button inside menu (collapses rightward) */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={`p-1 rounded-md border cursor-pointer transition-colors ${
                  isDarkMode 
                    ? "bg-white/[0.02] hover:bg-white/10 border-white/5 hover:text-white text-slate-400" 
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
                title="Collapse sidebar menu"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className={`pt-3 border-t grid grid-cols-2 gap-2 text-center text-[10px] font-mono ${isDarkMode ? "border-white/5" : "border-slate-200"}`}>
              <div className={`p-1.5 rounded border ${isDarkMode ? "bg-white/[0.01] border-white/5" : "bg-white border-slate-150"}`}>
                <span className="text-slate-500 block text-[8px] uppercase">Total Templates</span>
                <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>{totalCount}</span>
              </div>
              <div className={`p-1.5 rounded border ${isDarkMode ? "bg-white/[0.01] border-white/5" : "bg-white border-slate-150"}`}>
                <span className="text-slate-500 block text-[8px] uppercase">Total Versions</span>
                <span className="text-cyan-500 font-bold">{totalVersions}</span>
              </div>
            </div>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="mt-3 w-full py-1.5 border border-red-950/40 bg-red-950/20 hover:bg-red-950 hover:text-white text-red-550 text-[10px] font-bold tracking-wider uppercase rounded transition-colors flex items-center justify-center gap-1.5 font-mono cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Terminate Session</span>
              </button>
            )}
          </div>

          {/* PERSISTENT SIDE NAVIGATION MENU */}
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            
            {/* QUICK ACTIONS (First Preference) */}
            <div>
              <span className="px-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2 font-mono">QUICK ACTIONS</span>
              <div className="space-y-1.5 font-mono text-[10px]">
                <button
                  onClick={() => {
                    changeTab("wizard");
                    setIsSidebarOpen(false);
                    addLog("save", "Drafting Pipeline Accessed", "Redirected to compiler workspace via quick action.");
                  }}
                  className={`w-full text-left px-3 py-2.5 border rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                    isDarkMode 
                      ? "bg-white/[0.01] border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/[0.02] text-slate-300 hover:text-cyan-300" 
                      : "bg-slate-50 border-slate-200 hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] text-slate-700 hover:text-indigo-600"
                  }`}
                >
                  <span>+ Compile New Prompt</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
                <button
                  onClick={async () => {
                    setIsSidebarOpen(false);
                    triggerAudit();
                    setIsRedundancyModalOpen(true);
                    addLog("merge", "Hot-Audit Processed", "Requested full repository duplicate scanning cycle via Quick Action.");
                  }}
                  className={`w-full text-left px-3 py-2.5 border rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                    isDarkMode 
                      ? "bg-white/[0.01] border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/[0.02] text-slate-300 hover:text-cyan-300" 
                      : "bg-slate-50 border-slate-200 hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] text-slate-700 hover:text-indigo-600"
                  }`}
                >
                  <span>⚡ Scan Redundant Sets</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
                <button
                  onClick={() => {
                    changeTab("support");
                    setIsSidebarOpen(false);
                    addLog("auth", "Support Agent Spawned", "Linked diagnostics agent chat terminal session.");
                  }}
                  className={`w-full text-left px-3 py-2.5 border rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                    isDarkMode 
                      ? "bg-white/[0.01] border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/[0.02] text-slate-300 hover:text-cyan-300" 
                      : "bg-slate-50 border-slate-200 hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] text-slate-700 hover:text-indigo-600"
                  }`}
                >
                  <span>☎ Ask Support Agent</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            </div>

            {/* CORE SUITE WORKSPACES (Second Preference, Directly Adjacent) */}
            <div className={`pt-2 border-t ${isDarkMode ? "border-white/5" : "border-slate-200"}`}>
              <span className="px-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-2 font-mono">CORE SUITE WORKSPACES</span>
              <div className="space-y-1 font-sans">
                {[
                  { id: "templates", label: "Prompt Library", icon: Layers, desc: "Explore database templates" },
                  { id: "wizard", label: "AI Developer Workshop", icon: Wand2, desc: "Refine drafts with Gemini" },
                  { id: "history", label: "Usage History", icon: History, desc: "Centralized activity logs" },
                  { id: "support", label: "AI Support Agent", icon: HelpCircle, desc: "Resolve issues with bot" },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        changeTab(tab.id);
                        setIsSidebarOpen(false);
                        if (tab.id === "templates") {
                          fetchPrompts();
                        }
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 flex items-start gap-3 border ${
                        isActive
                          ? (isDarkMode 
                              ? "bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.05)] font-bold" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-200/50 shadow-xs font-bold")
                          : (isDarkMode 
                              ? "text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]" 
                              : "text-slate-650 border-transparent hover:text-slate-900 hover:bg-slate-100")
                      } cursor-pointer`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold tracking-wide block">{tab.label}</span>
                        <span className="text-[10px] text-slate-500 block leading-normal mt-0.5 font-normal truncate">{tab.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* FOOTER METADATA STATUS */}
          <div className="p-4 border-t border-white/5 bg-black/40 font-mono text-[9px] text-slate-500 space-y-1 select-none">
            <div className="flex justify-between items-center">
              <span>PLATFORM TUNNEL:</span>
              <span className="text-emerald-400 font-bold">● ACTIVE</span>
            </div>
            <div className="flex justify-between items-center">
              <span>ENCORE CRYPTO:</span>
              <span className="text-cyan-400 font-bold">SHA-256</span>
            </div>
          </div>

        </div>

        {/* Ambient Top Glow Vector Effect */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-[radial-gradient(circle_at_50%_0%,_rgba(34,211,238,0.06)_0%,_transparent_60%)] pointer-events-none z-0"></div>

        {activeTab === "wizard" && (
          <div className="flex-1 p-6 overflow-y-auto z-10">
            <PromptWizard 
              currentUserEmail={currentUser?.email}
              onLogAction={addLog}
              initialDraft={wizardInitialDraft}
              onClearInitialDraft={() => setWizardInitialDraft("")}
              onSavePrompt={async (payload) => {
                // This custom save will write through api, fallback inside Wizard handles it nicely
                await fetchPrompts();
                changeTab("templates");
              }} 
              templates={prompts}
              onNavigateToTemplates={() => {
                fetchPrompts();
                changeTab("templates");
              }}
            />
          </div>
        )}

        {/* Floating Overlay Modal for Redundancy Guard */}
        {isRedundancyModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#08080a] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)] animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
                    <GitCompare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-widest font-mono uppercase">Redundancy Guard</h2>
                    <p className="text-[10px] text-slate-500 font-sans">Automated AI Prompt overlap scanner and optimization agent</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsRedundancyModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Close scanner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
                
                {/* Audit trigger section */}
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans text-left">
                  <div>
                    <h3 className="text-xs font-bold text-white">Trigger Live Repository Audit</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Scans embedding of templates to detect overlapping prompt rules.</p>
                  </div>
                  <button
                    onClick={() => triggerAudit()}
                    disabled={isAuditing}
                    className="p-2 px-4 border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 font-mono cursor-pointer"
                  >
                    {isAuditing && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                    <span>{isAuditing ? "Auditing Portfolio..." : "Run Scanner Audit"}</span>
                  </button>
                </div>

                {/* Audit statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/5 flex justify-between items-center text-left">
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 font-mono">Redundancy Status</span>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {duplicateCount > 0 ? `${duplicateCount} Overlaps Found` : "Healthy Portfolio"}
                      </p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${duplicateCount > 0 ? "bg-amber-400" : "bg-emerald-400"} shadow-md`}></div>
                  </div>
                  <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/5 text-left">
                    <span className="text-[9px] uppercase text-slate-500 font-mono">Active Templates</span>
                    <p className="text-xs font-mono font-bold text-white mt-0.5">{totalCount} Templates</p>
                  </div>
                  <div className="bg-[#0c0c0f] p-4 rounded-xl border border-white/5 text-left">
                    <span className="text-[9px] uppercase text-slate-500 font-mono">Total Version Updates</span>
                    <p className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{totalVersions} Versions</p>
                  </div>
                </div>

                {/* Overlaps listing */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono text-left">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Overlapping Prompt Analysis List
                  </h3>

                  {redundancyData.summary && (
                    <div className="text-[11px] bg-[#0c0c0f] border border-white/5 p-4 rounded-xl leading-relaxed text-slate-300 font-sans text-left">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1 font-mono text-[10px]">
                        <Info className="w-3.5 h-3.5" />
                        Systemic Portfolio Summary
                      </div>
                      {redundancyData.summary}
                    </div>
                  )}

                  {redundancyData.duplicates.length === 0 ? (
                    <div className="bg-black/20 border border-dashed border-white/10 rounded-xl p-10 text-center">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-75" />
                      <h4 className="text-xs font-semibold text-slate-300 mt-3">All Clear</h4>
                      <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1">
                        No template redundancies or conflicting instructions detected in your current workspace database. Keep building optimized templates!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {redundancyData.duplicates.map((dup, i) => (
                        <div key={i} className="bg-black/50 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all font-sans">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1 text-left">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">
                                  {dup.promptAName}
                                </span>
                                <span className="text-[10px] text-slate-500 lowercase font-mono">overlaps with</span>
                                <span className="text-xs font-bold text-cyan-400">
                                  {dup.promptBName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15">
                                  {dup.similarityScore}% Overlap
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 space-y-1">
                                <p><strong className="text-slate-300 font-semibold text-[10px]">Overlapping reason:</strong> {dup.reason}</p>
                                <p><strong className="text-cyan-400 font-semibold text-[10px]">Reconciliary Suggestion:</strong> {dup.suggestion}</p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <button
                                onClick={async () => {
                                  await executeMerge(dup);
                                  setIsRedundancyModalOpen(false); // Close modal and refresh on successful optimization
                                }}
                                disabled={mergeState.isMerging}
                                className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-cyan-950 to-indigo-950 border border-cyan-500/30 hover:border-cyan-400 hover:text-white text-cyan-300 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                {mergeState.isMerging ? (
                                  <span className="flex items-center gap-1.5 justify-center">
                                    <Loader2 className="w-3 animate-spin text-cyan-400" />
                                    <span>Merging...</span>
                                  </span>
                                ) : (
                                  <span>Optimize & Merge</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

              {/* Close footer bar */}
              <div className="p-3 bg-black/25 border-t border-white/5 text-right font-sans">
                <button
                  onClick={() => setIsRedundancyModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close Scanner Panel
                </button>
              </div>

            </div>
          </div>
        )}

        {/* USAGE HISTORY WORKSPACE TAB PANEL */}
        {activeTab === "history" && (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 z-10 max-w-5xl mx-auto w-full">
            <div className="bg-[#08080a] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-8 opacity-5">
                <History className="w-32 h-32 text-cyan-400" />
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">Usage Credentials & Historical Tracing Console</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-sans">
                    All pipeline executions, login handshakes, prompt designs, version iterations, and hot merges are captured in this persistent cryptographically trace-friendly ledger.
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => {
                        setUsageHistory([
                          {
                            id: "log-reset-" + Math.random().toString(),
                            type: "auth",
                            title: "Session History Reloaded",
                            detail: "Cleared runtime trace cache and restarted telemetry ledger.",
                            timestamp: new Date().toISOString()
                          }
                        ]);
                      }}
                      className="px-3.5 py-1.5 border border-red-950 bg-red-950/20 hover:bg-red-950 hover:text-red-300 text-red-400 text-[10px] font-mono uppercase font-bold tracking-wider rounded transition-colors cursor-pointer"
                    >
                      Clear Tracing Log
                    </button>
                    <button
                      onClick={() => {
                        const defaultSeeds = [
                          {
                            id: "log-seed-1",
                            type: "auth",
                            title: "Pipeline Core Secured",
                            detail: `Established developer email context for ${currentUser?.email || "shyamsampath510@gmail.com"}`,
                            timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
                          },
                          {
                            id: "log-seed-2",
                            type: "version",
                            title: "Seed Repository Unveiled",
                            detail: "Downloaded default visual realism parameters, API endpoints, and creative writing modules.",
                            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
                          },
                          {
                            id: "log-seed-3",
                            type: "sandbox",
                            title: "Pre-Flight Diagnostics Run",
                            detail: "Evaluated zero-configuration placeholder indices with template categories.",
                            timestamp: new Date(Date.now() - 3600000).toISOString()
                          }
                        ];
                        setUsageHistory(defaultSeeds);
                      }}
                      className="px-3.5 py-1.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 text-[10px] font-mono uppercase font-bold tracking-wider rounded transition-colors cursor-pointer"
                    >
                      Restore Ledger Seeds
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                <span className="text-[9px] uppercase text-slate-500 block">Total Logs</span>
                <p className="text-sm font-bold text-white mt-1">{usageHistory.length} logs</p>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                <span className="text-[9px] uppercase text-slate-500 block">Auth Sessions</span>
                <p className="text-sm font-bold text-cyan-400 mt-1">{usageHistory.filter(l => l.type === "auth").length} sessions</p>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                <span className="text-[9px] uppercase text-slate-500 block">Sandbox Submissions</span>
                <p className="text-sm font-bold text-indigo-400 mt-1">{usageHistory.filter(l => l.type === "sandbox").length} runs</p>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-white/10">
                <span className="text-[9px] uppercase text-slate-500 block">Version Changes</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">{usageHistory.filter(l => ["save", "version", "merge"].includes(l.type)).length} changes</p>
              </div>
            </div>

            {/* Render dynamic list */}
            <div className="bg-[#08080a] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-[#22d3ee] uppercase tracking-widest block font-mono">Activity History Logs</h3>
              
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-2 font-mono">
                {usageHistory.map((item) => {
                  let badgeColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/25";
                  if (item.type === "auth") badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/25";
                  if (item.type === "sandbox") badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/25";
                  if (item.type === "delete") badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/25";
                  if (item.type === "merge") badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/25";
                  if (item.type === "save") badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (item.type === "version") badgeColor = "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20";

                  return (
                    <div key={item.id} className="relative flex gap-4 pl-4 before:absolute before:left-[1px] before:top-2.5 before:bottom-0 before:w-px before:bg-white/5 last:before:hidden">
                      {/* Timeline dot identifier */}
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-[0_0_5px_rgba(34,211,238,0.8)]"></span>
                      
                      <div className="flex-1 bg-black/40 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border uppercase shrink-0 ${badgeColor}`}>
                              {item.type}
                            </span>
                            <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-sans">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* AI SUPPORT AGENT WORKSPACE TAB PANEL */}
        {activeTab === "support" && (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 z-10 max-w-5xl mx-auto w-full flex flex-col h-[calc(100vh-4rem)]">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
              <div className="absolute right-0 top-0 p-8 opacity-5">
                <HelpCircle className="w-32 h-32 text-cyan-400" />
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">Developer Support & AI Assistant</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-sans">
                    Have technical questions regarding variable placeholders, portfolio redundancies, version commits, or multi-domain outputs? Chat with our autonomous AI bot built to analyze queries and think of solutions.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick action prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Variable Placeholders", desc: "How to use placeholder variables?", query: "How do placeholder variables work in this system? Give examples." },
                { label: "Redundancy Guard Audits", desc: "How is prompt redundancy calculated?", query: "Explain how the Redundancy Guard uses AI to check for duplicate templates." },
                { label: "Domain Categorizations", desc: "What categories of prompts can I design?", query: "This prompt application is for all kinds of works. Show me examples of non-photo prompts, like Developer APIs, Creative Prose, and Reasoning." },
                { label: "Version Iterations History", desc: "How does template history tracking operate?", query: "How does the version history tracking and commit system store previous iterations of prompts?" }
              ].map((shortcut, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => sendSupportMessage(shortcut.query)}
                  className="p-3 text-left bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-950/20 rounded-xl transition-all cursor-pointer group"
                >
                  <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 block">{shortcut.label}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{shortcut.desc}</span>
                </button>
              ))}
            </div>

            {/* Conversation terminal feed */}
            <div className="flex-1 bg-black/60 border border-white/10 rounded-2xl p-5 flex flex-col overflow-hidden min-h-[350px]">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 font-mono text-xs text-left">
                {supportMessages.map((msg, mIdx) => (
                  <div key={mIdx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] text-slate-500 uppercase mb-1">
                      {msg.role === "user" ? "Terminal User" : "Resident AI Agent"}
                    </span>
                    <div className={`p-4 rounded-xl max-w-[85%] leading-relaxed whitespace-pre-wrap select-text border ${
                      msg.role === "user"
                        ? "bg-slate-900 border-white/10 text-white"
                        : "bg-cyan-950/25 border-cyan-800/40 text-slate-200"
                    }`}>
                      {msg.parts[0].text}
                    </div>
                  </div>
                ))}
                {isSupportTyping && (
                  <div className="flex items-center gap-2 text-cyan-400 text-xs animate-pulse font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>AI Assistant is compiling response...</span>
                  </div>
                )}
              </div>

              {/* Chat Input form container */}
              <div className="flex gap-2.5 border-t border-white/5 pt-3">
                <input
                  type="text"
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendSupportMessage();
                    }
                  }}
                  disabled={isSupportTyping}
                  placeholder="Type your design or troubleshooting support request here..."
                  className="flex-1 text-xs p-3 bg-slate-950 border border-white/10 rounded-xl text-slate-200 focus:outline-hidden focus:border-cyan-400 font-sans"
                />
                <button
                  onClick={() => sendSupportMessage()}
                  disabled={isSupportTyping || !supportInput.trim()}
                  className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold rounded-xl text-xs uppercase transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROMPT LIBRARY WORKSPACE TAB */}
        {activeTab === "templates" && (
          <>
            {/* LEFT BAR: List of Templates & Version History - ONLY SHOWN WHEN A PROMPT IS SELECTED */}
            {selectedPrompt && (
              <aside className="w-full lg:w-80 border-r border-white/10 bg-[#08080a] flex flex-col shrink-0 z-10 select-none">
                
                {/* Internal search/filter */}
                <div className="p-4 border-b border-white/10 bg-black/20">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Prompt Templates</span>
                  {isLoading ? (
                    <div className="h-10 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    </div>
                  ) : prompts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-1 italic">No templates. Draft one on the workshop tab!</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {prompts.map(p => {
                        const isSelected = selectedPrompt?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              // Only allow selecting if we aren't currently prompt-confirming a delete
                              if (deletingId !== p.id) {
                                handleSelectPrompt(p);
                              }
                            }}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-slate-900 border-cyan-500/30 text-white" 
                                : "bg-white/[0.02] border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-xs font-mono font-semibold truncate leading-tight block">
                                {p.name}
                              </span>
                              
                              {deletingId === p.id ? (
                                <div className="flex items-center gap-1 shrink-0 animate-fade-in">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTemplate(p.id, true);
                                    }}
                                    className="text-[9px] font-mono px-1.5 py-0.5 bg-red-950 border border-red-500/40 text-red-300 rounded cursor-pointer hover:bg-red-900 hover:text-white transition-all font-bold"
                                    title="Confirm deletion"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingId(null);
                                    }}
                                    className="text-[9px] font-mono px-1 py-0.5 bg-white/5 text-slate-400 rounded cursor-pointer hover:bg-white/15 hover:text-slate-200 transition-all"
                                    title="Cancel"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(p.id);
                                  }}
                                  className="text-slate-600 hover:text-red-400 p-0.5 rounded hover:bg-black/30 transition-colors shrink-0 cursor-pointer"
                                  title="Delete template"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-medium">
                              <span className="text-cyan-400/80 truncate max-w-[120px]">{p.category}</span>
                              <span>v{p.versions.length}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Version Iteration History Rail */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Commit History
                    </h3>
                    {selectedPrompt && (
                      <span className="text-[10px] font-mono text-slate-500">
                        ID: {selectedPrompt.id.substring(0, 8)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-px p-1.5">
                    {selectedPrompt ? (
                      selectedPrompt.versions.map((ver, idx) => {
                        const isVerSelected = selectedVersionIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedVersionIndex(idx)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all ${
                              isVerSelected
                                ? "bg-gradient-to-br from-cyan-950/40 to-indigo-950/40 border-cyan-500/30 text-white"
                                : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${isVerSelected ? "bg-cyan-900/50 text-cyan-300" : "bg-white/5 text-slate-500"}`}>
                                v{ver.version}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(ver.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 line-clamp-2 mt-1 leading-normal">
                              {ver.changeSummary || "Base revision generated."}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        Select a prompt template above to trace structural versions.
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            )}

            {/* CENTER WORKSPACE: Construction Playground Subdivisions */}
            <section className="flex-1 flex flex-col bg-[#0a0a0c] relative overflow-y-auto min-h-0 z-10 p-6 md:p-8 space-y-6">
              
              {selectedPrompt ? (
                <>
                  {/* Top: Selected Prompt Brief details */}
                  <div className="border-b border-white/5 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-cyan-500/10 text-cyan-400 uppercase border border-cyan-500/20">
                            {selectedPrompt.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Active Revision: v{selectedPrompt.versions[selectedVersionIndex].version}
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-white tracking-wide mt-1">
                          {selectedPrompt.name}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedPrompt.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => triggerCopy(selectedPrompt.versions[selectedVersionIndex].promptText)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 border border-white/10"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Raw Template</span>
                        </button>
                        {copiedText && (
                          <span className="text-[10px] text-emerald-400 font-mono animate-fade-in">
                            {copiedText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Splits: Active Prompt code display vs Sandbox Variables Substitution */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* Active Template Layout code */}
                    <div className="xl:col-span-7 space-y-4 text-left">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-mono">
                        <span className="flex items-center gap-1">
                          <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                          Live Substituted Generated Prompt
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Target Model: {selectedPrompt.versions[selectedVersionIndex].modelSettings.targetModel}
                        </span>
                      </div>

                      <div className="bg-slate-950 border border-white/10 rounded-2xl p-5 shadow-inner relative group select-text text-left">
                        <pre className="font-mono text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                          {getSubstitutedPrompt()}
                        </pre>
                        
                        <button
                          onClick={() => triggerCopy(getSubstitutedPrompt())}
                          className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] uppercase rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copy generated prompt to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>

                      {/* Original Simple prompt trace */}
                      <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-[11px]">
                        <span className="text-slate-500 font-semibold uppercase block mb-1 font-mono">Original simple human input draft was:</span>
                        <p className="italic text-slate-400 leading-relaxed">
                          "{selectedPrompt.versions[selectedVersionIndex].originText}"
                        </p>
                      </div>

                      {/* Performance notes */}
                      <div className="bg-gradient-to-r from-cyan-950/10 to-indigo-950/10 border border-cyan-500/10 rounded-xl p-4 flex items-start gap-3">
                        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-cyan-300">Variables Substituted Live</span>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            This panel displays the final processed prompt. Type values in the placeholders box on the right to inject content instantly, then click the **Copy** action.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Substitutions & Playground Controls right-rail inside playground tab */}
                    <div className="xl:col-span-5 space-y-6 bg-[#08080a]/60 border border-white/10 rounded-2xl p-5 backdrop-blur-xs text-left">
                      
                      {/* Form variables inputs section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                            Assemble Variables
                          </h3>
                          <span className="text-[10px] font-mono text-slate-500">
                            {selectedPrompt.variables.length} Placeholders Detected
                          </span>
                        </div>

                        {selectedPrompt.variables.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3 italic">
                            This is a constant prompt. No dynamic variables detected.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {selectedPrompt.variables.map(v => (
                              <div key={v} className="space-y-1">
                                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                                  [{v}]
                                </label>
                                <textarea
                                  value={variablesInput[v] || ""}
                                  onChange={(e) => handleVariableChange(v, e.target.value)}
                                  rows={2}
                                  placeholder={`Substitute text for placeholder [${v}]`}
                                  className="w-full text-xs p-2 bg-black/60 border border-white/10 rounded-lg text-slate-200 focus:outline-[#22d3ee] font-sans"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-between max-w-3xl mx-auto w-full px-4 py-8 md:py-12 text-center space-y-12 animate-fade-in z-10 select-text">
                  
                  <div className="my-auto space-y-10 w-full">
                    {/* Clean, elegant greeting */}
                    <div className="space-y-4">
                      <h1 className="text-4xl md:text-5.5xl font-black tracking-tight text-white font-display">
                        <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                          Hey, {currentUser?.email?.includes("shyamsampath510") ? "S. Sampath" : currentUser?.email?.split('@')[0] || "Developer"}.
                        </span>
                      </h1>
                      <p className="text-sm md:text-base font-medium text-slate-400 tracking-wide font-sans max-w-md mx-auto">
                        Your workspace is cleaned up and secure. Access your templates in the library, or use the interactive prompt keyboard tool.
                      </p>
                    </div>

                    {/* Gemini-Style Quick Suggestions or Browse Actions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                      {[
                        { 
                          title: "Image Creator", 
                          icon: Image,
                          desc: "Click to generate a different, dynamic random prompt for detailed image creation.",
                          type: "image"
                        },
                        { 
                          title: "Video Generator", 
                          icon: Video,
                          desc: "Click to compile a fresh, dynamic random prompt for cinematic video clips.",
                          type: "video"
                        },
                        { 
                          title: "Quote Generator", 
                          icon: Quote,
                          desc: "Click to produce a beautiful, dynamic random prompt for thought-provoking quotes.",
                          type: "quote"
                        }
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              let nextPrompt = "";
                              if (item.type === "image") {
                                nextPrompt = getNewRandomPrompt(dashboardDraft, IMAGE_PROMPTS);
                              } else if (item.type === "video") {
                                nextPrompt = getNewRandomPrompt(dashboardDraft, VIDEO_PROMPTS);
                              } else if (item.type === "quote") {
                                nextPrompt = getNewRandomPrompt(dashboardDraft, QUOTE_PROMPTS);
                              }
                              setDashboardDraft(nextPrompt);
                              setIsKeyboardOpen(true);
                              setTimeout(() => {
                                draftTextareaRef.current?.focus();
                              }, 50);
                            }}
                            className="bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/[0.02] p-4 rounded-xl cursor-pointer transition-all duration-300 group flex flex-col justify-between h-36"
                          >
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-3 my-2 font-normal">
                              {item.desc}
                            </p>
                            <div className="flex justify-end">
                              <span className="p-1 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300 transition-colors">
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Buttons row */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                        className={`px-5 py-2.5 border rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                          isKeyboardOpen 
                            ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]" 
                            : "bg-black/40 text-slate-300 border-white/10 hover:border-cyan-500/30 hover:text-white"
                        }`}
                      >
                        <Keyboard className="w-3.5 h-3.5 shrink-0" />
                        <span>{isKeyboardOpen ? "Hide Keyboard Input" : "Show Keyboard Input"}</span>
                      </button>

                      {prompts.length > 0 && (
                        <button
                          onClick={() => {
                            if (prompts.length > 0) {
                              handleSelectPrompt(prompts[0]);
                            }
                          }}
                          className="px-5 py-2.5 bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white hover:border-white/20 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Browse Stored Templates ({prompts.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Elegant keyboard input bar present at the bottom of the screen */}
                  {isKeyboardOpen && (
                    <div className="w-full animate-fade-in text-left mt-auto pt-4 border-t border-white/5">
                      
                      {/* Interactive Media Attachment Drawer inside Keyboard */}
                      <div className={`w-full border rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.85)] transition-all duration-300 ${
                        isDarkMode ? "bg-[#09090b] border-white/10 focus-within:border-cyan-500/50" : "bg-white border-slate-200 focus-within:border-indigo-500/50 shadow-md"
                      }`}>
                        
                        {/* Selected Images Thumbnail Slider (if any attached) */}
                        {attachedImages.length > 0 && (
                          <div className="mb-3.5 pb-2 border-b border-dashed border-slate-700/20 flex flex-wrap gap-2.5 items-center">
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 mr-1.5">Context References:</span>
                            {(attachedImages as Array<{ name: string; url: string; size?: string }>).map((img, i) => (
                              <div 
                                key={i} 
                                className={`flex items-center gap-1.5 p-1 pr-2 rounded-lg border text-[10px] font-mono group transition-all relative ${
                                  isDarkMode ? "bg-black/60 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700 shadow-2xs"
                                }`}
                              >
                                <img 
                                  src={img.url} 
                                  alt={img.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-5 h-5 rounded object-cover shadow-inner"
                                />
                                <span className="max-w-[110px] truncate font-semibold">{img.name}</span>
                                <span className="opacity-40 text-[8px]">({img.size})</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAttachedImages(prev => prev.filter((_, idx) => idx !== i));
                                  }}
                                  className="ml-1 text-slate-400 group-hover:text-red-500 cursor-pointer transition-colors p-0.5 rounded hover:bg-black/10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            
                            {/* Auto-Detail Optimization Callout button */}
                            <button
                              onClick={() => {
                                // Dynamic Enrichment logic based on mock items or uploaded image labels
                                const descriptor = (attachedImages as Array<{ name: string; url: string; size?: string }>).map((img, idx) => {
                                  const term = img.name.toLowerCase();
                                  if (term.includes("cyberpunk") || term.includes("hud")) {
                                    return "cinematic cyberpunk digital hud interface overlay with bright neon glowing teal wireframes, sleek abstract graphs, ambient console telemetry lines, volumetric high-contrast grid rendering";
                                  }
                                  if (term.includes("painting") || term.includes("oil")) {
                                    return "textured expressive impasto oil painting on linen, thick organic oil pigment brushstrokes, reminiscent of historic canvas artwork styles with warm side-lit studio atmosphere";
                                  }
                                  if (term.includes("light") || term.includes("studio")) {
                                    return "ultra-detailed studio profile photography, pristine golden key rim-lighting, dramatic shadow diffusion, fine volumetric floating dust particles list, 8k photographic purity definition";
                                  }
                                  return `hyper-detailed multi-sensory perspective referencing '${img.name}', balanced geometric architectural lines, professional focal sharpness, high clarity and vibrant organic color spectrum`;
                                }).join(", and ");

                                setDashboardDraft(prev => {
                                  const text = prev.trim();
                                  const suffix = `\n\n[Auto-Enriched Vision Instruction: Re-synthesize creative prompts to cleanly integrate the attached visuals - specifically embodying ${descriptor} to generate a highly detailed, clear, and stunning outcome]`;
                                  if (text.includes("Auto-Enriched Vision")) return text;
                                  return text ? text + suffix : suffix;
                                });
                                addLog("version", "Prompt Auto-Clarification Activated", "Transformed baseline draft into high-resolution vision-informed detailed prompt.");
                              }}
                              className="text-[9px] uppercase font-bold py-1 px-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs transition-colors cursor-pointer flex items-center gap-1 font-mono ml-auto"
                              title="Enrich the text template automatically with deep sensory and layout variables based on the active visual attachments"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Enrich & Clarify Prompt</span>
                            </button>
                          </div>
                        )}

                        {/* Search Input body */}
                        <div className="flex gap-3 items-start">
                          
                          {/* visual Plus trigger button for image attaching */}
                          <div className="relative shrink-0 mt-1">
                            <input 
                              type="file"
                              id="dashboard-image-upload"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                if (!e.target.files) return;
                                const files = Array.from(e.target.files);
                                files.forEach((file: File) => {
                                  const reader = new FileReader();
                                  reader.onload = (event: ProgressEvent<FileReader>) => {
                                    if (event.target?.result) {
                                      setAttachedImages(prev => [...prev, {
                                        name: file.name,
                                        url: event.target?.result as string,
                                        size: (file.size / 1024).toFixed(1) + " KB"
                                      }]);
                                      addLog("save", "Manual Image Attached", `Imported high-resolution image "${file.name}" for custom workspace modeling.`);
                                    }
                                  };
                                  reader.readAsDataURL(file as Blob);
                                });
                              }}
                            />
                            
                            <label
                              htmlFor="dashboard-image-upload"
                              className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                                isDarkMode 
                                  ? "bg-slate-900 border-white/10 text-slate-300 hover:border-cyan-500/40 hover:bg-black hover:text-cyan-400" 
                                  : "bg-slate-100 border-slate-300 text-slate-600 hover:border-indigo-500 hover:bg-white hover:text-indigo-600 shadow-2xs"
                              }`}
                              title="Attach visual blueprint files (JPG/PNG) to dynamically describe or optimize templates"
                            >
                              <Plus className="w-5 h-5" />
                            </label>
                          </div>

                          <textarea
                            ref={draftTextareaRef}
                            value={dashboardDraft}
                            onChange={(e) => setDashboardDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (dashboardDraft.trim()) {
                                  setWizardInitialDraft(dashboardDraft);
                                  setDashboardDraft("");
                                  setAttachedImages([]); // Clear attached images on submit
                                  changeTab("wizard");
                                  addLog("save", "Landing Prompt Pipeline Shared", "Transferred raw draft prompt into optimizing AI core.");
                                }
                              }
                            }}
                            placeholder="Type details to assemble your new prompt template or attach images..."
                            className={`flex-1 text-xs md:text-sm bg-transparent border-0 resize-none outline-hidden focus:outline-hidden ring-0 focus:ring-0 leading-relaxed font-sans ${
                              isDarkMode ? "text-slate-100 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"
                            }`}
                            rows={2}
                            autoFocus
                          />
                        </div>

                        {/* Presets & action options bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-700/10 mt-3">
                          
                          {/* Pre-installed visual templates suggestions click row */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block py-0.5">Quick Inspiration:</span>
                            {[
                              { label: "Cyberpunk HUD Reference", url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop" },
                              { label: "Oil Painting Texture Reference", url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=150&auto=format&fit=crop" },
                              { label: "Studio Key-Light Reference", url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=150&auto=format&fit=crop" }
                            ].map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleAddPresetImage(preset.label, preset.url)}
                                className={`text-[9px] font-mono px-2 py-0.5 border rounded-md transition-all cursor-pointer truncate max-w-[150px] ${
                                  isDarkMode
                                    ? "bg-slate-900 border-white/5 hover:border-cyan-500/20 hover:bg-black text-slate-400 hover:text-slate-200"
                                    : "bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white text-slate-500 hover:text-indigo-600"
                                }`}
                                title={`Click to attach a mock ${preset.label} thumbnail to enrich details`}
                              >
                                + {preset.label.split(" Reference")[0]}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 justify-end shrink-0">
                            <div className="hidden md:flex flex-col items-end text-right font-mono text-[9px] text-slate-400">
                              <span>Google Gemini 2.5 Active</span>
                              <span>Press Shift+Enter to break lines</span>
                            </div>

                            <button
                              onClick={() => {
                                if (dashboardDraft.trim()) {
                                  setWizardInitialDraft(dashboardDraft);
                                  setDashboardDraft("");
                                  setAttachedImages([]); // Clear attachments
                                  changeTab("wizard");
                                  addLog("save", "Landing Prompt Pipeline Shared", "Transferred raw draft prompt into optimizing AI core.");
                                }
                              }}
                              disabled={!dashboardDraft.trim()}
                              className="p-2 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title="Assemble Details"
                            >
                              <ArrowUp className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              )}

            </section>
          </>
        )}

      </main>

      {/* Immersive bottom status ribbon */}
      <footer className="h-8 bg-[#050506] border-t border-white/5 flex items-center justify-between px-6 shrink-0 relative z-40 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">Prompt Workspace Active</span>
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono tracking-widest hidden sm:block">
          PROMPT.IT v1.2.0
        </div>
      </footer>
    </div>
  );
}
