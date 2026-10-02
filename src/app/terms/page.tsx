import { policyMetadata, PolicyPage } from "@/components/policy-page";
import { TERMS } from "@/lib/policies";

export const metadata = policyMetadata(TERMS);

export default function Terms() {
  return <PolicyPage policy={TERMS} />;
}
