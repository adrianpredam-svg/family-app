import { getCurrentMember } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Who is logged in. Used by sub-apps like sonia.preda.app to check the family PIN login. */
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  return json({ id: me.id, name: me.name, color: me.color });
}
