import { policyMetadata, PolicyPage } from "@/components/policy-page";
import { DATA_REMOVAL } from "@/lib/policies";

export const metadata = policyMetadata(DATA_REMOVAL);

export default function DataRemoval() {
  return <PolicyPage policy={DATA_REMOVAL} />;
}
