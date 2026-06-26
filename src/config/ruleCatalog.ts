// AUTO-GENERATED from transaction-monitor rule_definitions.py — do not edit by hand.
// Static reference for the preconfigured (Python) detection rules so the
// dashboard can show real trigger logic + rationale instead of {"type":"python"}.

export interface RuleCatalogEntry {
  name: string;
  category: string;
  severity: string;
  riskContribution: number | null;
  trigger: string | null;
  reason: string | null;
}

export const RULE_CATALOG: Record<string, RuleCatalogEntry> = {
  "R-A01": {
    "name": "High value transaction",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 40,
    "trigger": "amount > 10,000",
    "reason": "Amount amount exceeds high-value threshold 10,000"
  },
  "R-A02": {
    "name": "Daily aggregate",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 30,
    "trigger": "sum 24h > 50,000",
    "reason": "24h transaction sum sum 24h exceeds threshold 50,000 (count 24h transactions)"
  },
  "R-A03": {
    "name": "Structuring",
    "category": "Amount",
    "severity": "Critical",
    "riskContribution": 60,
    "trigger": "near threshold count 7d >= 3",
    "reason": "Detected near threshold count 7d transactions just below reporting threshold in last 7 days. Possible structuring."
  },
  "R-A04": {
    "name": "PEP transaction",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "is pep is True and amount > 5,000",
    "reason": "PEP account transacting amount above 5,000"
  },
  "R-A05": {
    "name": "New account large transaction",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "( account age days < 30 and amount > 5,000 )",
    "reason": "Account only account age days days old transacting amount"
  },
  "R-A06": {
    "name": "Round number pattern",
    "category": "Amount",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "amount >= 1000.0 and amount % 1000.0 == 0.0",
    "reason": "Round number transaction of amount \u2014 common structuring pattern"
  },
  "R-V01": {
    "name": "Frequency spike",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 60,
    "trigger": null,
    "reason": null
  },
  "R-V02": {
    "name": "Rapid sequence",
    "category": "Velocity",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "count 1h > 10",
    "reason": "Detected count 1h transactions in 1 hour, exceeds threshold of 10"
  },
  "R-V03": {
    "name": "Burst activity",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "count 15m >= 5",
    "reason": "Detected count 15m transactions in 15 minutes, exceeds threshold of 5"
  },
  "R-V04": {
    "name": "ATM burst",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 40,
    "trigger": "channel == \"ATM\" and count 24h >= 5",
    "reason": "count 24h ATM transactions in 24h"
  },
  "R-V05": {
    "name": "Night burst",
    "category": "Velocity",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": null,
    "reason": "Night-time burst: count 1h transactions in 1h during off-hours (00:00-04:59)"
  },
  "R-V06": {
    "name": "Weekly volume spike",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "sum 7d > 350,000",
    "reason": "7-day volume sum 7d exceeds weekly threshold 350,000"
  },
  "R-V07": {
    "name": "Rolling average elevated",
    "category": "Velocity",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": null,
    "reason": "30-day rolling average avg amount 30d is 3\u00d7 above baseline baseline avg amount"
  },
  "R-B01": {
    "name": "Amount deviation",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": null,
    "reason": null
  },
  "R-B02": {
    "name": "Dormant activation",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 60,
    "trigger": null,
    "reason": "Account dormant for days since last txn days (>90), then withdrawal initiated"
  },
  "R-B03": {
    "name": "Counterparty spike",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": null,
    "reason": null
  },
  "R-B04": {
    "name": "Geographic anomaly",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": null,
    "reason": "Transaction to unusual country (receiver country) with amount (amount) > threshold (1,000). Typical countries: baseline typical countries"
  },
  "R-B05": {
    "name": "High risk customer",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "( customer risk score >= 75 and amount >= 1,000 )",
    "reason": "Customer risk score customer risk score (\u226575) transacting amount"
  },
  "R-B06": {
    "name": "New account high velocity",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 40,
    "trigger": "( account age days < 30 and count 7d >= 10 )",
    "reason": "Account account age days days old with count 7d transactions in 7 days"
  },
  "R-B07": {
    "name": "Watchlisted customer transaction",
    "category": "Behavioral",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": "is watchlisted is True",
    "reason": "Customer is on an active watchlist \u2014 all transactions require review"
  },
  "R-B08": {
    "name": "Sustained amount elevation",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": null,
    "reason": "30-day avg avg amount 30d is 2\u00d7 above baseline baseline avg amount \u2014 sustained above-normal activity"
  },
  "R-B09": {
    "name": "Recent acceleration",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": null,
    "reason": "Last 30d volume sum 30d is 2\u00d7 prior 30d {max(0.0, (sum 60d or 0.0) - (sum 30d or 0.0)):,.2f} \u2014 accelerating activity"
  },
  "R-N01": {
    "name": "Pass-through pattern",
    "category": "Network",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "pass through count 7d >= 3",
    "reason": "Detected pass through count 7d pass-through patterns (deposit followed by equivalent withdrawal within 48h)"
  },
  "R-N02": {
    "name": "Mule account",
    "category": "Network",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "( customer type == \"Individual\" and unique counterparties 30d > 20 )",
    "reason": "Individual account with unique counterparties 30d unique counterparties in 30 days (threshold: 20). Possible mule account."
  },
  "R-N03": {
    "name": "Circular flow",
    "category": "Network",
    "severity": "Critical",
    "riskContribution": 75,
    "trigger": "circular flow count 7d >= 1",
    "reason": "Detected circular flow count 7d potential circular flow patterns within 72h window"
  },
  "R-N04": {
    "name": "Symmetric bilateral",
    "category": "Network",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "symmetric bilateral count 7d >= 1",
    "reason": "Detected symmetric bilateral count 7d symmetric bilateral flows (matched amounts between counterparties within 7 days)"
  },
  "R-N05": {
    "name": "Smurfing",
    "category": "Network",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": "smurfing sender count 30d >= 5",
    "reason": "Detected smurfing pattern: smurfing sender count 30d senders with similar deposit amounts in 30 days"
  },
  "R-N06": {
    "name": "Receiver in watchlist",
    "category": "Network",
    "severity": "Critical",
    "riskContribution": 75,
    "trigger": "receiver in watchlist is True",
    "reason": "Transaction receiver is on an active watchlist or sanctions list"
  },
  "R-N07": {
    "name": "Fan-out dispersal",
    "category": "Network",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( unique counterparties 7d >= 10 and sum 7d > 10,000 )",
    "reason": "unique counterparties 7d unique counterparties in 7 days with sum 7d total volume \u2014 fan-out dispersal pattern"
  },
  "R-N08": {
    "name": "Counterparty concentration",
    "category": "Network",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": null,
    "reason": "unique counterparties 7d of unique counterparties 30d 30-day counterparties appeared in last 7 days \u2014 rapid network expansion"
  },
  "R-AF01": {
    "name": "Mobile money rapid layering",
    "category": "Africa",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": null,
    "reason": "Mobile money layering: pass through count 7d pass-through legs in 7 days with count 1h transactions in current hour via Momo. Rapid A\u2192B\u2192C dispersal pattern detected."
  },
  "R-AF02": {
    "name": "Agent-assisted structuring",
    "category": "Africa",
    "severity": "Critical",
    "riskContribution": 65,
    "trigger": null,
    "reason": "Agent-assisted structuring: unique senders 30d unique senders in 30 days with near threshold count 7d near-threshold transactions in 7 days. Possible agent collecting sub-threshold deposits from multiple parties."
  },
  "R-AF03": {
    "name": "Cross-border hawala pattern",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 55,
    "trigger": null,
    "reason": "Hawala pattern: count 7d transfers in 7 days to FATF high-risk jurisdiction (receiver country) with amounts \u2264 2,000. Frequent low-value cross-border transfers consistent with informal value transfer."
  },
  "R-AF04": {
    "name": "SIM-swap cashout proxy",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 60,
    "trigger": null,
    "reason": "Possible SIM-swap: channel 'channel' not in baseline channels baseline typical channels with transaction type of amount (1.5\u00d7 baseline avg baseline avg amount). Account last active days since last txn days ago."
  },
  "R-AF05": {
    "name": "PEP transaction (Africa)",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "is pep is True and amount > 1,000",
    "reason": "PEP transaction of amount in African jurisdiction \u2014 enhanced due diligence required"
  },
  "R-AF06": {
    "name": "Agent channel large transaction",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "channel == \"Agent\" and amount > 5,000",
    "reason": "Agent channel transaction of amount exceeds typical agent limit \u2014 possible agent network abuse"
  },
  "R-AF07": {
    "name": "Reactivation outflow",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 60,
    "trigger": null,
    "reason": "Account inactive days since last txn days reactivated with transaction type of amount (2\u00d7 baseline baseline avg amount)"
  },
  "R-AF08": {
    "name": "Sanctions crossborder",
    "category": "Africa",
    "severity": "Critical",
    "riskContribution": 85,
    "trigger": "( receiver in watchlist is True and country in fatf high risk is True )",
    "reason": "Transaction to watchlisted receiver in FATF high-risk jurisdiction \u2014 dual sanctions/geography flag"
  },
  "R-TR01": {
    "name": "Travel Rule violation",
    "category": "Compliance",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": null,
    "reason": "FATF R.16 Travel Rule violation: cross-border transfer above threshold is missing required originator/beneficiary information. Required fields: originator name + account + (address or national ID), beneficiary name + account."
  },
  "R-DF01": {
    "name": "Rooted/jailbroken device",
    "category": "Device",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "rooted device is True",
    "reason": "Transaction from rooted or jailbroken device \u2014 bypasses OS security controls and enables credential theft"
  },
  "R-DF02": {
    "name": "SIM swap detected",
    "category": "Device",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "sim swapped is True",
    "reason": "ICCID changed since last transaction \u2014 classic SIM-swap account takeover signal; verify customer identity immediately"
  },
  "R-DF03": {
    "name": "Shared device (mule network)",
    "category": "Device",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "device shared is True",
    "reason": "Device used by multiple customers in the last 30 days \u2014 common mule account signal; potential device-sharing fraud network"
  },
  "R-DF04": {
    "name": "Burner device",
    "category": "Device",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "burner device is True",
    "reason": "App installed today on a device never seen before \u2014 throwaway device signal consistent with one-time fraud accounts"
  },
  "R-B12": {
    "name": "Round number pattern",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": "( amount >= 5,000 and amount % 500 == 0 and count 7d >= 3 )",
    "reason": "Amount amount is a round multiple of 500 with count 7d transactions in 7 days \u2014 repeated round-number pattern consistent with structuring or layering"
  },
  "R-B13": {
    "name": "Transfer to watchlisted receiver",
    "category": "Behavioral",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": "( receiver in watchlist is True and amount > 1,000 )",
    "reason": "Receiver (receiver id) is on an active sanctions or watchlist \u2014 transfer of amount requires immediate review"
  },
  "R-B14": {
    "name": "Extreme single-transaction spike",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( (avg amount 30d or 0) > 0 and amount > (avg amount 30d or 0) * 10 )",
    "reason": "Transaction amount amount is amount\u00d7 the 30-day average avg amount 30d \u2014 far outside the customer's established pattern"
  },
  "R-B15": {
    "name": "Dormant account burst reactivation",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( (days since last txn or 0) > 30 and count 7d >= 5 )",
    "reason": "Account dormant days since last txn days then count 7d transactions in 7 days \u2014 reactivation burst pattern associated with account takeover or sale"
  },
  "R-B16": {
    "name": "Near-CTR single transaction",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "45,000 <= amount < 50,000",
    "reason": "Transaction of amount falls in the [45,000\u201350,000) band \u2014 single transaction deliberately structured just below CTR threshold"
  },
  "R-B17": {
    "name": "Near-STR single transaction",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": "18,000 <= amount < 20,000",
    "reason": "Transaction of amount falls in the [18,000\u201320,000) band \u2014 deliberate positioning just below STR reporting threshold"
  },
  "R-B18": {
    "name": "Single-day volume concentration",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "( sum 7d > 0 and sum 24h > sum 7d * 0.6 )",
    "reason": "24-hour volume sum 24h is sum 24h% of the 7-day total sum 7d \u2014 abnormal single-day concentration relative to weekly pattern"
  },
  "R-B19": {
    "name": "Off-hours large transfer",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "( hour of day <= 5 and amount > 5,000 )",
    "reason": "Transfer of amount at hour of day:xx \u2014 large transaction during off-hours (midnight\u201305:59) when supervisory controls are reduced"
  },
  "R-B20": {
    "name": "Weekend high-value transaction",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": "( is weekend is True and amount > 10,000 )",
    "reason": "High-value transaction of amount on a weekend \u2014 large transfers outside banking hours may exploit reduced oversight"
  },
  "R-B21": {
    "name": "PEP transaction above CTR threshold",
    "category": "Behavioral",
    "severity": "Critical",
    "riskContribution": 75,
    "trigger": "( is pep is True and amount > 50,000 )",
    "reason": "PEP customer transacting amount, which exceeds the CTR threshold of 50,000 \u2014 mandatory enhanced due diligence and CTR filing required"
  },
  "R-B22": {
    "name": "Individual acting as business",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( customer type == \"Individual\" and unique counterparties 7d >= 20 and count 7d >= 15 )",
    "reason": "Individual account with unique counterparties 7d unique counterparties and count 7d transactions in 7 days \u2014 commercial-scale activity inconsistent with personal account classification"
  },
  "R-B23": {
    "name": "Recent amount escalation trend",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "( (avg amount 60d or 0) > 0 and (avg amount 30d or 0) > (avg amount 60d or 0) * 1.5 )",
    "reason": "30-day average avg amount 30d is 1.5\u00d7 the 60-day average avg amount 60d \u2014 rapid escalation in transaction sizes over recent weeks"
  },
  "R-B24": {
    "name": "Extended dormancy reactivation high value",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( (days since last txn or 0) > 180 and amount > 5,000 )",
    "reason": "Account inactive for days since last txn days (>180d) then a amount transaction \u2014 long-dormant account making a large first transaction is a high-risk signal"
  },
  "R-B25": {
    "name": "Individual receiving from many senders",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( customer type == \"Individual\" and unique senders 30d >= 10 )",
    "reason": "Individual account receiving from unique senders 30d unique senders in 30 days \u2014 fan-in pattern atypical for personal accounts; possible aggregator, mule, or unreported business activity"
  },
  "R-B26": {
    "name": "Daily count spike vs baseline",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "( (baseline daily count or 0) > 0 and count 24h >= 3 and count 24h > (baseline daily count or 0) * 5 )",
    "reason": "Today's transaction count (count 24h) is count 24h\u00d7 the baseline daily average (baseline daily count) \u2014 sharp single-day frequency spike"
  },
  "R-B27": {
    "name": "Very new account large transaction",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "( account age days < 7 and amount > 5,000 )",
    "reason": "Account only account age days days old transacting amount \u2014 accounts transacting large amounts within the first week are strongly associated with synthetic identity fraud"
  },
  "R-B28": {
    "name": "Extreme recent volume surge",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( (sum 90d or 0) > (sum 30d or 0) and (sum 90d - sum 30d) > 0 and (sum 30d or 0) > (sum 90d - sum 30d) * 3 )",
    "reason": "Last 30-day volume sum 30d is 3\u00d7 the prior 60-day volume {max(0.0, (sum 90d or 0.0) - (sum 30d or 0.0)):,.2f} \u2014 extreme recent surge relative to longer-term history"
  },
  "R-B29": {
    "name": "Transaction far above personal maximum",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( (max amount 30d or 0) > 0 and amount > (max amount 30d or 0) * 3 )",
    "reason": "Transaction amount is amount\u00d7 the prior 30-day maximum max amount 30d \u2014 exceeds the customer's observed personal ceiling"
  },
  "R-B30": {
    "name": "Withdrawal drain pattern",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( withdrawal count 7d >= 5 and ( (deposit count 7d or 0) == 0 or withdrawal count 7d > (deposit count 7d or 0) * 3 ) )",
    "reason": "withdrawal count 7d withdrawals vs deposit count 7d deposits in 7 days \u2014 systematic account draining pattern consistent with fraud-driven cash-out"
  },
  "R-B31": {
    "name": "Medium-risk customer new foreign counterparty",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": "( customer risk score >= 60 and receiver country is not None and receiver country != country code and bool(baseline typical countries) and receiver country not in (baseline typical countries or []) )",
    "reason": "Customer (risk score customer risk score) sending to new foreign country receiver country outside baseline baseline typical countries \u2014 elevated-risk customer expanding to untypical international corridors"
  },
  "R-A07": {
    "name": "Low-value probe transaction",
    "category": "Amount",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": "( amount < 1.0 and count 1h >= 3 )",
    "reason": "Sub-unit probe amount (amount) with count 1h transactions in the last hour \u2014 classic account validation / carding probe pattern"
  },
  "R-A08": {
    "name": "FATF high-risk jurisdiction large transfer",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( country in fatf high risk is True and amount > 5_000.0 )",
    "reason": "Transfer of amount to/from FATF high-risk jurisdiction (receiver country) \u2014 elevated AML risk per FATF guidance"
  },
  "R-V08": {
    "name": "Rapid withdrawal burst",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( transaction type == \"Withdrawal\" and count 15m >= 3 )",
    "reason": "count 15m withdrawals in 15 minutes \u2014 rapid cash-out burst consistent with account takeover or mule activity"
  },
  "R-B10": {
    "name": "New account PEP transaction",
    "category": "Behavioral",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "( account age days < 30 and is pep is True )",
    "reason": "Account opened account age days days ago; customer is PEP \u2014 new accounts transacting for PEP customers require enhanced due diligence"
  },
  "R-B11": {
    "name": "Channel change after extended dormancy",
    "category": "Behavioral",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "( days since last txn > 30 and channel not in (baseline typical channels or []) and bool(baseline typical channels) )",
    "reason": "Account dormant for days since last txn days, now active on channel 'channel' which is outside baseline baseline typical channels \u2014 possible account takeover"
  },
  "R-N09": {
    "name": "Fan-in fan-out mule pattern",
    "category": "Network",
    "severity": "High",
    "riskContribution": 65,
    "trigger": "( unique senders 30d >= 5 and pass through count 7d >= 2 )",
    "reason": "unique senders 30d unique senders in 30 days with pass through count 7d pass-through flows in 7 days \u2014 classic mule account collecting and re-transmitting funds"
  },
  "R-N10": {
    "name": "New account counterparty flood",
    "category": "Network",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( account age days < 60 and unique counterparties 7d >= 15 )",
    "reason": "Account only account age days days old with unique counterparties 7d unique counterparties in 7 days \u2014 abnormal counterparty velocity for a new account"
  },
  "R-AF09": {
    "name": "Agent-assisted cross-border transfer",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( channel == \"Agent\" and receiver country != country code and amount > 1_000.0 )",
    "reason": "Agent channel cross-border transfer of amount from country code to receiver country \u2014 agent-mediated remittances above threshold require enhanced screening"
  },
  "R-AF10": {
    "name": "MoMo FATF high-risk above local threshold",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "( channel == \"Momo\" and country in fatf high risk is True and amount > 500.0 )",
    "reason": "Mobile money transfer of amount involving FATF high-risk jurisdiction (receiver country) \u2014 MoMo + high-risk corridor combination requires FATF R.16 screening"
  },
  "R-DF05": {
    "name": "New device large withdrawal or transfer",
    "category": "Device",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "( new device is True and transaction type in (\"Withdrawal\", \"Transfer\") and amount > 5_000.0 )",
    "reason": "First-seen device initiating a transaction type of amount \u2014 new device + high-value cash-out is a primary account takeover indicator"
  },
  "R-DF06": {
    "name": "Location anomaly with significant amount",
    "category": "Device",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": "( location anomaly is True and amount > 2_000.0 )",
    "reason": "Transaction of amount from a location outside the customer's established geo-pattern \u2014 geo-anomaly + elevated amount consistent with card-present fraud or account takeover"
  },
  "R-TR02": {
    "name": "PEP cross-border missing travel rule info",
    "category": "Compliance",
    "severity": "Critical",
    "riskContribution": 75,
    "trigger": "( is pep is True and travel rule required is True and not travel rule compliant )",
    "reason": "Cross-border transfer by a PEP customer is missing required Travel Rule originator/beneficiary information \u2014 FATF R.16 violation; transaction must be held pending information collection"
  },
  "R-DF07": {
    "name": "IMEI change detected",
    "category": "Device",
    "severity": "Critical",
    "riskContribution": 75,
    "trigger": "imei changed is True",
    "reason": "Hardware IMEI changed under the same device_id \u2014 a genuine handset cannot change its IMEI; this indicates identifier spoofing, device substitution, or fraudulent device cloning"
  },
  "R-DF08": {
    "name": "Carrier switch without SIM swap",
    "category": "Device",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "mno changed is True",
    "reason": "Mobile network operator changed without a corresponding SIM (ICCID) change \u2014 consistent with number porting fraud, SIM cloning (one ICCID active on multiple networks), or deliberate MNO identifier falsification"
  },
  "R-DF09": {
    "name": "OS version change",
    "category": "Device",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "( os changed is True and amount > 2,000 )",
    "reason": "OS version changed since last transaction, combined with a transaction of amount \u2014 OS downgrades are a known step in jailbreaking/rooting workflows and may indicate active device compromise"
  },
  "R-DF10": {
    "name": "SIM swap followed by high-value transaction",
    "category": "Device",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": "( sim swapped is True and amount > 3,000 )",
    "reason": "SIM swap detected (ICCID changed) on a transaction of amount \u2014 post-SIM-swap high-value transfers are the most common account takeover cash-out pattern"
  },
  "R-DF11": {
    "name": "New device with location anomaly",
    "category": "Device",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "( new device is True and location anomaly is True )",
    "reason": "First-seen device operating in a country that disagrees with the SIM's home network (MCC mismatch) \u2014 new device + geo-anomaly is a high-confidence account takeover signal"
  },
  "R-DF12": {
    "name": "Shared device SIM swap",
    "category": "Device",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": "( device shared is True and sim swapped is True )",
    "reason": "Device used by multiple customers (mule network signal) AND SIM swap detected \u2014 the combination strongly indicates an organised fraud network conducting coordinated account takeovers"
  },
  "R-DF13": {
    "name": "Compound device risk (2+ signals)",
    "category": "Device",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "_compound_device_risk_score(t) >= 2",
    "reason": "{_compound_device_risk_score(t)} device risk signals active simultaneously \u2014 each signal is suspicious alone; their co-occurrence indicates a co-ordinated attack or heavily compromised device"
  },
  "R-DF14": {
    "name": "Shared device high-value transaction",
    "category": "Device",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( device shared is True and amount > 3,000 )",
    "reason": "Device used by multiple customers transacting amount \u2014 high-value transaction on a device linked to multiple accounts may indicate a mule network collecting and cashing out at scale"
  },
  "R-DF15": {
    "name": "Bot typing speed",
    "category": "Device",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "bot typing speed is True",
    "reason": "Keystroke timing outside the human range (< 80 ms or > 3000 ms between keystrokes) \u2014 strong indicator of scripted automation or bot-driven credential entry rather than a genuine customer"
  },
  "R-DF16": {
    "name": "Paste-heavy form entry",
    "category": "Device",
    "severity": "Medium",
    "riskContribution": 30,
    "trigger": "paste heavy is True",
    "reason": "Paste events detected during transaction form entry \u2014 consistent with credential-stuffing attacks where stolen credentials are pasted directly rather than typed by the account owner"
  },
  "R-DF17": {
    "name": "No mouse movement (scripted session)",
    "category": "Device",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "no mouse movement is True",
    "reason": "Zero mouse entropy recorded for the session \u2014 human users produce irregular cursor movement; absence indicates a scripted or automated transaction flow with no genuine user interaction"
  },
  "R-DF18": {
    "name": "Speed-run session (< 4 s)",
    "category": "Device",
    "severity": "Medium",
    "riskContribution": 35,
    "trigger": "speed run session is True",
    "reason": "Session completed in under 4 seconds \u2014 far below the minimum time a human requires to read, fill, and submit a payment form; consistent with automated transaction submission"
  },
  "R-DF19": {
    "name": "Headless browser resolution",
    "category": "Device",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "headless resolution is True",
    "reason": "Screen resolution matches a known headless-browser default (800\u00d7600, 1024\u00d7768, 1280\u00d7720, 640\u00d7480) \u2014 strong indicator that the transaction was initiated by an automated headless browser rather than a real device"
  },
  "R-DF20": {
    "name": "Browser fingerprint changed",
    "category": "Device",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": "browser fingerprint changed is True",
    "reason": "Browser fingerprint (canvas hash, plugin list, font metrics) differs from the last known value for this device \u2014 may indicate a different browser, private/incognito mode rotation, or deliberate fingerprint spoofing to evade device tracking"
  },
  "R-DF21": {
    "name": "Auto-filled form submission",
    "category": "Device",
    "severity": "Low",
    "riskContribution": 15,
    "trigger": "auto filled is True",
    "reason": "Transaction form was auto-filled by the browser or a third-party password manager \u2014 low signal on its own but elevates risk when combined with other automation indicators"
  },
  "R-DF22": {
    "name": "Compound behavioural automation (2+ signals)",
    "category": "Device",
    "severity": "High",
    "riskContribution": 65,
    "trigger": "_compound_behavioural_score(t) >= 2",
    "reason": "{_compound_behavioural_score(t)} behavioural automation signals active simultaneously \u2014 co-occurring signals (e.g. headless resolution + zero mouse movement + bot typing) indicate a high-confidence automated attack rather than an isolated anomaly"
  },
  "R-A09": {
    "name": "7-day aggregate elevated",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 40,
    "trigger": "sum 7d > 350,000",
    "reason": "7-day transaction total sum 7d exceeds weekly aggregate threshold 350,000 \u2014 sustained high-volume activity"
  },
  "R-A10": {
    "name": "30-day aggregate elevated",
    "category": "Amount",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "sum 30d > 1,000,000",
    "reason": "30-day transaction total sum 30d exceeds monthly threshold 1,000,000"
  },
  "R-A11": {
    "name": "Nigeria cash CTR threshold",
    "category": "Amount",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "( country code == \"NG\" and transaction type == \"Withdrawal\" and amount >= 5,000,000 )",
    "reason": "Nigerian cash withdrawal of amount NGN meets or exceeds NFIU cash CTR threshold (5,000,000 NGN) \u2014 mandatory CTR filing required"
  },
  "R-A12": {
    "name": "Nigeria non-cash CTR threshold",
    "category": "Amount",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "( country code == \"NG\" and transaction type in (\"Transfer\", \"Deposit\") and amount >= 10,000,000 )",
    "reason": "Nigerian non-cash transaction of amount NGN meets or exceeds NFIU non-cash CTR threshold (10,000,000 NGN) \u2014 mandatory CTR filing"
  },
  "R-A13": {
    "name": "Kenya CTR equivalent threshold",
    "category": "Amount",
    "severity": "Critical",
    "riskContribution": 65,
    "trigger": "( country code == \"KE\" and amount > 2,000,000 )",
    "reason": "Kenyan transaction of amount KES exceeds FRC CTR equivalent threshold (2,000,000 KES \u2248 USD 15,000) \u2014 CTR filing required"
  },
  "R-A14": {
    "name": "Flash structuring (15-minute aggregate)",
    "category": "Amount",
    "severity": "Critical",
    "riskContribution": 65,
    "trigger": "sum 15m >= 45,000",
    "reason": "15-minute aggregate sum 15m approaches CTR threshold (45,000) \u2014 rapid burst of transactions just below the reporting threshold is a coordinated structuring signal"
  },
  "R-V09": {
    "name": "Monthly high-frequency threshold",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 45,
    "trigger": "count 30d > 150",
    "reason": "count 30d transactions in the last 30 days exceeds the monthly frequency threshold (150) \u2014 abnormally high transaction volume consistent with layering or mule account activity"
  },
  "R-V10": {
    "name": "Recent week velocity acceleration",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 45,
    "trigger": null,
    "reason": "Last 7 days: count 7d transactions vs monthly average weekly rate {(count 30d / 4.0):.1f} \u2014 this week is 2.5\u00d7 the usual weekly pace"
  },
  "R-V11": {
    "name": "MoMo channel burst",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( channel == \"Momo\" and count 1h >= 5 )",
    "reason": "count 1h mobile money transactions in 1 hour \u2014 rapid MoMo burst exceeds 5 in 60 minutes"
  },
  "R-V12": {
    "name": "High-frequency sub-threshold pattern",
    "category": "Velocity",
    "severity": "Medium",
    "riskContribution": 40,
    "trigger": "( count 24h >= 15 and amount < 500 )",
    "reason": "count 24h transactions in 24h with current amount amount (< 500) \u2014 high-frequency low-value pattern consistent with carding probes or structuring"
  },
  "R-V13": {
    "name": "Transfer velocity spike",
    "category": "Velocity",
    "severity": "High",
    "riskContribution": 50,
    "trigger": "( transaction type == \"Transfer\" and count 1h >= 8 )",
    "reason": "count 1h outbound transfers in 1 hour \u2014 transfer burst exceeds 8 in 60 minutes; rapid fund dispersal via transfers is a primary layering signal"
  },
  "R-TR03": {
    "name": "Large amount travel rule violation",
    "category": "Compliance",
    "severity": "Critical",
    "riskContribution": 85,
    "trigger": "( travel rule required is True and travel rule compliant is False and amount > 10,000 )",
    "reason": "FATF R.16 violation on a high-value transfer of amount (> 10,000) \u2014 missing originator/beneficiary fields on a large cross-border transfer; hold and request information before processing"
  },
  "R-TR04": {
    "name": "FATF high-risk corridor travel rule violation",
    "category": "Compliance",
    "severity": "Critical",
    "riskContribution": 80,
    "trigger": "( country in fatf high risk is True and travel rule required is True and travel rule compliant is False )",
    "reason": "Travel Rule violation to/from FATF high-risk jurisdiction (receiver country) \u2014 missing required wire transfer information on a transaction to an already-elevated-risk corridor"
  },
  "R-TR05": {
    "name": "Watchlisted receiver travel rule required",
    "category": "Compliance",
    "severity": "Critical",
    "riskContribution": 90,
    "trigger": "( receiver in watchlist is True and travel rule required is True )",
    "reason": "Transfer to a watchlisted/sanctioned receiver where Travel Rule information is required \u2014 dual sanctions + compliance gap; transaction must be blocked and reported immediately"
  },
  "R-TR06": {
    "name": "Agent cross-border travel rule compliance gap",
    "category": "Compliance",
    "severity": "High",
    "riskContribution": 60,
    "trigger": "( channel == \"Agent\" and receiver country != country code and travel rule required is True and travel rule compliant is False )",
    "reason": "Agent-channel cross-border transfer from country code to receiver country is missing required Travel Rule information \u2014 agent-mediated cross-border transfers are a high-risk vector for compliance gaps"
  },
  "R-AF11": {
    "name": "Ghana MoMo CTR structuring ring",
    "category": "Africa",
    "severity": "Critical",
    "riskContribution": 65,
    "trigger": "( country code == \"GH\" and channel == \"Momo\" and near threshold count 7d >= 2 )",
    "reason": "Ghana MoMo account with near threshold count 7d near-CTR-threshold transactions in 7 days \u2014 deliberate GHS structuring below the FIC's 50,000 reporting threshold via mobile money"
  },
  "R-AF12": {
    "name": "USSD cross-border transfer",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( channel == \"USSD\" and receiver country != country code and receiver country and country code and amount > 200 )",
    "reason": "USSD cross-border transfer of amount from country code to receiver country \u2014 USSD-based cross-border transfers bypass mobile app controls and Travel Rule collection; exploited for informal value transfer"
  },
  "R-AF13": {
    "name": "Agent channel high-velocity day",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( channel == \"Agent\" and count 24h >= 5 and sum 24h > 20,000 )",
    "reason": "Agent channel: count 24h transactions totalling sum 24h in 24 hours \u2014 agent network velocity spike consistent with coordinated cash aggregation or bulk structuring"
  },
  "R-AF14": {
    "name": "Nigeria non-cash structuring pattern",
    "category": "Africa",
    "severity": "Critical",
    "riskContribution": 70,
    "trigger": "( country code == \"NG\" and transaction type in (\"Transfer\", \"Deposit\") and near threshold count 7d >= 2 )",
    "reason": "Nigerian account with near threshold count 7d non-cash transactions near the NFIU reporting threshold in 7 days \u2014 deliberate positioning below the NGN 10,000,000 non-cash CTR limit"
  },
  "R-AF15": {
    "name": "Kenya MoMo cross-border transfer",
    "category": "Africa",
    "severity": "High",
    "riskContribution": 55,
    "trigger": "( country code == \"KE\" and channel == \"Momo\" and receiver country != country code and receiver country and amount > 500 )",
    "reason": "Kenyan mobile money cross-border transfer of amount to receiver country \u2014 M-Pesa/MoMo cross-border corridors require FRC screening; frequently exploited for hawala-style settlement"
  }
};
