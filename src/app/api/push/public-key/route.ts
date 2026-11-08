import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ key: process.env.VAPID_PUBLIC_KEY || null });
}
