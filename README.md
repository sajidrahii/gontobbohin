# গন্তব্যহীন — static site (v1.0.2)
Pure HTML/CSS/JS, no build step, no server. Deploy the `public/` folder.

- **Run locally:** open `public/index.html`, or run `python -m http.server` inside `public/`.
- **Netlify:** drag the `public` folder onto app.netlify.com/drop.
- **GitHub Pages:** push the contents of `public/` to a repo → Settings → Pages.

Place lookup uses OpenStreetMap Nominatim (free, ~1 request/second, cached in the browser).
The map is drawn from 64 district shapes (see gen.js).
District boundaries © geoBoundaries (CC BY 4.0) via the `bd-geojson` npm package — keep this credit.

Rebuild map data (optional): `npm i && node gen.js` regenerates `public/js/data.js` (districts, English names, divisions, shapes).

## .pix project files
A `.pix` file is a plain ZIP archive (stored, not compressed) with a custom extension:
```
project.json        { format:"pix", version:1, title, theme, perMap, gsize, photos:[{file,place,d,size}], geo:{…} }
images/001.jpg …    working copies of the photos (max 1000px on the long side)
```
Rename it to `.zip` to inspect it. Importing replaces the current project. `version` lets future releases keep reading old files.

`version` 3 files also store each photo's zoom and position inside its shape (plus card shape, division scope and title flag); version 1 and 2 files still open.
