"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useGetBehavioralRiskQuery,
  useGetDeviceAssociationsQuery,
} from "@/redux/slices/api/analyticsApi";
import type { DeviceSharingSignal } from "@/types/api";
import StatCard from "@/components/StatCard";
import QueryState from "@/components/QueryState";
import {
  UserGroupIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

const PERIODS = [30, 60, 90] as const;

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function id8(v: string | null) {
  return v ? `${v.slice(0, 8)}…` : "—";
}

/** A signal section: heading, plain-language "what this means", and its table. */
function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{caption}</p>
      </div>
      {children}
    </section>
  );
}

const TH = "px-5 py-2 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400";
const TD = "px-5 py-2.5 text-sm text-gray-900 dark:text-white";

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/** A small labelled row of monospace chips (e.g. the ICCID / IMEI / MNO chain). */
function IdChips({ label, values }: { label: string; values: string[] }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-gray-400 mr-1">{label}</span>
      {values.map((v) => (
        <span
          key={v}
          className="px-2 py-0.5 rounded bg-gray-100 dark:bg-navy-800 font-mono text-[11px] text-gray-700 dark:text-gray-300"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

/**
 * One shared-device row that expands to its associations: every customer
 * identity that transacted on the device, plus the SIM/handset IDs seen on it.
 * The drill-down query is skipped until the row is opened.
 */
function DeviceRow({ d }: { d: DeviceSharingSignal }) {
  const [open, setOpen] = useState(false);
  const { data, isFetching, isError } = useGetDeviceAssociationsQuery(
    { device_id: d.device_id },
    { skip: !open },
  );

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-navy-600 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className={`${TD} font-mono`}>
          <span className="inline-block w-3 text-gray-400 select-none">{open ? "▾" : "▸"}</span>{" "}
          {id8(d.device_id)}
        </td>
        <td className={TD}>
          <span className="font-semibold text-rose-500">{d.distinct_customers}</span>
        </td>
        <td className={`${TD} font-mono`}>{id8(d.last_customer)}</td>
        <td className={TD}>
          <div className="flex gap-1.5 flex-wrap">
            {d.sim_swap && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                SIM SWAP
              </span>
            )}
            {d.imei_change && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                IMEI CHANGE
              </span>
            )}
            {!d.sim_swap && !d.imei_change && <span className="text-xs text-gray-400">—</span>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/70 dark:bg-navy-800/40">
          <td className={`${TD} align-top`} colSpan={4}>
            {isFetching ? (
              <p className="text-sm text-gray-400 py-1">Loading associations…</p>
            ) : isError || !data ? (
              <p className="text-sm text-gray-400 py-1">Couldn&apos;t load associations for this device.</p>
            ) : (
              <div className="space-y-4 py-1">
                {(data.iccids.length > 0 || data.msisdns.length > 0 || data.imeis.length > 0 || data.mnos.length > 0) && (
                  <div className="space-y-1.5">
                    <IdChips label="Phone (MSISDN)" values={data.msisdns} />
                    <IdChips label="SIM (ICCID)" values={data.iccids} />
                    <IdChips label="Handset (IMEI)" values={data.imeis} />
                    <IdChips label="Carrier (MNO)" values={data.mnos} />
                  </div>
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
                    Associated customers ({data.distinct_customers})
                  </p>
                  {data.customers.length === 0 ? (
                    <p className="text-sm text-gray-400">No associated customers found.</p>
                  ) : (
                    <table className="w-full max-w-2xl">
                      <thead>
                        <tr>
                          <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 pb-1 pr-4">Customer</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 pb-1 pr-4">Customer ID</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 pb-1 pr-4">Txns</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 pb-1 pr-4">First seen</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 pb-1">Last seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.customers.map((c) => (
                          <tr key={c.customer_id}>
                            <td className="py-1 pr-4 text-[13px] text-gray-900 dark:text-white">{c.name || <span className="text-gray-400">—</span>}</td>
                            <td className="py-1 pr-4 font-mono text-[13px] text-gray-500 dark:text-gray-400">{c.customer_id}</td>
                            <td className="py-1 pr-4 text-[13px] text-gray-700 dark:text-gray-300">{c.transactions}</td>
                            <td className="py-1 pr-4 text-[13px] text-gray-500 dark:text-gray-400">{fmtDate(c.first_seen)}</td>
                            <td className="py-1 text-[13px] text-gray-500 dark:text-gray-400">{fmtDate(c.last_seen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function BehavioralFraudPage() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const { data, isLoading, isError, error } = useGetBehavioralRiskQuery({
    period_days: periodDays,
    limit: 20,
  });

  const empty =
    !!data &&
    data.total_mule_signals === 0 &&
    data.total_card_testing === 0 &&
    data.total_device_sharing === 0 &&
    data.total_sim_swaps === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Behavioral Fraud Intelligence
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            SEON-style behavioral signals — patterns that look normal one transaction at a
            time but reveal fraud across a customer&apos;s or device&apos;s history.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-navy-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriodDays(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodDays === p
                  ? "bg-white dark:bg-navy-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={empty}
        emptyMessage="No behavioral fraud signals in this period."
        rows={6}
        cols={4}
      >
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Mule accounts"
                value={data.total_mule_signals}
                subtitle="High inbound, low outbound"
                color="text-amber-500"
                icon={<UserGroupIcon className="h-6 w-6" />}
              />
              <StatCard
                title="Card testing"
                value={data.total_card_testing}
                subtitle="Bursts of micro-transactions"
                color="text-orange-500"
                icon={<CreditCardIcon className="h-6 w-6" />}
              />
              <StatCard
                title="Shared devices"
                value={data.total_device_sharing}
                subtitle="One device, many customers"
                color="text-rose-500"
                icon={<DevicePhoneMobileIcon className="h-6 w-6" />}
              />
              <StatCard
                title="SIM swaps"
                value={data.total_sim_swaps}
                subtitle="SIM changed on a known device"
                color="text-red-500"
                icon={<ArrowsRightLeftIcon className="h-6 w-6" />}
              />
            </div>

            <Section
              title="Mule account pattern"
              caption="Accounts taking in far more than they pay out — a hallmark of money being funnelled through a third party."
            >
              {data.mule_signals.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">No mule signals.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-navy-800">
                    <tr>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Inbound count</th>
                      <th className={TH}>Inbound total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {data.mule_signals.map((m) => (
                      <tr key={m.customer_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                        <td className={`${TD} font-mono`}>
                          <Link
                            href={`/dashboard/customers/${m.customer_id}`}
                            className="text-primary hover:underline"
                          >
                            {id8(m.customer_id)}
                          </Link>
                        </td>
                        <td className={TD}>{m.inbound_count}</td>
                        <td className={TD}>{fmtMoney(m.inbound_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section
              title="Card-testing / micro-transactions"
              caption="Many tiny transactions in a short window — fraudsters validating stolen card or wallet credentials before a big hit."
            >
              {data.card_testing_signals.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">No card-testing signals.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-navy-800">
                    <tr>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Micro-transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {data.card_testing_signals.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                        <td className={`${TD} font-mono`}>
                          <Link
                            href={`/dashboard/customers/${c.customer_id}`}
                            className="text-primary hover:underline"
                          >
                            {id8(c.customer_id)}
                          </Link>
                        </td>
                        <td className={TD}>{c.micro_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section
              title="Device sharing"
              caption="A single device used by multiple customers — possible account-farming or a fraud ring operating many identities. Click a row to see every associated customer ID and the SIM/handset IDs seen on the device."
            >
              {data.device_sharing.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">No shared devices.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-navy-800">
                    <tr>
                      <th className={TH}>Device</th>
                      <th className={TH}>Distinct customers</th>
                      <th className={TH}>Last customer</th>
                      <th className={TH}>Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {data.device_sharing.map((d) => (
                      <DeviceRow key={d.device_id} d={d} />
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section
              title="SIM-swap detection"
              caption="The SIM card changed on a device with an established history — a classic account-takeover precursor."
            >
              {data.sim_swaps.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">No SIM swaps detected.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-navy-800">
                    <tr>
                      <th className={TH}>Device</th>
                      <th className={TH}>Last customer</th>
                      <th className={TH}>Previous SIM</th>
                      <th className={TH}>Current SIM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {data.sim_swaps.map((s) => (
                      <tr key={s.device_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                        <td className={`${TD} font-mono`}>{id8(s.device_id)}</td>
                        <td className={`${TD} font-mono`}>{id8(s.last_customer)}</td>
                        <td className={`${TD} font-mono text-gray-500 dark:text-gray-400`}>
                          {id8(s.prev_iccid)}
                        </td>
                        <td className={`${TD} font-mono`}>{id8(s.last_iccid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </>
        )}
      </QueryState>
    </div>
  );
}
