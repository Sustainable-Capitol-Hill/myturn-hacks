# MyTurn Hacks

This repo contains a series of 'hacks' to make MyTurn more usable.

The scripts here are bundled for a more compatible JS version and hosted at

- `https://sustainable-capitol-hill.github.io/myturn-hacks/public-footer.js`
- `https://sustainable-capitol-hill.github.io/myturn-hacks/admin-footer.js`

These scripts are subsequently included in MyTurn.

## Contributing

Simply edit one of the scripts. Commits to the `main` branch will kick off a
pipeline that bundles them and updates the GitHub Pages site.

Linter fixes and code formatting are performed automatically by a pre-commit hook, which will get installed by `husky` upon package installation by `yarn`.

If you create a new script, you'll need to add it to the `index.ts` entrypoint
for the directory.
