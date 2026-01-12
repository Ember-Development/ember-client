import OpenAI from "openai";
import { ChangeRequestType } from ".prisma/client";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Estimates the number of hours needed for a change request using AI
 * @param title - The title of the change request
 * @param description - The description of the change request
 * @param type - The type of change request (BUG, ENHANCEMENT, NEW_FEATURE, etc.)
 * @returns Estimated hours (1-500 range)
 */
export async function estimateChangeRequestHours(
  title: string,
  description: string,
  type: ChangeRequestType
): Promise<number> {
  const client = getOpenAIClient();
  
  if (!client) {
    // Fallback to a simple heuristic if no API key
    console.warn("OPENAI_API_KEY not set, using fallback estimation");
    return estimateHoursFallback(title, description, type);
  }

  try {
    const typeContext = getTypeContext(type);
    
    const prompt = `You are a software development project estimator. Estimate the number of development hours needed for this change request.

Change Request Type: ${type}
Title: ${title}
Description: ${description}

${typeContext}

Consider:
- Development time (coding, testing)
- Design work if needed
- Integration and refactoring
- Documentation updates
- Code review time

Provide a realistic estimate in hours (1-500 range). Return ONLY a number, no explanation.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a software development estimator. Always respond with only a number representing hours (1-500).",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const estimatedHours = parseFloat(response.choices[0]?.message?.content?.trim() || "0");
    
    // Validate and clamp the result
    if (isNaN(estimatedHours) || estimatedHours <= 0) {
      return estimateHoursFallback(title, description, type);
    }
    
    // Clamp to reasonable range
    return Math.max(1, Math.min(500, Math.round(estimatedHours * 10) / 10));
  } catch (error) {
    console.error("AI estimation error:", error);
    // Fallback to heuristic estimation
    return estimateHoursFallback(title, description, type);
  }
}

function getTypeContext(type: ChangeRequestType): string {
  switch (type) {
    case "BUG":
      return "This is a bug fix. Consider: debugging time, root cause analysis, testing, and regression testing.";
    case "ENHANCEMENT":
      return "This is an enhancement to existing functionality. Consider: analysis of current code, implementation, testing.";
    case "NEW_FEATURE":
      return "This is a new feature. Consider: design, implementation, testing, integration with existing systems.";
    case "CONTENT":
      return "This is a content change. Usually minimal development time, mostly content updates.";
    case "OTHER":
      return "This is a general change request. Estimate based on the description provided.";
    default:
      return "";
  }
}

function estimateHoursFallback(
  title: string,
  description: string,
  type: ChangeRequestType
): number {
  // Simple heuristic-based estimation
  const text = `${title} ${description}`.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  
  // Base hours by type
  const baseHours: Record<ChangeRequestType, number> = {
    BUG: 4,
    ENHANCEMENT: 8,
    NEW_FEATURE: 16,
    CONTENT: 2,
    OTHER: 8,
  };
  
  let hours = baseHours[type] || 8;
  
  // Adjust based on description length (longer descriptions often mean more complex)
  if (wordCount > 100) {
    hours *= 1.5;
  } else if (wordCount > 50) {
    hours *= 1.2;
  } else if (wordCount < 20) {
    hours *= 0.8;
  }
  
  // Look for complexity indicators
  const complexityKeywords = [
    "complex", "integration", "refactor", "architecture", "database", "api", "authentication",
    "security", "performance", "scalability", "migration", "redesign"
  ];
  
  const hasComplexity = complexityKeywords.some(keyword => text.includes(keyword));
  if (hasComplexity) {
    hours *= 1.5;
  }
  
  return Math.max(1, Math.min(500, Math.round(hours)));
}
