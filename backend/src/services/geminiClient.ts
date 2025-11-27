import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '../config/env.js';

// Singleton Gemini AI client
let genAI: GoogleGenerativeAI | null = null;

/**
 * Get or create the Gemini AI client instance
 */
function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

/**
 * Get the vision model for image analysis
 * Currently uses gemini-2.0-flash-exp
 */
export function getVisionModel(): GenerativeModel {
  return getClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
}

/**
 * Get the model for text generation (AI Muse prompts)
 * Currently uses gemini-2.0-flash-exp (same as vision for simplicity)
 */
export function getTextModel(): GenerativeModel {
  return getClient().getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
}

/**
 * Update model version globally (for future upgrades)
 * Example: switchModelVersion('gemini-2.5-flash')
 */
export function switchModelVersion(modelName: string): void {
  // Force recreation of client with new model name
  genAI = null;
  // Note: This is a simple implementation
  // In production, you might want to store the model name in config
  console.warn(`Model version switching not fully implemented. Current: gemini-2.0-flash-exp, Requested: ${modelName}`);
}
