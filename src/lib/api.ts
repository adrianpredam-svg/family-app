import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const unauthorized = () => json({ error: "Please log in" }, 401);
export const forbidden = () => json({ error: "Only the person who created the task or the person it is for can change it" }, 403);
export const notFound = () => json({ error: "Not found" }, 404);
export const badRequest = (err: ZodError | string) =>
  json({ error: typeof err === "string" ? err : err.issues[0]?.message ?? "Invalid input" }, 400);
