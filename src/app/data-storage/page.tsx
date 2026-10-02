import { policyMetadata, PolicyPage } from "@/components/policy-page";
import { DATA_STORAGE } from "@/lib/policies";

export const metadata = policyMetadata(DATA_STORAGE);

export default function DataStorage() {
  return <PolicyPage policy={DATA_STORAGE} />;
}
