import { GoogleGenAI } from "@google/genai";
import { geminiTools, toolRegistry } from "./tools.js";

export async function runAgentOrchestrator(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in your environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";

  const contents: any[] = [
    {
      role: "user",
      parts: [{ text: userPrompt }]
    }
  ];

  const MAX_TURNS = 6;
  let turn = 0;

  while (turn < MAX_TURNS) {
    turn++;
    console.log(`\n================== [Turn ${turn}] ==================`);
    console.log("Sending conversation state to Gemini...");

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: `You are an autonomous supply chain agent for Deloitte SCNO.
Your goal is to inspect delayed shipments, evaluate alternate warehouse capacities, and suggest optimized reroutes.
Always state your reasoning clearly and leverage available tools.`,
        tools: geminiTools
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content) {
      throw new Error("No candidate content received from model.");
    }

    // Append the model's response to conversation history
    contents.push(candidate.content);

    // Extract function calls if present
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      console.log("[Status] Agent completed task without requesting additional tools.");
      return response.text || "Task concluded with no text output.";
    }

    console.log(`[Status] Model requested ${functionCalls.length} tool call(s).`);

    // Execute tool calls concurrently
    const toolResponseParts = await Promise.all(
      functionCalls.map(async (call) => {
        const toolName = call.name;
        const handler = toolRegistry[toolName];
        let observation: any;

        try {
          if (!handler) {
            throw new Error(`Tool "${toolName}" is not registered in the system.`);
          }

          console.log(`  -> Executing: ${toolName}(${JSON.stringify(call.args)})`);
          const result = await handler(call.args);
          observation = { status: "success", data: result };
        } catch (error: any) {
          console.warn(`  [Tool Exception] ${toolName}: ${error.message}`);
          observation = { status: "error", message: error.message };
        }

        return {
          functionResponse: {
            name: toolName,
            response: observation
          }
        };
      })
    );

    // Push tool execution observations back to Gemini
    contents.push({
      role: "user",
      parts: toolResponseParts
    });
  }

  throw new Error(`Circuit Breaker Tripped: Exceeded maximum allowed turns (${MAX_TURNS}).`);
}