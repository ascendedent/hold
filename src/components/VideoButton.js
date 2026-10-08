"use client";

import { useState } from "react";

export function VideoButton({ videoId, title }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn copper" type="button" onClick={() => setOpen(true)} disabled={!videoId}>
        {videoId ? "Watch the demo" : "Demo link still loading"}
      </button>
      {open && videoId ? (
        <div className="overlay" onClick={() => setOpen(false)} role="presentation">
          <div className="player" onClick={(event) => event.stopPropagation()} role="dialog" aria-label={title || "Exercise demo"}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <strong>{title || "Demo"}</strong>
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={title || "Exercise demo"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="faint" style={{ margin: "8px 4px 2px" }}>Streams from YouTube. Nothing is downloaded.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
