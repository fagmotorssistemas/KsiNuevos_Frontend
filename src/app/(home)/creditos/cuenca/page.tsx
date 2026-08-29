import CreditosCuencaView from "./CreditosCuencaView";
import { creditosMetadata } from "@/lib/seo/public-copy";

export function generateMetadata() {
  return creditosMetadata();
}

export default function CreditosCuencaPage() {
  return <CreditosCuencaView />;
}
