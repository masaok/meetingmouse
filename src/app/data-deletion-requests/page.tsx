import { policyMetadata, PolicyPage } from "@/components/policy-page";
import { DATA_DELETION_REQUESTS } from "@/lib/policies";

export const metadata = policyMetadata(DATA_DELETION_REQUESTS);

export default function DataDeletionRequests() {
  return <PolicyPage policy={DATA_DELETION_REQUESTS} />;
}
