import { redirect } from "next/navigation";
import { PUBLIC_PATHS } from "@/lib/nav/publicPaths";

export default function VenderIndexPage() {
  redirect(PUBLIC_PATHS.vender);
}
