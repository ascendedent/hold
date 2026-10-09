# Hold

A local training log. Build routines, log sets, track body measurements, and keep your own notes. It binds to this computer only.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4747

Your workouts, body log, and notes live in `data/hold.db`. That file stays on this machine.

The exercise catalog joins two sources. Photos and the matching movements come from the [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain). The rest of the names, equipment, muscles, and English steps come from [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT, © 2026 Hasan Emir Yıldırım). A movement with no photo of its own reuses the Free Exercise DB photo when the name is the same exercise. Some of the rest use a RepDB illustration, hotlinked rather than stored. Exercise data by [RepDB (repdb.co)](https://repdb.co). Where the name is the same movement, Hold also hotlinks an open drawing from [Workout Guide](https://github.com/bryllim/workout-guide) by Bryl Lim, adapted from [Everkinetic](https://github.com/everkinetic/data), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Those drawings are not copied into this repo. Photos load when you open an exercise. They are not stored here. The Gym visual animations that ship with exercises-dataset are not included. A YouTube link, if you paste one on an exercise, streams inside the app.

The two sources list some movements under different names, so `scripts/build_catalog.py` keeps one row per movement, the Free Exercise DB one first. Steps, muscles, names, and pictures that were reviewed and found wrong are fixed in `seed/corrections.json`, which the build applies last. The text each fix replaced goes to `seed/revisions.json`, so a database seeded earlier picks up the fix unless that exercise was edited in Hold.

Logged sets store the weight, the reps, and a volume of weight × reps. Progress, History, and each exercise keep that load.

Hold is a training log, not medical advice.

## Your own plan

Your routines, weekly schedule, and reminder text live in `personal/plan.json`. Git ignores it, so it never leaves this computer except in the phone build. `scripts/mac.sh push` copies it into the app as `mobile/assets/personal.json` (also ignored). Raise `version` in the file when you change it, and the phone replaces the plan's routines on next launch. Routines you made in the app are left alone. The phone schedules one reminder a day for the phase you pick on the You tab. The reminders are local, with no push server.

## iPhone

The iOS app is in `mobile/`. Workouts stay in a database on the phone. Photos, RepDB illustrations, and the CC BY-SA drawings load when the phone is online. The same catalog, filters, and load history are on the phone.

A Release build is made on the Mac mini, because Xcode does not run here. The paired iPhone has to be unlocked and on the same desk as the Mac. Signing uses the shared SSH session from `~/projects/PreparedHero/scripts/mac.sh unlock`.

```bash
scripts/mac.sh build-device
scripts/mac.sh install
```
