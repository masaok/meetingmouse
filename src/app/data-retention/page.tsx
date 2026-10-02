import { policyMetadata, PolicyPage } from "@/components/policy-page";
import { DATA_RETENTION } from "@/lib/policies";

export const metadata = policyMetadata(DATA_RETENTION);

export default function DataRetention() {
  return <PolicyPage policy={DATA_RETENTION} />;
}
