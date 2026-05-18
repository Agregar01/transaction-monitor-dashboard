import { baseApi } from "./baseApi";

export interface PolicyRuleCondition {
  type: string;
  // threshold conditions
  field?: string;
  operator?: string;
  value?: number | string | boolean | string[];
  // composite conditions
  logic?: string;
  conditions?: PolicyRuleCondition[];
  // pattern conditions
  pattern_type?: string;
  action_type?: string;
  threshold?: number;
  max_count?: number;
  // exists conditions
  should_exist?: boolean;
  // time_based conditions
  time_type?: string;
  days?: number;
  warning_days?: number;
}

export interface PolicyRule {
  id: string;
  policy_id: string;
  name: string;
  code?: string;
  description: string | null;
  is_enabled: boolean;
  priority: number;
  condition: PolicyRuleCondition;
  applicable_tiers: string[] | null;
  action: string;
  workflow: string | null;
  target_tier: string | null;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  category?: string;
  is_system?: boolean;
  status: string;
  version: number;
  priority: number;
  rule_count?: number;
  rules?: PolicyRule[];
  created_at: string;
  updated_at?: string;
}

export interface PolicyCreateRule {
  name: string;
  description?: string;
  is_enabled?: boolean;
  priority?: number;
  condition: PolicyRuleCondition;
  applicable_tiers?: string[];
  action: string;
  workflow?: string;
  target_tier?: string;
}

export interface PolicyCreateRequest {
  client_id: string;
  name: string;
  description?: string;
  priority?: number;
  rules: PolicyCreateRule[];
}

export interface TierConfig {
  tier: string;
  entity_type: string;
  daily_limit: number;
  monthly_limit: number;
  per_transaction_limit: number;
  allowed_activities: string[];
  requirements: string[];
}

export interface TierWorkflow {
  workflow: string;
  name: string;
  description: string;
  entity_type: string;
  from_tier: string;
  to_tier: string;
}

const policiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPolicies: builder.query<Policy[], { client_id: string; status?: string; category?: string }>({
      query: (params) => ({
        url: "/policies/",
        params,
      }),
      providesTags: ["Policy"],
    }),
    getPolicy: builder.query<Policy, string>({
      query: (id) => `/policies/${id}/`,
      providesTags: ["Policy"],
    }),
    activatePolicy: builder.mutation<Policy, string>({
      query: (id) => ({
        url: `/policies/${id}/activate/`,
        method: "POST",
      }),
      invalidatesTags: ["Policy"],
    }),
    deactivatePolicy: builder.mutation<Policy, string>({
      query: (id) => ({
        url: `/policies/${id}/deactivate/`,
        method: "POST",
      }),
      invalidatesTags: ["Policy"],
    }),
    createPolicy: builder.mutation<Policy, PolicyCreateRequest>({
      query: (body) => ({
        url: "/policies/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Policy"],
    }),
    deletePolicy: builder.mutation<void, string>({
      query: (id) => ({
        url: `/policies/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Policy"],
    }),
    toggleRule: builder.mutation<void, { policy_id: string; rule_id: string; enabled: boolean }>({
      query: ({ policy_id, rule_id, enabled }) => ({
        url: `/policies/${policy_id}/rules/${rule_id}/toggle/`,
        method: "PATCH",
        params: { enabled },
      }),
      invalidatesTags: ["Policy"],
    }),
    updateRule: builder.mutation<PolicyRule, { policy_id: string; rule_id: string; body: Partial<PolicyCreateRule> }>({
      query: ({ policy_id, rule_id, body }) => ({
        url: `/policies/${policy_id}/rules/${rule_id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Policy"],
    }),
    getPolicyHistory: builder.query<{ policy_id: string; current_version: number; history: Array<Record<string, unknown>> }, string>({
      query: (id) => `/policies/${id}/history/`,
    }),
    listTiers: builder.query<TierConfig[], { client_id?: string; entity_type?: string }>({
      query: ({ client_id, ...rest }) => ({
        url: "/tiers/",
        params: client_id ? { client_id, ...rest } : rest,
      }),
      providesTags: ["Tier"],
    }),
    listWorkflows: builder.query<TierWorkflow[], { client_id?: string; entity_type?: string }>({
      query: ({ client_id, ...rest }) => ({
        url: "/tiers/workflows/",
        params: client_id ? { client_id, ...rest } : rest,
      }),
    }),
    getTierComparison: builder.query<Record<string, unknown>, { client_id: string; entity_type?: string }>({
      query: (params) => ({
        url: "/tiers/comparison/",
        params,
      }),
    }),
  }),
});

export const {
  useListPoliciesQuery,
  useGetPolicyQuery,
  useActivatePolicyMutation,
  useDeactivatePolicyMutation,
  useCreatePolicyMutation,
  useDeletePolicyMutation,
  useToggleRuleMutation,
  useUpdateRuleMutation,
  useGetPolicyHistoryQuery,
  useListTiersQuery,
  useListWorkflowsQuery,
  useGetTierComparisonQuery,
} = policiesApi;
