#!/usr/bin/env python3
"""Merge Free Exercise DB with the MIT exercises-dataset text.

Two names for the same movement keep one row, the Free Exercise DB one when
there is one. Reviewed fixes in seed/corrections.json are applied last, and
the text they replace is kept in seed/revisions.json so an existing database
can be updated where nobody edited the row. Photos stay on the public-domain records. A blank is filled only when its
name is the same movement: the public-domain photo is reused, or a RepDB
illustration is hotlinked. Gym visual animations are not copied. Run from the
repo root: python3 scripts/build_catalog.py
"""

import json
import re
import unicodedata
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
FREE = ROOT / "seed" / "catalog.json"
EXTRA_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
OUTS = [FREE, ROOT / "mobile" / "assets" / "catalog.json"]
CORRECTIONS = ROOT / "seed" / "corrections.json"
REVISIONS = ROOT / "seed" / "revisions.json"
REVISION_OUTS = [REVISIONS, ROOT / "mobile" / "assets" / "revisions.json"]

MUSCLE = {
    "abs": "abdominals",
    "abdominals": "abdominals",
    "obliques": "abdominals",
    "hip flexors": "abdominals",
    "core": "abdominals",
    "lower abs": "abdominals",
    "pectorals": "chest",
    "chest": "chest",
    "upper chest": "chest",
    "delts": "shoulders",
    "deltoids": "shoulders",
    "shoulders": "shoulders",
    "rear deltoids": "shoulders",
    "rotator cuff": "shoulders",
    "serratus anterior": "shoulders",
    "quads": "quadriceps",
    "quadriceps": "quadriceps",
    "glutes": "glutes",
    "hamstrings": "hamstrings",
    "biceps": "biceps",
    "brachialis": "biceps",
    "triceps": "triceps",
    "calves": "calves",
    "soleus": "calves",
    "ankle stabilizers": "calves",
    "ankles": "calves",
    "shins": "calves",
    "feet": "calves",
    "forearms": "forearms",
    "grip muscles": "forearms",
    "hands": "forearms",
    "wrists": "forearms",
    "wrist flexors": "forearms",
    "wrist extensors": "forearms",
    "lats": "lats",
    "latissimus dorsi": "lats",
    "lower back": "lower back",
    "spine": "lower back",
    "middle back": "middle back",
    "upper back": "middle back",
    "rhomboids": "middle back",
    "back": "middle back",
    "traps": "traps",
    "trapezius": "traps",
    "adductors": "adductors",
    "inner thighs": "adductors",
    "groin": "adductors",
    "abductors": "abductors",
    "neck": "neck",
    "levator scapulae": "neck",
    "sternocleidomastoid": "neck",
    "cardiovascular system": "cardio",
    "cardio": "cardio",
}

UNI = re.compile(
    r"\b(one[\s-]arm|one[\s-]leg|single[\s-]arm|single[\s-]leg|unilateral|alternating)\b",
    re.I,
)
NOTE = "Instructions © 2026 Hasan Emir Yıldırım, exercises-dataset, MIT."
REVISED_NOTE = "Instructions adapted for Hold from exercises-dataset, © 2026 Hasan Emir Yıldırım, MIT."
GENERATED_NOTE = "Original illustration made for Hold."
FREE_NOTE = "Photos: Free Exercise DB, public domain."
REP_NOTE = "Illustration: Exercise data by RepDB (repdb.co)."
REP_URL = "https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json"
REP_BASE = "https://raw.githubusercontent.com/RepDB/exercise-dataset/main/"
WG_URL = "https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/manifest.json"
WG_BASE = "https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/"
WG_CAPTION = {1: "Start", 2: "Mid", 3: "Finish"}
SAFE_PAREN = re.compile(r"\((?:male|female|back pov|side pov|front pov)\)", re.I)
VERSION = re.compile(r"\b(?:v\.?|version)\s*\d+\b", re.I)
ALIAS_BLOCK = re.compile(
    r"\b(knee|knees|kneeling|bosu|wall|ball|rope|grip|band|seated|standing|incline|decline|floor|box|chair|dumbbell|barbell|kettlebell|cable|smith|machine|weighted|assisted|pause|deficit|close|wide|narrow|reverse|single|one|arm|leg|bench|bar|cage|ring|rings|strap|straps|towel|plate|landmine|sled|partner|stair|staircase)\b",
    re.I,
)
TOKEN = {
    "biceps": "bicep",
    "triceps": "tricep",
    "banded": "band",
    "dumbbells": "dumbbell",
    "kettlebells": "kettlebell",
    "barbells": "barbell",
}
COMPOUNDS = (
    ("push up", "pushup"),
    ("pull up", "pullup"),
    ("chin up", "chinup"),
    ("sit up", "situp"),
    ("step up", "stepup"),
    ("muscle up", "muscleup"),
)


def norm(value):
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def muscle(value):
    raw = str(value or "").strip().lower()
    return MUSCLE.get(raw, raw)


def stem(token):
    token = TOKEN.get(token, token)
    if len(token) > 3 and token.endswith(("ches", "shes", "sses", "xes", "zes")):
        token = token[:-2]
    elif len(token) > 3 and token.endswith("ies"):
        token = token[:-3] + "y"
    elif len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        token = token[:-1]
    return token


def canonical(name):
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    text = text.lower().replace("'", "").replace("’", "")
    text = SAFE_PAREN.sub(" ", text)
    text = VERSION.sub(" ", text)
    text = text.replace("rollerout", "rollout").replace("leverage", "lever")
    text = re.sub(r"\bsquad\b", "quad", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    tokens = [stem(token) for token in text.split()]
    tokens = [token for token in tokens if token and token not in {"the", "a", "an"}]
    folded = " ".join(tokens)
    for source, target in COMPOUNDS:
        folded = folded.replace(source, target)
    return " ".join(sorted(token for token in folded.split() if token))


def alias_key(name):
    def replace(match):
        if ALIAS_BLOCK.search(match.group(1)):
            return match.group(0)
        return " "

    return canonical(re.sub(r"\(([^)]*)\)", replace, name))


def shortest(rows, name_of):
    return min(rows, key=lambda row: (len(name_of(row)), name_of(row)))


def rep_images(row):
    flat = (row.get("images") or {}).get("flat") or {}
    images = []
    if flat.get("start"):
        images.append({"src": REP_BASE + flat["start"], "caption": "Start"})
    if flat.get("peak"):
        images.append({"src": REP_BASE + flat["peak"], "caption": "Peak"})
    if not images and flat.get("main"):
        images.append({"src": REP_BASE + flat["main"], "caption": "Position"})
    return images


def add_note(row, extra):
    current = row.get("photo_note") or ""
    if extra in current:
        return current
    return f"{current} {extra}".strip()


def load_json(url, label):
    try:
        with urlopen(url, timeout=60) as response:
            return json.load(response)
    except Exception as error:
        print(f"{label} unavailable: {error}")
        return None


def load_repdb():
    payload = load_json(REP_URL, "repdb")
    if not payload:
        return []
    return payload.get("exercises") or []


def guide_images(item):
    images = []
    for frame in item.get("frames") or []:
        path = frame.get("path") or ""
        if path.endswith(".svg"):
            path = path[:-4] + ".png"
        if not path:
            continue
        images.append({
            "src": WG_BASE + path,
            "caption": WG_CAPTION.get(frame.get("index"), "Position"),
        })
    return images


def guide_note(item):
    source = ((item.get("attribution") or {}).get("source") or {}).get("name")
    if source:
        return f"Illustration by Bryl Lim, adapted from {source}, CC BY-SA 4.0."
    return "Illustration by Bryl Lim, CC BY-SA 4.0."


def attach_open_illustrations(rows, filled):
    """Hotlink CC BY-SA illustrations when the name is the same movement.

    The files stay in the Workout Guide repo. Share-alike covers adaptations
    of those drawings, so Hold does not copy or redraw them.
    """
    manifest = load_json(WG_URL, "workout guide") or []
    full, alias = index_names(manifest, lambda item: item.get("name") or "")
    for row in rows:
        if row.get("images"):
            continue
        key = canonical(row["name"])
        source_rows = full.get(key) or alias.get(key)
        if not source_rows:
            continue
        source = shortest(source_rows, lambda item: item.get("name") or "")
        images = guide_images(source)
        if not images:
            continue
        row["images"] = images
        row["photo_note"] = add_note(row, guide_note(source))
        filled["open"] += 1


def index_names(rows, name_of):
    full = {}
    alias = {}
    for row in rows:
        name = name_of(row)
        key = canonical(name)
        full.setdefault(key, []).append(row)
        alt = alias_key(name)
        if alt and alt != key:
            alias.setdefault(alt, []).append(row)
    return full, alias


def attach_photos(rows):
    """Fill a blank only when the name is the same movement as a photo we can use.

    Free Exercise DB photos are copied by URL. RepDB illustrations are hotlinked,
    not stored. Workout Guide illustrations are CC BY-SA and are also hotlinked.
    Gym visual media is never attached.
    """
    rep_rows = load_repdb()
    photo_rows = [row for row in rows if row.get("images")]
    photo_full, photo_alias = index_names(photo_rows, lambda row: row["name"])
    rep_full, rep_alias = index_names(rep_rows, lambda row: row.get("name_en") or "")
    filled = {"photo": 0, "rep": 0, "open": 0}
    for row in rows:
        if row.get("images"):
            continue
        key = canonical(row["name"])
        if not key:
            continue
        if key in photo_full:
            source = shortest(photo_full[key], lambda item: item["name"])
            row["images"] = [dict(image) for image in source["images"]]
            row["photo_note"] = add_note(row, FREE_NOTE)
            filled["photo"] += 1
            continue
        if key in photo_alias:
            source = shortest(photo_alias[key], lambda item: item["name"])
            row["images"] = [dict(image) for image in source["images"]]
            row["photo_note"] = add_note(row, FREE_NOTE)
            filled["photo"] += 1
            continue
        source_rows = rep_full.get(key) or rep_alias.get(key)
        if not source_rows:
            continue
        source = shortest(source_rows, lambda item: item.get("name_en") or "")
        images = rep_images(source)
        if not images:
            continue
        row["images"] = images
        row["photo_note"] = add_note(row, REP_NOTE)
        filled["rep"] += 1
    attach_open_illustrations(rows, filled)
    blank = sum(1 for row in rows if not row.get("images"))
    print(
        f"photos attached free {filled['photo']} repdb {filled['rep']} "
        f"open {filled['open']} still blank {blank}"
    )


def clean_name(value):
    # exercises-dataset spells the degree sign as UTF-8 read back as CP1251.
    value = value.replace("в°", "°")
    value = re.sub(r"\bsitted\b", "seated", value)
    value = re.sub(r"\bSitted\b", "Seated", value)
    return re.sub(r"\bKeens\b", "Knees", value)


def variant(name):
    return bool(SAFE_PAREN.search(name) or VERSION.search(name))


def dedupe(rows):
    """Keep one row per movement.

    Names that fold to the same words ("Barbell Bent Over Row" and "Bent Over
    Barbell Row", or a "v. 2" or "(side POV)" copy) are the same exercise.
    Free Exercise DB wins, then the plain name, then the shortest.
    """
    groups = {}
    for row in rows:
        groups.setdefault(canonical(row["name"]), []).append(row)
    keep = set()
    for group in groups.values():
        best = min(group, key=lambda row: (
            row["id"].startswith("yd-"), variant(row["name"]), len(row["name"]), row["id"],
        ))
        keep.add(best["id"])
    kept = [row for row in rows if row["id"] in keep]
    print(f"same movement dropped {len(rows) - len(kept)}")
    return kept


def strip_image_notes(note):
    for extra in (FREE_NOTE, REP_NOTE, GENERATED_NOTE):
        note = note.replace(extra, "")
    note = re.sub(r"Illustration by Bryl Lim.*?CC BY-SA 4\.0\.", "", note)
    return re.sub(r"\s+", " ", note).strip()


def apply_corrections(rows, renamed):
    """Apply the reviewed fixes and remember what each one replaced.

    renamed holds names that clean_name repaired, so a database seeded with
    the broken spelling is renamed too.
    """
    if not CORRECTIONS.exists():
        return rows
    fixes = json.loads(CORRECTIONS.read_text())
    rows = [row for row in rows if not (fixes.get(row["id"]) or {}).get("drop")]
    revisions = json.loads(REVISIONS.read_text()) if REVISIONS.exists() else {}
    present = {row["id"] for row in rows}
    for exercise_id, name in renamed.items():
        past = revisions.setdefault(exercise_id, {}).setdefault("name", []) if exercise_id in present else None
        if past is not None and name not in past:
            past.append(name)
    changed = 0
    for row in rows:
        fix = fixes.get(row["id"])
        if not fix:
            continue
        for field in ("name", "steps", "equipment", "muscles", "secondary", "images"):
            if field not in fix or row.get(field) == fix[field]:
                continue
            if field in ("name", "steps", "equipment"):
                past = revisions.setdefault(row["id"], {}).setdefault(field, [])
                if row.get(field) not in past:
                    past.append(row.get(field))
            row[field] = fix[field]
            changed += 1
        if "steps" in fix and row["id"].startswith("yd-"):
            row["photo_note"] = (row.get("photo_note") or "").replace(NOTE, REVISED_NOTE)
        if fix.get("images") == []:
            row["photo_note"] = strip_image_notes(row.get("photo_note") or "")
    payload = json.dumps(revisions, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    for path in REVISION_OUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload)
    print(f"corrections {len(fixes)} fields changed {changed} revised rows {len(revisions)}")
    return rows


def title_name(value):
    parts = value.split(" ")
    titled = []
    for index, part in enumerate(parts):
        if not part:
            continue
        if index == 0 or len(part) > 2:
            titled.append(part[:1].upper() + part[1:])
        else:
            titled.append(part)
    return " ".join(titled)


def main():
    free = json.loads(FREE.read_text())
    for row in free:
        row["name"] = clean_name(row["name"])
    with urlopen(EXTRA_URL, timeout=60) as response:
        extra = json.load(response)
    names = {norm(row["name"]) for row in free}
    have = {row["id"] for row in free}
    renamed = {
        f"yd-{row['id']}": title_name(row["name"])
        for row in extra
        if title_name(clean_name(row["name"])) != title_name(row["name"])
    }
    added = []
    seen = set()
    for row in extra:
        key = norm(row["name"])
        # A corrected row keeps its id after a rename.
        if key in names or key in seen or f"yd-{row['id']}" in have:
            continue
        seen.add(key)
        primary = muscle(row.get("target"))
        secondary = []
        for item in row.get("secondary_muscles") or []:
            mapped = muscle(item)
            if mapped and mapped != primary and mapped not in secondary:
                secondary.append(mapped)
        added.append({
            "id": f"yd-{row['id']}",
            "name": title_name(clean_name(row["name"])),
            "category": row.get("body_part") or row.get("category") or "",
            "level": "",
            "force": "",
            "mechanic": "",
            "equipment": row.get("equipment") or "",
            "muscles": [primary] if primary else [],
            "secondary": secondary,
            "steps": row.get("instruction_steps", {}).get("en") or [],
            "images": [],
            "unilateral": bool(UNI.search(row["name"])),
            "photo_note": NOTE,
        })
    merged = dedupe(free + added)
    attach_photos(merged)
    # A corrected name can turn out to be a movement already listed.
    merged = dedupe(apply_corrections(merged, renamed))
    ids = [row["id"] for row in merged]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate exercise ids")
    payload = json.dumps(merged, ensure_ascii=False, separators=(",", ":"))
    for path in OUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload)
    print(f"free {len(free)} added {len(added)} total {len(merged)} bytes {len(payload)}")


if __name__ == "__main__":
    main()
