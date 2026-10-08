import { BodyBoard } from "@/components/BodyBoard";
import { listBody, profile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BodyPage() {
  return <BodyBoard logs={listBody()} unit={profile().unit} />;
}
