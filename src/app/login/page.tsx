import { redirect } from "next/navigation";
import { getCurrentMember, listMembers } from "@/lib/auth";
import { LoginForm } from "@/modules/auth/LoginForm";
import { safeNext } from "@/modules/auth/next";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  // After login, go back to where the person came from (e.g. home.preda.app).
  const next = safeNext((await searchParams).next, process.env.APP_URL, process.env.COOKIE_DOMAIN);
  if (await getCurrentMember()) redirect(next);
  const members = await listMembers();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-2xl font-bold">Preda Family</h1>
      <p className="mt-1 text-center text-[var(--muted)]">Who are you?</p>
      {members.length === 0 ? (
        <p className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
          No family members yet. Set <code>FAMILY_MEMBERS</code> and run the seed (see README).
        </p>
      ) : (
        <LoginForm members={members} next={next} />
      )}
    </main>
  );
}
