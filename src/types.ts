export interface PromptVersion {
  version: number;
  promptText: string;
  originText: string;
  changeSummary: string;
  modelSettings: {
    temperature: number;
    topP: number;
    maxTokens: number;
    targetModel: string;
  };
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: "Image Generation" | "Code Crafting" | "Creative Writing" | "Reasoning & Logic" | "Others";
  description: string;
  variables: string[]; // List of auto-extracted placeholder variables like "[subject]"
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface RedundancyAnalysis {
  duplicates: {
    promptAId: string;
    promptAName: string;
    promptBId: string;
    promptBName: string;
    similarityScore: number; // 0 to 100
    reason: string;
    suggestion: string;
  }[];
  summary: string;
}

export interface SandboxTestResponse {
  success: boolean;
  outputText: string;
  imageUrl?: string; // Is populated if an image is generated
  error?: string;
  runtimeMs: number;
}
