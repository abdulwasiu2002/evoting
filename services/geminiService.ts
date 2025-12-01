import { GoogleGenAI } from "@google/genai";

// CAUTION: In a real frontend app, we would proxy this through a backend.
// For this demo, we assume the environment variable is available.
// If not provided, we will return a mock response to ensure the UI still works.

const apiKey = process.env.API_KEY || ''; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export const analyzeManifesto = async (candidateName: string, manifesto: string): Promise<string> => {
  if (!ai) {
      console.warn("Gemini API Key not found. Returning mock analysis.");
      return `[Mock AI Analysis] ${candidateName}'s manifesto focuses heavily on structural improvements. The key takeaway is a commitment to tangible assets over policy changes.`;
  }

  try {
    const prompt = `
      Please analyze the following manifesto for a student election candidate named ${candidateName}.
      Provide a concise summary (max 2 sentences) of their key promises and the tone of their campaign.
      
      Manifesto:
      "${manifesto}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating analysis. Please try again later.";
  }
};