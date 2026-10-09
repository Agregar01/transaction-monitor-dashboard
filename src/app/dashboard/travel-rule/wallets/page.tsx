"use client";

import { useEffect, useState } from "react";
import ActionBadge from "@/components/ActionBadge";
import QueryState from "@/components/QueryState";
import TravelRuleTabs from "@/components/TravelRuleTabs";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";
import { statusLabel, walletVerifiedError } from "@/lib/travelRule";
import { useAppSelector } from "@/redux/store";
import {
  useCreateCustomerWalletMutation,
  useListCustomerWalletsQuery,
  useUpdateCustomerWalletMutation,
} from "@/redux/slices/api/travelRuleApi";
import type { CustomerWallet, WalletOwnershipMethod, WalletOwnershipStatus } from "@/types/api";

const TH = "px-4 py-3 text-left font-semibold";
const TD = "px-4 py-3 text-sm";
const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white";
const CARD = "bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-6";

const STATUSES: WalletOwnershipStatus[] = ["DECLARED", "VERIFIED", "REVOKED"];
const METHODS: WalletOwnershipMethod[] = ["DECLARATION", "SIGNED_MESSAGE", "MICRO_TRANSFER"];

function fmtDate(ts: string | null | undefined): string {
  return ts ? new Date(ts).toLocaleDateString() : "n/a";
}

/** YYYY-MM-DD from a date input to an ISO datetime (midnight UTC), or null when empty. */
function dateToIso(d: string): string | null {
  return d ? `${d}T00:00:00Z` : null;
}

function OwnershipFields({
  status,
  method,
  reverifyAt,
  notes,
  onChange,
}: {
  status: WalletOwnershipStatus;
  method: WalletOwnershipMethod;
  reverifyAt: string;
  notes: string;
  onChange: (patch: Partial<{ status: WalletOwnershipStatus; method: WalletOwnershipMethod; reverifyAt: string; notes: string }>) => void;
}) {
  return (
    <>
      <label className="text-xs text-gray-500 dark:text-gray-400">
        Ownership status
        <select className={INPUT} value={status} onChange={(e) => onChange({ status: e.target.value as WalletOwnershipStatus })}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500 dark:text-gray-400">
        Ownership method
        <select className={INPUT} value={method} onChange={(e) => onChange({ method: e.target.value as WalletOwnershipMethod })}>
          {METHODS.map((m) => (
            <option key={m} value={m}>{statusLabel(m)}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-500 dark:text-gray-400">
        Re-verify by (optional)
        <input className={INPUT} type="date" value={reverifyAt} onChange={(e) => onChange({ reverifyAt: e.target.value })} />
      </label>
      <label className="md:col-span-3 text-xs text-gray-500 dark:text-gray-400">
        Evidence notes{status === "VERIFIED" ? " (required for verified)" : ""}
        <textarea
          className={INPUT}
          rows={2}
          maxLength={2000}
          placeholder="What was signed or sent, when, and where the proof is kept"
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>
    </>
  );
}

function RegisterForm({ customerId, onDone }: { customerId: string; onDone: () => void }) {
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [own, setOwn] = useState({
    status: "DECLARED" as WalletOwnershipStatus,
    method: "DECLARATION" as WalletOwnershipMethod,
    reverifyAt: "",
    notes: "",
  });
  const [create, { isLoading }] = useCreateCustomerWalletMutation();
  const ruleError = walletVerifiedError({ ownership_status: own.status, ownership_method: own.method, evidence_notes: own.notes });
  const incomplete = !network.trim() || address.trim().length < 4;

  const submit = async () => {
    if (ruleError || incomplete) return;
    try {
      await create({
        customer_id: customerId,
        network: network.trim(),
        address: address.trim(),
        ownership_status: own.status,
        ownership_method: own.method,
        reverify_at: dateToIso(own.reverifyAt),
        evidence_notes: own.notes.trim() || null,
      }).unwrap();
      showToast({
        type: "success",
        title: "Wallet registered",
        message:
          own.status === "VERIFIED"
            ? "Held transfers that needed this ownership proof are re-evaluated."
            : "The wallet is recorded for this customer.",
      });
      onDone();
    } catch (e) {
      showToast({ type: "error", title: "Could not register", message: errorMessage(e) });
    }
  };

  return (
    <section className={`${CARD} space-y-3`}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Register a wallet for <span className="font-mono normal-case">{customerId}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Network
          <input className={INPUT} placeholder="e.g. ethereum, bitcoin, tron" value={network} onChange={(e) => setNetwork(e.target.value)} />
        </label>
        <label className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
          Address
          <input className={`${INPUT} font-mono`} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={256} />
        </label>
        <OwnershipFields
          status={own.status}
          method={own.method}
          reverifyAt={own.reverifyAt}
          notes={own.notes}
          onChange={(p) => setOwn({ ...own, ...p })}
        />
      </div>
      {ruleError && <p className="text-xs text-red-600 dark:text-red-300">{ruleError}</p>}
      <button
        onClick={submit}
        disabled={isLoading || !!ruleError || incomplete}
        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
      >
        {isLoading ? "Saving..." : "Register wallet"}
      </button>
    </section>
  );
}

function EditRow({ wallet, onDone }: { wallet: CustomerWallet; onDone: () => void }) {
  const [own, setOwn] = useState({
    status: wallet.ownership_status as WalletOwnershipStatus,
    method: wallet.ownership_method as WalletOwnershipMethod,
    reverifyAt: wallet.reverify_at ? wallet.reverify_at.slice(0, 10) : "",
    notes: wallet.evidence_notes ?? "",
  });
  const [update, { isLoading }] = useUpdateCustomerWalletMutation();
  const ruleError = walletVerifiedError({ ownership_status: own.status, ownership_method: own.method, evidence_notes: own.notes });

  const save = async () => {
    if (ruleError) return;
    const body: Record<string, unknown> = {};
    if (own.status !== wallet.ownership_status) body.ownership_status = own.status;
    if (own.method !== wallet.ownership_method) body.ownership_method = own.method;
    const reverify = dateToIso(own.reverifyAt);
    if ((wallet.reverify_at ? wallet.reverify_at.slice(0, 10) : "") !== own.reverifyAt) body.reverify_at = reverify;
    if (own.notes.trim() !== (wallet.evidence_notes ?? "").trim()) body.evidence_notes = own.notes.trim() || null;
    if (Object.keys(body).length === 0) {
      onDone();
      return;
    }
    try {
      await update({ id: wallet.id, ...body }).unwrap();
      showToast({
        type: "success",
        title: "Wallet updated",
        message:
          body.ownership_status === "VERIFIED"
            ? "Held transfers that needed this ownership proof are re-evaluated."
            : "Ownership details saved.",
      });
      onDone();
    } catch (e) {
      showToast({ type: "error", title: "Update failed", message: errorMessage(e) });
    }
  };

  return (
    <tr className="bg-gray-50 dark:bg-navy-800/60">
      <td colSpan={7} className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <OwnershipFields
            status={own.status}
            method={own.method}
            reverifyAt={own.reverifyAt}
            notes={own.notes}
            onChange={(p) => setOwn({ ...own, ...p })}
          />
        </div>
        {ruleError && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{ruleError}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={isLoading || !!ruleError}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onDone}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-600 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function CustomerWalletsPage() {
  useEffect(() => {
    document.title = "Customer wallets | Transaction Monitor";
  }, []);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const institutionId = useAppSelector((s) => s.auth.institutionId);
  // Wallets belong to an institution's customers: platform users can look them up but not register them.
  const canManage = permissions.includes("manage_travel_rule") && !!institutionId;

  const [input, setInput] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const { data, isLoading, isFetching, isError, error } = useListCustomerWalletsQuery(customerId, { skip: !customerId });
  const rows = data ?? [];

  const search = () => {
    const id = input.trim();
    setCustomerId(id);
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <TravelRuleTabs subtitle="Customer wallets and ownership evidence. A verified wallet satisfies the ownership proof for first-party unhosted transfers." />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Customer ID
          <input
            className="block mt-1 px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white font-mono"
            placeholder="e.g. CUST-0001"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
          />
        </label>
        <button
          onClick={search}
          disabled={input.trim().length < 3}
          className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-navy-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 disabled:opacity-50"
        >
          Search
        </button>
        {canManage && customerId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="ml-auto px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600"
          >
            {showForm ? "Close" : "Register wallet"}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Verified ownership needs the signed message or micro transfer method and evidence notes. A declaration alone
        records the wallet but does not verify it.
      </p>

      {showForm && canManage && customerId && (
        <RegisterForm customerId={customerId} onDone={() => setShowForm(false)} />
      )}

      {!customerId ? (
        <div className={`${CARD} text-center text-sm text-gray-500 dark:text-gray-400`}>
          Enter a customer ID to see the wallets registered to that customer.
        </div>
      ) : (
        <QueryState
          isLoading={isLoading || (isFetching && !data)}
          isError={isError}
          error={error}
          isEmpty={rows.length === 0}
          emptyMessage={`No wallets registered for ${customerId}.`}
        >
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-navy-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className={TH}>Network</th>
                  <th className={TH}>Address</th>
                  <th className={TH}>Ownership</th>
                  <th className={TH}>Method</th>
                  <th className={TH}>Verified</th>
                  <th className={TH}>Re-verify by</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {rows.map((w) => (
                  <WalletRows
                    key={w.id}
                    wallet={w}
                    canManage={canManage}
                    editing={editing === w.id}
                    onEdit={() => setEditing(editing === w.id ? null : w.id)}
                    onDone={() => setEditing(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      )}
    </div>
  );
}

function WalletRows({
  wallet: w,
  canManage,
  editing,
  onEdit,
  onDone,
}: {
  wallet: CustomerWallet;
  canManage: boolean;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  const overdue = !!w.reverify_at && new Date(w.reverify_at).getTime() < Date.now();
  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-navy-600/50">
        <td className={TD}>{w.network}</td>
        <td className={`${TD} font-mono text-xs`}>{w.address_masked}</td>
        <td className={TD}><ActionBadge action={w.ownership_status} /></td>
        <td className={`${TD} text-gray-600 dark:text-gray-300`}>{statusLabel(w.ownership_method)}</td>
        <td className={`${TD} text-gray-600 dark:text-gray-300`}>{fmtDate(w.verified_at)}</td>
        <td className={`${TD} ${overdue ? "text-red-600 dark:text-red-300" : "text-gray-600 dark:text-gray-300"}`}>
          {fmtDate(w.reverify_at)}
          {overdue && " (overdue)"}
        </td>
        <td className={TD}>
          {canManage && (
            <button onClick={onEdit} className="text-xs font-medium text-primary hover:underline">
              {editing ? "Close" : "Edit"}
            </button>
          )}
        </td>
      </tr>
      {editing && canManage && <EditRow wallet={w} onDone={onDone} />}
    </>
  );
}
