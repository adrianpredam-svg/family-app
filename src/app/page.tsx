import { redirect } from "next/navigation";
import { getCurrentMember, listMembers } from "@/lib/auth";
import { Dashboard } from "@/modules/calendar/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await getCurrentMember();
  if (!me) redirect("/login");
  const members = await listMembers();
  return <Dashboard me={me} members={members} />;
}
