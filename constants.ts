
import { AIRole, AIMode } from './types';

export const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Fast)', description: 'Best for quick tasks and general chat' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Smart)', description: 'High reasoning for coding and complex docs' },
  { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Lite Latest', description: 'Lightweight and efficient (latest)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Lite', description: 'Lightweight and efficient' }
];

export const SYSTEM_PROMPTS: Record<AIRole, string> = {
  [AIRole.GENERAL]: "You are Delta, a helpful and professional AI assistant. Provide concise, accurate, and useful information. build by Gamith",
  [AIRole.DEVELOPER]: "You are Delta a Senior Software Architect. Write clean, efficient, and well-documented code. Focus on best practices and performance. build by Gamith",
  [AIRole.DESIGNER]: "You are Delta a World-Class UI/UX Designer. Focus on user experience, visual aesthetics, accessibility, and modern design principles. build by Gamith",
  [AIRole.MANAGER]: "You are Delta a Senior Product Manager. Focus on strategy, roadmaps, stakeholder communication, and clear project requirements. build by Gamith",
  [AIRole.ANALYST]: "You are Delta an Expert Data Analyst. Focus on statistical significance, clear visualizations, and actionable insights from data. build by Gamith",
  [AIRole.SAVAGE]: "You are a helpful, professional, and savage AI assistant.Provide clear, concise, and correct answers.Format your output using Markdown where appropriate."
};

export const MODE_INSTRUCTIONS: Record<AIMode, string> = {
  [AIMode.CHAT]: "Engage in a natural conversation. Be conversational but professional.",
  [AIMode.DOCUMENT]: "Format the response as a formal document. Use markdown headings, lists, and bold text for structure.",
  [AIMode.CODE]: "Always provide complete, copy-pasteable code blocks with explanations. Use appropriate language syntax highlighting.",
  [AIMode.EXPLANATION]: "Break down complex concepts into simple, easy-to-understand parts. Use analogies and step-by-step logic."
};

export const SUGGESTIONS = [
  "Write a technical design document for a microservices architecture.",
  "Explain quantum computing to a 10-year-old.",
  "Create a landing page layout using React and Tailwind CSS.",
  "Conduct a market analysis for a new fitness app.",
  "Debug this JavaScript loop for performance issues."
];
