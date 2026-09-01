# Project Garden

Draw a space. The app works out how many hours of sun each part of it gets.

I built this to answer one question about my own balcony, so it is a personal
tool, not a product. It runs in the browser, saves nothing anywhere except your
own browser storage, and has no accounts or server.

```bash
npm install
npm run dev
```

Then open the address it prints. Three example spaces are already there.

## What you can do

1. **Draw the outline.** Click each corner, or start from a rectangle. It snaps
   to other corners, to right angles, and to 10 cm.
2. **Say what is around it.** Each edge can be a wall, a half-height wall or
   nothing. A wall has a height, and it can run only part of the way along the
   edge — the rest lets light in.
3. **Add what is inside it.** Sheds, walls, raised beds, trees. A shed blocks
   the ground under it; a tree does not.
4. **Add the roof.** As many pieces as the real roof has, each with its own
   shape and height. Pieces may overlap and may reach past the walls.
5. **Say where you are.** Latitude, and which way north is on your drawing.
6. **Look at the answer.** Watch the shadows move through the day, or see the
   totals for the longest and the shortest day of the year. Point at any square
   to read its own numbers.

You can also drop in a photo taken from above, or a map screenshot, set the
scale by drawing a line on something you know the length of, and draw on top of
it.

## How the numbers are worked out

Everything is in metres. `+x` is east, `+y` is north.

- **Where the sun is.** Real solar position: declination from the day of the
  year, hour angle from the time, then altitude and azimuth. Sunrise and sunset
  come from the hour angle, so the animation always starts and ends with the sun
  on the horizon, at any latitude.
- **Shadows.** Anything that casts shade is a flat outline with a height. Its
  shadow is that outline moved `height / tan(altitude)` away from the sun. A
  wall shades the band between its base and the far end; a roof only moves,
  because it is not standing on the ground.
- **Hours of sun.** The space is cut into squares. For the longest and the
  shortest day of the year, every half hour, each square is either in a shadow
  or not. Half an hour of sun is added each time it is not.

### What it does not do

- No sloped roofs. Everything is a flat outline at one height.
- Trees are solid. No light comes through a canopy.
- No bounced light, no light from a bright sky — only direct sun.
- No clouds, and no local weather.
- Hard shadow edges, with no soft edge.
- The ground is flat, and so is the earth over the size of one garden.

So treat the numbers as a good guess, not a survey.

## Layout

| Folder | What is in it |
| --- | --- |
| `src/space` | The saved data: types, browser storage, migration, coordinates |
| `src/view` | Canvas drawing and the metres ↔ pixels transform |
| `src/engine` | The sun and shadow maths. No React, no canvas, no DOM |
| `src/editor` | Drawing a space |
| `src/studio` | Looking at the result |
| `src/app` | Screens, routing, the background worker |
| `docs` | The design notes this was built from |

The engine is plain functions over plain data, so it is tested without a
browser and can run in a worker. A lint rule stops it importing React.

```bash
npm test          # the maths and the data model
npm run lint
npm run build
```

## Saving

Spaces live in browser storage under one key. Nothing leaves your machine. Use
**Save to file** to get a `.json` you can keep or move, and **Open a file** to
read one back.

Browser storage is about 5 MB in total, and a background image is large, so
images are shrunk to 1600 px on the long side before saving.

## Security notes

- Every dependency is pinned to an exact version, and `npm ci` installs only
  what the lockfile says.
- `.npmrc` sets `ignore-scripts=true`, so no package can run code while
  installing.
- GitHub Actions are pinned to a commit, not a tag, because a tag can be moved.
- The built page carries a strict content security policy. It loads nothing
  from anywhere else, and there is nothing to load. `public/_headers` has the
  same policy for hosts that can send real headers.

## Licence

GNU Affero General Public License v3.0. See `LICENSE`.

In short: use it, change it, share it. If you run a changed copy where other
people can use it, including over a network, you have to offer them the source
of your changes under the same licence.
