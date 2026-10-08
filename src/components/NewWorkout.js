"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export function NewWorkout() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function create() {
    try {
      const created = await api("template.create", { name: "New workout" });
      router.push(`/workouts/${created.id}`);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div>
      <button className="btn copper" type="button" onClick={create}>New workout</button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
