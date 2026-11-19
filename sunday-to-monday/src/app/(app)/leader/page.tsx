import { ComingSoon } from "@/components/coming-soon";
import { requireLeader } from "@/server/session";

export default async function LeaderPage() {
  await requireLeader();
  return <ComingSoon title="Leader">Upload Sunday&apos;s message and publish the recap (milestone 2).</ComingSoon>;
}
