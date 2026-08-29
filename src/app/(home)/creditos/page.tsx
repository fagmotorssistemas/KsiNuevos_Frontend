import { redirect } from "next/navigation";
import { PUBLIC_PATHS } from "@/lib/nav/publicPaths";

export default function CreditosIndexPage() {
  redirect(PUBLIC_PATHS.creditos);
}
