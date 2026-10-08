import { ContextBoard } from "@/components/ContextBoard";
import { listNotes, profile } from "@/lib/db";
import { heartZones } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default function ContextPage() {
  const me = profile();
  return <ContextBoard me={me} notes={listNotes()} zones={heartZones(me.age)} />;
}
