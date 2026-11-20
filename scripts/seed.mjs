// Creates/updates family members from FAMILY_MEMBERS ("Name:PIN:#colour,...").
// With SEED_DEMO_DATA=true (preview deployments) it also adds demo members (PIN 0000) and demo tasks.
import postgres from "postgres";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });
const COLORS = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2"];

function parseMembers(value) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const [name, pin, color] = entry.split(":").map((s) => s?.trim());
      if (!name || !/^\d{4,6}$/.test(pin ?? "")) {
        throw new Error(`Bad FAMILY_MEMBERS entry "${entry}" (expected Name:PIN:#colour, PIN 4-6 digits)`);
      }
      return { name, pin, color: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : COLORS[i % COLORS.length] };
    });
}

// Names whose PIN should be reset to the one in FAMILY_MEMBERS (e.g. a forgotten PIN): FAMILY_PIN_RESET=Sonia
const resetNames = new Set((process.env.FAMILY_PIN_RESET ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));

async function upsertMember({ name, pin, color }) {
  const pinHash = await bcrypt.hash(pin, 10);
  const reset = resetNames.has(name.toLowerCase());
  // New members get the PIN from FAMILY_MEMBERS. Existing members keep a PIN they changed themselves,
  // unless their name is in FAMILY_PIN_RESET.
  const [row] = await sql`
    insert into members (name, color, pin_hash) values (${name}, ${color}, ${pinHash})
    on conflict (name) do update set
      color = excluded.color,
      pin_hash = case when members.pin_set_by_member and not ${reset} then members.pin_hash else excluded.pin_hash end,
      pin_set_by_member = case when ${reset} then false else members.pin_set_by_member end
    returning id, pin_set_by_member`;
  console.log(`Member ready: ${name}${row.pin_set_by_member ? " (keeps own PIN)" : ""}${reset ? " (PIN reset)" : ""}`);
  return row.id;
}

const members = parseMembers(process.env.FAMILY_MEMBERS);
for (const m of members) await upsertMember(m);

if (process.env.SEED_DEMO_DATA === "true") {
  const demo = ["Mum", "Dad", "Kid"].map((name, i) => ({ name, pin: "0000", color: COLORS[i] }));
  const ids = [];
  for (const m of demo) ids.push(await upsertMember(m));
  const [{ count }] = await sql`select count(*)::int as count from tasks`;
  if (count === 0) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const at = (h) => new Date(day.getTime() + h * 3600_000);
    await sql`insert into tasks (title, starts_at, ends_at, created_by, assigned_to) values
      ('Buy milk', ${at(15)}, ${at(16)}, ${ids[0]}, ${ids[1]}),
      ('Football practice', ${at(16)}, ${at(18)}, ${ids[1]}, ${ids[2]}),
      ('Homework', ${at(17)}, ${at(18)}, ${ids[0]}, ${ids[2]})`;
    console.log("Demo tasks added");
  }
}

if (members.length === 0 && process.env.SEED_DEMO_DATA !== "true") {
  console.log("FAMILY_MEMBERS is empty - nobody to create.");
}
await sql.end();
