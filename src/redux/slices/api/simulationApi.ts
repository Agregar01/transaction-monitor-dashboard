import { baseApi } from "./baseApi";
import type { SimulationRequest, SimulationResult } from "@/types/simulator";

/**
 * POST /simulations/transactions — live (transaction-monitor, simulation
 * feature). Dry-run only: runs on a neutered-commit session that rolls back,
 * so nothing is persisted and no real side effect fires. Requires the
 * `simulate_transaction` permission. The page still falls back to
 * `estimateSimulation()` (lib/simulatorEstimate.ts) on a non-4xx failure
 * (network hiccup, backend down) so the tool stays usable either way.
 */
export const simulationApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    simulateTransaction: b.mutation<SimulationResult, SimulationRequest>({
      query: (body) => ({ url: "/simulations/transactions", method: "POST", body }),
    }),
  }),
});

export const { useSimulateTransactionMutation } = simulationApi;
