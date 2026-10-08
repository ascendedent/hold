"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  today: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
  routines: "M5 5h14v4H5V5Zm0 6h14v8H5v-8Z",
  exercises: "M4 7h16M4 12h16M4 17h10",
  progress: "M4 16l4-5 3 3 5-7 4 4",
  you: "M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm-6 8a6 6 0 0 1 12 0",
  history: "M12 7v5l3 2M12 4a8 8 0 1 0 8 8",
  body: "M8 4h8v3a4 4 0 0 1-8 0V4Zm-2 8h12v8H6v-8Z",
  goals: "M12 4l2.2 4.6L19 9.2l-3.5 3.4.8 4.9L12 15.8 7.7 17.5l.8-4.9L5 9.2l4.8-.6L12 4Z",
};

const SIDE = [
  ["/", "Today", "today"],
  ["/library", "Exercises", "exercises"],
  ["/workouts", "Routines", "routines"],
  ["/history", "History", "history"],
  ["/body", "Body", "body"],
  ["/growth", "Progress", "progress"],
  ["/goals", "Goals", "goals"],
  ["/context", "You", "you"],
];

const BOTTOM = [
  ["/", "Today", "today"],
  ["/workouts", "Routines", "routines"],
  ["/library", "Exercises", "exercises"],
  ["/growth", "Progress", "progress"],
  ["/context", "You", "you"],
];

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={ICONS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Item({ href, label, icon, path }) {
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link href={href} className={active ? "active" : ""}>
      <Icon name={icon} />
      {label}
    </Link>
  );
}

export function Nav({ open }) {
  const path = usePathname();
  return (
    <>
      <aside className="side">
        <div className="brand">
          <strong>Hold</strong>
          <span>Training log</span>
        </div>
        <nav className="nav">
          {SIDE.map(([href, label, icon]) => <Item key={href} href={href} label={label} icon={icon} path={path} />)}
        </nav>
        {open ? (
          <Link className="resume" href={`/session/${open.id}`}>
            Resume {open.name}
            <small>Still open</small>
          </Link>
        ) : null}
      </aside>
      <nav className="bottom">
        {BOTTOM.map(([href, label, icon]) => <Item key={href} href={href} label={label} icon={icon} path={path} />)}
      </nav>
    </>
  );
}
