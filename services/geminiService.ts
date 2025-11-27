import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize with environment variable
// In a real production build, ensure process.env.API_KEY is available.
// For this demo, if key is missing, we fallback to simulation.
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Analyzes an image to extract attributes, title, and description.
 * Falls back to mock data if no API key is present to ensure MVP functionality.
 */
export const analyzeImageWithGemini = async (
  imageBase64: string, 
  mimeType: string
): Promise<AnalysisResult> => {
  
  if (!ai) {
    console.warn("Gemini API Key missing. Using mock analysis simulation.");
    return simulateAnalysis();
  }

  try {
    const model = 'gemini-3-pro-preview';
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          {
            text: "Analyze this image. Provide a short catchy title, a concise description (max 2 sentences), a visual style, and a list of 3-5 single-word key attributes (tags)."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                visualStyle: { type: Type.STRING },
                attributes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ["title", "description", "attributes", "visualStyle"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback to simulation on error
    return simulateAnalysis();
  }
};

const simulateAnalysis = (): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: "New Uploaded Masterpiece",
        description: "A stunning visual capturing the essence of the moment with vibrant clarity.",
        visualStyle: "Contemporary Realism",
        attributes: ["Vibrant", "New", "Featured", "Artistic"]
      });
    }, 2000);
  });
};
