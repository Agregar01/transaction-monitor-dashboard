import { baseApi } from "./baseApi";
import type {
  Rule,
  RuleCategory,
  RuleSeverity,
  RuleStatus,
  RuleCondition,
  MutationResponse,
} from "@/types/api";

export interface ListRulesParams {
  status?: RuleStatus;
  category?: RuleCategory;
  enabled_only?: boolean;
}

export interface CreateRulePayload {
  rule_id: string;
  rule_name: string;
  rule_category: RuleCategory;
  severity: RuleSeverity;
  conditions: RuleCondition[];
  operator: "AND" | "OR";
  risk_contribution: number;
  description?: string;
  explain_template?: string;
}

export const rulesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listRules: b.query<Rule[], ListRulesParams>({
      query: (params) => ({ url: "/rules", params }),
      providesTags: (result) => [
        { type: "Rule", id: "LIST" },
        ...(result ?? []).map((r) => ({ type: "Rule" as const, id: r.rule_id })),
      ],
    }),
    getRule: b.query<Rule, string>({
      query: (id) => `/rules/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Rule", id }],
    }),
    createRule: b.mutation<Rule, CreateRulePayload>({
      query: (body) => ({ url: "/rules", method: "POST", body }),
      invalidatesTags: [{ type: "Rule", id: "LIST" }],
    }),
    updateRule: b.mutation<
      Rule,
      {
        rule_id: string;
        rule_name?: string;
        description?: string;
        risk_contribution?: number;
        enabled?: boolean;
        conditions?: RuleCondition[];
        explain_template?: string;
      }
    >({
      query: ({ rule_id, ...body }) => ({ url: `/rules/${rule_id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { rule_id }) => [
        { type: "Rule", id: rule_id },
        { type: "Rule", id: "LIST" },
      ],
    }),
    promoteRule: b.mutation<
      MutationResponse | { approval_id: string; expires_at: string },
      { rule_id: string }
    >({
      query: ({ rule_id }) => ({ url: `/rules/${rule_id}/promote`, method: "PATCH" }),
      invalidatesTags: (_r, _e, { rule_id }) => [
        { type: "Rule", id: rule_id },
        { type: "Rule", id: "LIST" },
        { type: "Approval", id: "LIST" },
      ],
    }),
    archiveRule: b.mutation<MutationResponse, { rule_id: string }>({
      query: ({ rule_id }) => ({ url: `/rules/${rule_id}/archive`, method: "PATCH" }),
      invalidatesTags: (_r, _e, { rule_id }) => [
        { type: "Rule", id: rule_id },
        { type: "Rule", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListRulesQuery,
  useGetRuleQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  usePromoteRuleMutation,
  useArchiveRuleMutation,
} = rulesApi;
