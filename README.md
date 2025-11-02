# MyTurn Hacks

This repo contains a series of 'hacks' to make MyTurn more usable.

The scripts here are bundled for a more compatible JS version and hosted at

- `https://sustainable-capitol-hill.github.io/myturn-hacks/public-footer.js`
- `https://sustainable-capitol-hill.github.io/myturn-hacks/admin-footer.js`

These scripts are subsequently included in MyTurn.

## Getting Started

To play around with your scripts locally without affecting the real MyTurn site,
you can run a proxy server:

```bash
yarn dev
```

Access it at [http://localhost:3000](http://localhost:3000). (This does _not_
work [in Safari](https://bugs.webkit.org/show_bug.cgi?id=232088), use Chrome or
Firefox.) All scripts that you edit will be bundled into the site (including
source maps), so you can experiment with them. You can login as normal to access
the admin area.

**Note: there may be some cases where MyTurn redirects you back to the real
site, so if your changes don't seem to be affecting anything, make sure you're
still on `localhost`.**

## Contributing

Simply edit one of the scripts. Commits to the `main` branch will kick off a
pipeline that bundles them and updates the GitHub Pages site.

Your changes will need to pass linting and formatting checks before you can
merge them. Run checks with:

```bash
yarn lint    # eslint
yarn format  # prettier
```

If you create a new script, you'll need to add it to the `index.ts` entrypoint
for the directory.
