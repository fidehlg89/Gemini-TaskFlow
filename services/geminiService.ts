import { GoogleGenAI, Type } from "@google/genai";
import { Priority, AiSuggestion } from "../types";

// Initialize Gemini Client
const getApiKey = () => {
  // Vite way
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  // Generic process.env way
  if (typeof process !== 'undefined' && process.env && process.env.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Breaks down a complex task into actionable subtasks.
 */
export const breakDownTask = async (taskText: string): Promise<AiSuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Break down the following task into 3 to 5 smaller, actionable subtasks. Assign a priority level (low, medium, high) to each. Task: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The description of the subtask"
              },
              priority: {
                type: Type.STRING,
                enum: ["low", "medium", "high"],
                description: "The priority of the subtask"
              }
            },
            required: ["text", "priority"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const result = JSON.parse(jsonText) as { text: string, priority: string }[];

    // Map string priority to Enum
    return result.map(item => ({
      text: item.text,
      priority: item.priority as Priority
    }));

  } catch (error) {
    console.error("Error breaking down task:", error);
    throw error;
  }
};

/**
 * Generates a productivity tip or quote based on the current tasks.
 */
export const getProductivityInsight = async (taskCount: number, completedCount: number): Promise<string> => {
  try {
    const prompt = `
      I have a todo list with ${taskCount} active tasks and ${completedCount} completed tasks today.
      Give me a very short, punchy, 1-sentence motivational quote or productivity tip relevant to this context.
      Do not use quotes characters.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Keep moving forward!";
  } catch (error) {
    console.error("Error getting insight:", error);
    throw error;
  }
};
