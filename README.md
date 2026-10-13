# Sweet by Salma — updated website

A bilingual (French/Arabic), responsive static cake gallery and WhatsApp request site. No build tools are required.

## Open locally

Double-click `index.html` or run `py -m http.server 3000` in this folder, then open http://localhost:3000.

## New graphics

- `favicon.ico`, `favicon-32.png`, `favicon-192.png`, and `apple-touch-icon.png` give the browser tab and saved links a branded **S** icon. Refresh the page with `Ctrl + Shift + R` if your browser caches an older icon.
- `social-preview.jpg` is a 1200 × 630 share card, with title, description and cake image.
- `assets/cakes/` contains the updated product-gallery presentation images (19 entries). The original screenshot crops are backed up in `assets/original-screenshots/`.

**Image disclosure:** Most studio images are AI-assisted reinterpretations based on the customer's screenshots, not untouched photographs. Some detail, colors, lettering and decorations may differ from the originals; the owner must approve them and the real product designs must be represented accurately before publication. Five difficult-to-edit images remain source-photo inserts on a white studio canvas, not AI-hallucinated replicas. For maximum authenticity and quality, ask the owner for original high-resolution product photos, then replace the relevant image file while keeping its filename.

## IMPORTANT: Enable WhatsApp/Facebook/Instagram link previews

The file `social-preview.jpg` is included and the Open Graph / Twitter tags are present, **but link-preview crawlers generally require an absolute HTTPS URL for `og:image`.** Since no deployed public domain exists yet, after publishing the folder and obtaining the REAL domain, run this command in the project directory:

```powershell
py tools/set-live-domain.py https://YOUR-ACTUAL-PUBLIC-DOMAIN
```

Replace the example URL with the exact HTTPS website URL, then **upload/redeploy the whole website folder again**. This updates `og:image`, `twitter:image`, canonical URL and `og:url`. Avoid executing the script with a fake domain.

Test by sharing the published link in WhatsApp. Some apps cache previews, so updates can take time and may require a URL query string to bypass an older cached preview. Previews never appear for local `file:///C:/.../index.html` links.

## Deployment

Netlify: drag the entire `sweet-by-salma` folder into manual deployment. Vercel: import a repository as a static site, with no build command and output directory `.`. Once live, follow the preview steps above.

## Order/contact behavior

The business number is `+212 628-801635` (`212628801635` for wa.me links). The form validates required fields and an order date at least four Casablanca calendar days in the future, then opens a prefilled WhatsApp message after confirmation. The owner must still approve the order. Uploaded reference images are not transmitted automatically; customers must attach them manually in WhatsApp. No payments are collected.

## Adding product photos

Product data is defined in the `cakes` array at the top of `script.js` as `[filename, descriptive French title, category]`. Add a `.webp` image under `assets/cakes/` and an entry to the array. Available categories: `birthday`, `wedding`, `engagement`, `romance`, `custom`, `dessert`.

## Before production

Confirm all cake labels, products, and studio-style photos with Salma. Verify business WhatsApp and the 4-day order policy. Replace studio reinterpretations with original high-resolution product photos whenever possible. Test ordering on a real phone.
