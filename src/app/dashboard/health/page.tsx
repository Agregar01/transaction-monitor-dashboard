import ComingSoon from "@/components/ComingSoon";

export default function HealthPage() {
  return (
    <ComingSoon
      title="System Health"
      description="Live status of API, DB, Redis, TimescaleDB, Celery workers, Kafka, and ML models. Polls every 15s."
      phase="Phase 7"
    />
  );
}
