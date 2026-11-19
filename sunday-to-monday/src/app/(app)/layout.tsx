import { TabBar } from "@/components/tab-bar";
import { isLeader, requireMember } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireMember();
  return (
    <>
      <main className="mx-auto w-full max-w-[520px] px-5 pt-8 pb-28">{children}</main>
      <TabBar showLeader={isLeader(user)} />
    </>
  );
}
