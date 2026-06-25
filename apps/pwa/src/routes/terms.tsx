import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { LegalDocument } from "@/components/legal-document";

export default function TermsRoute() {
  useThemeAuto();
  return <LegalDocument docKey="terms" />;
}
