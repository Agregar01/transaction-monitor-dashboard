import { baseApi } from "./baseApi";
import type {
  ScenarioRequest,
  ScenarioResult,
  SimulationRequest,
  SimulationResult,
  TemplateInfo,
} from "@/types/simulator";

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
    /** GET /simulations/templates — the built-in typology templates. */
    listScenarioTemplates: b.query<TemplateInfo[], void>({
      query: () => "/simulations/templates",
    }),
    /**
     * POST /simulations/scenarios — multi-leg DRY RUN. The authenticated console
     * deliberately gets the rolled-back endpoint, not `/scenarios/persist`: an
     * analyst testing a rule change should never inject traffic into their own
     * institution's queues. Persisting is the public demo surface's job, and it
     * writes into a fixed demo institution.
     */
    simulateScenario: b.mutation<ScenarioResult, ScenarioRequest>({
      query: (body) => ({ url: "/simulations/scenarios", method: "POST", body }),
    }),
  }),
});

export const {
  useSimulateTransactionMutation,
  useListScenarioTemplatesQuery,
  useSimulateScenarioMutation,
} = simulationApi;
