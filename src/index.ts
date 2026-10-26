import "dotenv/config";
import { runAgentOrchestrator } from "./orchestrator.js";

async function main() {
  const operationalPrompt = 
  "Check the status of shipment SHP-9999 and let me know if it can be rerouted to BLR-02.";

  console.log("Starting Autonomous Agent...");
  console.log(`Prompt: "${operationalPrompt}"\n`);

  try {
    const finalAnswer = await runAgentOrchestrator(operationalPrompt);
    console.log("\n================ AGENT FINAL RESPONSE ================\n");
    console.log(finalAnswer);
  } catch (error: any) {
    console.error("Execution failed:", error.message);
  }
}

main();