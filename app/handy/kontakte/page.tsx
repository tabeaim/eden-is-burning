import { PhoneApp } from "@/components/phone/PhoneApp";

// Telefon-App, Reiter „Kontakte" – Ziel von „Neuer Anruf" im Seitenmenü
export default function PhoneContactsPage() {
  return <PhoneApp initialView="contacts" />;
}
