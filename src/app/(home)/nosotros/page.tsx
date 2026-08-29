import { redirect } from "next/navigation";
import { PUBLIC_PATHS } from "@/lib/nav/publicPaths";

export default function NosotrosIndexPage() {
  redirect(PUBLIC_PATHS.nosotros);
}
