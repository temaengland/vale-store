import "server-only";
import { cookies } from "next/headers";

export function isAdminAuthed() {
  const session = cookies().get("admin_session")?.value;
  const correct = process.env.ADMIN_PASSWORD;
  return Boolean(correct) && session === correct;
}
