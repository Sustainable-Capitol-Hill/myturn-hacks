# MyTurn Hacks

MyTurn allows site admins to add custom code to MyTurn pages. This repo contains a set of JavaScript "hacks" to add functionality and improve the interface of [Sustainable Capitol Hill's MyTurn instance](https://capitolhill.myturn.com).

## Examples of Improvements

On the public-facing side, we make interface improvements such as making subscriptions _not_ auto-renew by default, or allowing patrons to request the purchase of specific additional tools.

On the admin-facing side, we have code to reduce data input errors by tool library staff, such as preventing typos in `Location Code`s or hiding now-unused membership types. We also use code in this repo to ensure that all tool library patrons have their ID checked to confirm age eligibility.

## How They're Deployed

MyTurn admins can inject HTML blocks into public and admin MyTurn pages using the [`Site Customization` settings](https://capitolhill.myturn.com/library/orgMyOrganization/editLookFeelSettings).

This repo contains a GitHub Action that automatically compiles our scripts and hosts them on GitHub Pages, from where they can be injected into our MyTurn instance as `<script>`s in page footers:

- `https://sustainable-capitol-hill.github.io/myturn-hacks/public-footer.js`
- `https://sustainable-capitol-hill.github.io/myturn-hacks/admin-footer.js`

This GitHub Action gets run whenever a new commit is made to the `main` branch.

## How to Contribute

### Requirements

- Node.js 20+
- `yarn`

Install the required NPM libraries using `yarn install`.

### Local Server

We use a proxy server to facilitate local development. Run this server with `yarn dev` and then access the site at http://localhost:3000.

This server:

1. builds the current contents of `src/admin-footer/index.ts` and `src/public-footer/index.ts` whenever any files in the `src` directory are changed, including source maps
2. injects these two scripts into our MyTurn site, _replacing_ the deployed/production scripts

Gotchas:

- If you create a new script, make sure that it is `import`ed in its respective `index.ts` or else it will not work
- [This proxy server _does not_ work in macOS Safari](https://bugs.webkit.org/show_bug.cgi?id=232088)
- There are some cases where MyTurn redirects you back to the real site (ie, from http://localhost:3000 to https://capitolhill.myturn.com); if notice that your code isn't working, make sure your browser is still pointed at `localhost`

### Conventions

Look at existing modules for patterns and best practices, but here are some suggested patterns:

- Document your module's purpose/functionality at the top of the file. We may centralize module documentation in the future, but this is our current approach.
- Keep each module focused on only one atomic purpose. Other tool libraries may re-use some modules in the future, so each module should be able to function independently of others.
- If your code should only run on a single MyTurn page, use a `window.location.pathname === "/your/desired/path"` check to ensure it doesn't accidentally affect a different MyTurn page as well

Your contributions must also conform to ESLint and Prettier formatting. You can run these locally using `yarn lint` and `yarn format`, respectively. These are enforced automatically on all pull requests.
