import VenderCuencaView from "./VenderCuencaView";
import { venderMetadata } from "@/lib/seo/public-copy";

export function generateMetadata() {
  return venderMetadata();
}

export default function VenderCuencaPage() {
  return <VenderCuencaView />;
}
