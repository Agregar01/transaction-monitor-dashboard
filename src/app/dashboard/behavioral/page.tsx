"use client";

import { useState } from "react";
import Link from "next/link";
import { useGetBehavioralRiskQuery } from "@/redux/slices/api/analyticsApi";
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
              caption="A single device used by multiple customers — possible account-farming or a fraud ring operating many identities."
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
                      <tr key={d.device_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
                        <td className={`${TD} font-mono`}>{id8(d.device_id)}</td>
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
                            {!d.sim_swap && !d.imei_change && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
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
