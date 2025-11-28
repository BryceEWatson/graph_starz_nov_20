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
 * Uses Gemini 3 Pro (preview) - Google's most advanced model
 */
export function getVisionModel(): GenerativeModel {
  return getClient().getGenerativeModel({ model: 'gemini-3-pro-preview' });
}

/**
 * Get the model for text generation (AI Muse prompts)
 * Uses Gemini 3 Pro (preview) - same as vision for consistency
 */
export function getTextModel(): GenerativeModel {
  return getClient().getGenerativeModel({ model: 'gemini-3-pro-preview' });
}

/**
 * Update model version globally (for future upgrades)
 * Example: switchModelVersion('gemini-3-pro')
 */
export function switchModelVersion(modelName: string): void {
  // Force recreation of client with new model name
  genAI = null;
  // Note: This is a simple implementation
  // In production, you might want to store the model name in config
  console.warn(`Model version switching not fully implemented. Current: gemini-3-pro-preview, Requested: ${modelName}`);
}
