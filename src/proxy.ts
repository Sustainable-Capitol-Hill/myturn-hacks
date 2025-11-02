import express from "express";
import { JSDOM } from "jsdom";
import * as path from "path";
import * as esbuild from "esbuild";
import type { Request, Response } from "express";

/*
 * This script runs a proxy server that:
 * - serves bundled scripts at /devscripts/{script}.js
 * - proxies everything else to MyTurn
 * - injects middleware which replaces <script> tags referencing known scripts
 *   with the ones served locally.
 */

const HOST = process.argv[2] ?? "localhost";
const PORT = process.argv[3] ? Number.parseInt(process.argv[3]) : 3000;
const MYTURN = "https://capitolhill.myturn.com";
const SCRIPTS = ["public-footer", "admin-footer"];

import {
  createProxyMiddleware,
  responseInterceptor,
} from "http-proxy-middleware";

const app = express();

const bundle = async (folder: (typeof SCRIPTS)[number]): Promise<string> => {
  const entrypoint = path.join(import.meta.dirname, folder);
  const output = await esbuild.build({
    entryPoints: [entrypoint],
    bundle: true,
    minify: true,
    sourcemap: "inline",
    target: "es2015",
    write: false,
  });

  return output.outputFiles[0]?.text ?? "";
};

const proxyMiddleware = createProxyMiddleware<Request, Response>({
  target: MYTURN,
  changeOrigin: true,
  selfHandleResponse: true,
  on: {
    proxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        const contentType = proxyRes.headers["content-type"];

        // redirect everything back to proxy
        if (proxyRes.headers.location) {
          res.setHeader(
            "location",
            proxyRes.headers.location.replaceAll(
              MYTURN,
              `http://${HOST}:${PORT}`,
            ),
          );
        }

        if (!(contentType && contentType.startsWith("text/html"))) {
          // don't try to munge any non-html files
          return responseBuffer;
        }

        const response = responseBuffer.toString("utf8");
        const soup = new JSDOM(response);

        // replace src of all hack scripts with our local ones
        SCRIPTS.forEach((script) => {
          const el = soup.window.document.querySelector(
            `script[src$="${script}.js"]`,
          );
          el?.setAttribute("id", `__devscript=${script}`);
          el?.setAttribute(
            "src",
            `http://${HOST}:${PORT}/devscripts/${script}.js`,
          );
        });

        return soup.serialize();
      },
    ),
  },
});

/**
 * Serve bundled scripts at /devscripts
 */
app.get("/devscripts/:scriptName.js", async (req, res) => {
  if (!SCRIPTS.includes(req.params.scriptName)) {
    res.status(404).send();
    return;
  }

  res.header("content-type", "text/javascript");
  res.send(await bundle(req.params.scriptName));
});

/**
 * Proxy everything else to MyTurn
 */
app.use("/", proxyMiddleware);

app.listen(PORT);
console.log(`Proxy server listening on port ${PORT}`);
