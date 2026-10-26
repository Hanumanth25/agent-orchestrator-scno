// Helper function: Exponential backoff for transient failures
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 300
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(operation, retries - 1, delayMs * 2);
  }
}

// 1. Tool Implementations
export const toolRegistry: Record<string, (args: any) => Promise<any>> = {
  get_shipment_status: async ({ shipmentId }: { shipmentId: string }) => {
    return retryWithBackoff(async () => {
      if (shipmentId === "SHP-8821") {
        return {
          shipmentId: "SHP-8821",
          origin: "MAA",
          intendedDestination: "HYD-01",
          status: "DELAYED",
          delayHours: 14,
          pallets: 18
        };
      }
      throw new Error(`Shipment ${shipmentId} not found in transit database.`);
    });
  },

  check_warehouse_capacity: async ({ warehouseCode }: { warehouseCode: string }) => {
    const capacities: Record<string, number> = {
      "HYD-01": 2,
      "BLR-02": 45,
      "PUN-01": 12
    };

    if (!(warehouseCode in capacities)) {
      throw new Error(`Invalid warehouse code: ${warehouseCode}. Valid hubs: HYD-01, BLR-02, PUN-01`);
    }

    return {
      warehouseCode,
      availablePalletSlots: capacities[warehouseCode]
    };
  },

  calculate_reroute_cost: async ({
    shipmentId,
    targetWarehouse,
    urgencyMultiplier = 1.0
  }: {
    shipmentId: string;
    targetWarehouse: string;
    urgencyMultiplier?: number;
  }) => {
    const baseRatePerPallet = 1200;
    const pallets = 18;
    const cost = pallets * baseRatePerPallet * urgencyMultiplier;

    return {
      shipmentId,
      rerouteTarget: targetWarehouse,
      estimatedCostInINR: cost,
      etaHours: 6
    };
  }
};

// 2. Gemini Function Declarations
export const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "get_shipment_status",
        description: "Retrieve tracking status, destination, and delay duration for a specific shipment ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            shipmentId: {
              type: "STRING",
              description: "The unique shipment ID, e.g., SHP-8821"
            }
          },
          required: ["shipmentId"]
        }
      },
      {
        name: "check_warehouse_capacity",
        description: "Check available inbound pallet capacity for a regional supply chain warehouse.",
        parameters: {
          type: "OBJECT",
          properties: {
            warehouseCode: {
              type: "STRING",
              description: "The warehouse code (e.g., HYD-01, BLR-02, PUN-01)"
            }
          },
          required: ["warehouseCode"]
        }
      },
      {
        name: "calculate_reroute_cost",
        description: "Calculates operational cost impact and ETA to reroute a shipment to an alternate hub.",
        parameters: {
          type: "OBJECT",
          properties: {
            shipmentId: { type: "STRING" },
            targetWarehouse: { type: "STRING" },
            urgencyMultiplier: {
              type: "NUMBER",
              description: "Scale from 1.0 (standard) to 2.0 (expedited)"
            }
          },
          required: ["shipmentId", "targetWarehouse"]
        }
      }
    ]
  }
];