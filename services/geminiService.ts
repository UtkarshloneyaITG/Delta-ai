
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AIMode, AIRole, Message } from "../types";
import { SYSTEM_PROMPTS, MODE_INSTRUCTIONS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *streamResponse(
    prompt: string,
    history: Message[],
    mode: AIMode,
    role: AIRole,
    modelName: string = 'gemini-3-flash-preview'
  ) {
    const systemInstruction = `${SYSTEM_PROMPTS[role]}\n\nMode: ${MODE_INSTRUCTIONS[mode]}`;

    // Prepare history for context
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: modelName,
        contents: [
          ...chatHistory,
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
          topP: 0.95,
        }
      });

      for await (const chunk of responseStream) {
        yield chunk.text;
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  // Helper to generate a title for a new session based on the first prompt
  async generateTitle(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: "You are a helpful, professional, and savage AI assistant. Provide clear, concise, and correct answers. Format your output using Markdown where appropriate.",
        },
        contents: `Generate a short (max 5 words) descriptive title for a chat that starts with this prompt: "${prompt}". Just return the title text, nothing else.`
      });
      return response.text?.trim().replace(/"/g, '') || "New Conversation";
    } catch (e) {
      return "New Conversation";
    }
  }
}

export const geminiService = new GeminiService();
