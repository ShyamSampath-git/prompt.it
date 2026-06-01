import React, { useState } from "react";
import { Sparkles, ArrowRight, Save, Wand2, Info, Loader2, CheckCircle2, ListFilter, Sliders, AlertCircle, Copy, Check } from "lucide-react";
import { PromptTemplate } from "../types";

interface PromptWizardProps {
  onSavePrompt: (promptData: {
    name: string;
    category: PromptTemplate["category"];
    description: string;
    variables: string[];
    originText: string;
    promptText: string;
    modelSettings: {
      temperature: number;
      topP: number;
      maxTokens: number;
      targetModel: string;
    };
  }) => void;
  templates: PromptTemplate[];
  onNavigateToTemplates: () => void;
  currentUserEmail?: string;
  onLogAction?: (type: "auth" | "sandbox" | "save" | "version" | "merge" | "delete", title: string, detail: string) => void;
  initialDraft?: string;
  onClearInitialDraft?: () => void;
}

export default function PromptWizard({ onSavePrompt, templates, onNavigateToTemplates, currentUserEmail, onLogAction, initialDraft = "", onClearInitialDraft }: PromptWizardProps) {
  const [draft, setDraft] = React.useState(initialDraft);

  React.useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      onClearInitialDraft?.();
    }
  }, [initialDraft, onClearInitialDraft]);
  const [category, setCategory] = useState<PromptTemplate["category"]>("Image Generation");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enhancement Results State
  const [enhancedData, setEnhancedData] = useState<{
    name: string;
    enhancedPrompt: string;
    extractedVariables: string[];
    description: string;
    changeSummary: string;
  } | null>(null);

  // Settings State
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(1500);
  const [isSaving, setIsSaving] = useState(false);

  const [saveOption, setSaveOption] = useState<"new" | "existing">("new");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [changeSummaryNotes, setChangeSummaryNotes] = useState("");

  const [copied, setCopied] = useState(false);

  const handleEnhance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    setIsEnhancing(true);
    setError(null);
    setEnhancedData(null);

    try {
      const res = await fetch("/api/prompts/enhance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUserEmail || ""
        },
        body: JSON.stringify({ originPrompt: draft, category })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Failed to optimize prompt.");
      }

      const data = await res.json();
      setEnhancedData(data);
      setCustomName(data.name || "");
      setCustomDescription(data.description || "");
      setChangeSummaryNotes(data.changeSummary || "Refined instructions for greater visual / logical output.");

      const activeCat = data.category || category;
      setCategory(activeCat);

      onLogAction?.("version", "Compiled AI Blueprint", `Optimized draft instructions for: "${data.name || "Custom Design"}" (${activeCat})`);

      // Set default target temperatures based on domain
      if (activeCat === "Code Crafting") {
        setTemperature(0.2);
        setMaxTokens(2000);
      } else if (activeCat === "Reasoning & Logic") {
        setTemperature(0.3);
        setMaxTokens(1500);
      } else {
        setTemperature(0.85);
        setMaxTokens(1200);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during prompt design.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!enhancedData) return;
    setIsSaving(true);

    try {
      const modelSettings = {
        temperature,
        topP: 0.95,
        maxTokens,
        targetModel: category === "Image Generation" ? "gemini-2.5-flash-image" : "gemini-3.5-flash"
      };

      if (saveOption === "new") {
        const finalName = customName || enhancedData.name;
        // Create new template directly
        const res = await fetch("/api/prompts", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": currentUserEmail || ""
          },
          body: JSON.stringify({
            name: finalName,
            category,
            description: customDescription || enhancedData.description,
            variables: enhancedData.extractedVariables,
            originText: draft,
            promptText: enhancedData.enhancedPrompt,
            modelSettings
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save template.");
        }
        
        onLogAction?.("save", "Initialized Node Shard", `Registered standalone blueprint module: "${finalName}" under domain ${category}`);
      } else {
        // Save as another version of an existing template
        if (!selectedTemplateId) {
          alert("Please select an existing template to update.");
          setIsSaving(false);
          return;
        }

        const res = await fetch(`/api/prompts/${selectedTemplateId}/version`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": currentUserEmail || ""
          },
          body: JSON.stringify({
            promptText: enhancedData.enhancedPrompt,
            originText: draft,
            changeSummary: changeSummaryNotes,
            modelSettings
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to append iteration.");
        }
        
        const targetName = templates.find(t => t.id === selectedTemplateId)?.name || "Target Template";
        onLogAction?.("version", "Committed Code Revision", `Appended revision iteration to: "${targetName}"`);
      }

      onNavigateToTemplates();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Save operation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in py-2">

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Input form panels */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-[#08080a] border border-white/10 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Optimization Scope
              </h3>
            </div>

            <form onSubmit={handleEnhance} className="space-y-4">
              
              {/* Category buttons selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-wider">Domain Class</label>
                <div className="space-y-1.5">
                  {(["Image Generation", "Code Crafting", "Creative Writing", "Reasoning & Logic", "Others"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between border ${
                        category === cat
                          ? "bg-cyan-950/40 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.1)]"
                          : "bg-transparent text-slate-400 border-white/5 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{cat}</span>
                      {category === cat && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input rich textarea */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Draft Text / Goal</label>
                <textarea
                  id="draft-prompt-textarea"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    category === "Image Generation"
                      ? "e.g., photo of futuristic cyber city streets during twilight rainy weather, cinematic focus"
                      : "e.g., modular TypeScript cache storage utility with automatic invalidation"
                  }
                  rows={4}
                  className="w-full text-xs p-3 bg-black/60 border border-white/10 rounded-xl text-slate-200 focus:outline-hidden focus:border-cyan-400 font-sans leading-relaxed resize-none"
                  disabled={isEnhancing}
                />
              </div>

              {/* Compile Button */}
              <button
                type="submit"
                disabled={isEnhancing || !draft.trim()}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Syntax...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compile Prompt</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Output and Saving Form */}
        <div className="md:col-span-8 space-y-6">
          
          {error && (
            <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 flex items-start gap-2.5 animate-fade-inDown">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <strong className="font-semibold block">Design Pipeline Halt</strong>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!enhancedData && !isEnhancing && (
            <div className="bg-black/20 border border-dashed border-white/15 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-slate-500">
                <Wand2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-4">Workspace Engine Idle</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                Provide a draft prompt on the leftmost terminal. Gemini will compile cinematic atmospheric specifications, logic gates, and variables.
              </p>
            </div>
          )}

          {isEnhancing && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-80 space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-widest animate-pulse">Running Neural Optimization...</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Injecting photorealistic visual settings, formatting instructions, system boundaries, and placeholder slots...
              </p>
            </div>
          )}

          {enhancedData && !isEnhancing && (
            <div className="space-y-6 animate-fade-in ml-1">
              
              {/* Output Preview */}
              <div className="bg-[#08080a] border border-white/10 rounded-2xl p-6 space-y-5">
                
                {/* Header review */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-white/5">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 uppercase">
                      {category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{enhancedData.name}</h3>
                  </div>
                  <div className="flex items-center text-cyan-400 bg-cyan-500/10 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-500/20 uppercase tracking-wider gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Vetted</span>
                  </div>
                </div>

                {/* Main Enhanced String Out */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Compiled Blueprint Template Text</label>
                  <div className="bg-black rounded-xl p-4 border border-white/10 font-mono text-xs text-cyan-100 leading-relaxed whitespace-pre-wrap relative overflow-hidden select-text">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(enhancedData.enhancedPrompt);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="absolute top-0 right-0 px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border-l border-b border-cyan-800/40 rounded-bl-lg font-mono text-[9px] text-cyan-400 font-bold transition-all flex items-center gap-1 cursor-pointer select-none"
                      title="Copy compiled prompt to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-450" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    {enhancedData.enhancedPrompt}
                  </div>
                </div>

                {/* Sub features: change summary & extra info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-[#050506] p-4 rounded-xl border border-white/10 space-y-1.5">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Engineering Rationale
                    </h4>
                    <p className="text-slate-400 leading-relaxed text-[10px] font-sans">{enhancedData.description}</p>
                  </div>
                  <div className="bg-[#050506] p-4 rounded-xl border border-white/10 space-y-1.5">
                    <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Upgrade Summary</h4>
                    <p className="text-slate-400 leading-relaxed text-[10px] font-sans">{enhancedData.changeSummary}</p>
                  </div>
                </div>
              </div>

              {/* Save Configuration Panel */}
              <div className="bg-[#08080a] border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-cyan-400" />
                  Commit to Local Shards
                </h3>

                {/* Choose Save Target */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <button
                    type="button"
                    onClick={() => setSaveOption("new")}
                    className={`p-3.5 rounded-xl text-left border transition-all flex flex-col ${
                      saveOption === "new"
                        ? "border-cyan-500/40 bg-cyan-500/5"
                        : "border-white/5 bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${saveOption === "new" ? "text-cyan-400" : "text-white"}`}>Initialize Node</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 font-sans">Saves as a clean standalone template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSaveOption("existing");
                      if (templates.length > 0 && !selectedTemplateId) {
                        setSelectedTemplateId(templates[0].id);
                      }
                    }}
                    disabled={templates.length === 0}
                    className={`p-3.5 rounded-xl text-left border transition-all flex flex-col ${
                      templates.length === 0 ? "opacity-30 cursor-not-allowed" : ""
                    } ${
                      saveOption === "existing"
                        ? "border-cyan-500/40 bg-cyan-500/5"
                        : "border-white/5 bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${saveOption === "existing" ? "text-cyan-400" : "text-white"}`}>Increment Commit</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 font-sans">Appends a historical revision</span>
                  </button>
                </div>

                {saveOption === "new" ? (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Node Title Name</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full p-2.5 bg-black border border-white/10 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-400 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Brief Metadata Description</label>
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        className="w-full p-2.5 bg-black border border-white/10 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-400 font-sans"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Target Node</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full p-2.5 bg-black border border-white/10 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-400 font-sans cursor-pointer"
                      >
                        {templates.map((t) => (
                           <option key={t.id} value={t.id} className="bg-black">
                             {t.name} ({t.category})
                           </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Commit Modification Notes</label>
                      <input
                        type="text"
                        value={changeSummaryNotes}
                        onChange={(e) => setChangeSummaryNotes(e.target.value)}
                        placeholder="Explain changes e.g. Improved realistic surface reflections"
                        className="w-full p-2.5 bg-black border border-white/10 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-400 font-sans"
                      />
                    </div>
                  </div>
                )}

                {/* Action Trigger Save */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full h-11 bg-gradient-to-r from-[#111] to-[#010102] hover:bg-white/5 text-slate-200 hover:text-white border border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Writing Shard record...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-cyan-400 shadow-md" />
                      <span>
                        {saveOption === "new"
                          ? "Initialize Target Node"
                          : "Append Commit Iteration"}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
