import { GoalBoard } from "@/components/GoalBoard";
import { listGoals } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return <GoalBoard goals={listGoals()} />;
}
