# Rechcel Toledo — GitHub Pages portfolio

Static portfolio built with semantic HTML, responsive CSS, and lightweight vanilla JavaScript. It has no build step and is ready to publish from the repository root with GitHub Pages.

## Run locally

Open `index.html` directly, or run a local server:

```bash
python3 -m http.server 4173
```

Then visit <http://localhost:4173>.

## Publish with GitHub Pages

1. Create a public repository named `phcodesage.github.io` under the `phcodesage` account.
2. Copy these files into the repository root and push them to the default branch.
3. In **Settings → Pages**, choose **Deploy from a branch**, select the default branch and `/ (root)`, then save.
4. GitHub will publish the site at `https://phcodesage.github.io/`.

The site uses relative asset paths, so it also works if it is published from a normal repository subpath.
