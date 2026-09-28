# Fonts

Self-hosted so the site makes no third-party font requests. All fonts are
licensed under the SIL Open Font License 1.1 (see the `OFL-*.txt` files).

| File | Family | Axes / weight | Source |
| --- | --- | --- | --- |
| `newsreader-latin-opsz-normal.woff2` | Newsreader | opsz 6–72, wght 200–800 | `@fontsource-variable/newsreader@5.3.0` |
| `newsreader-latin-wght-italic.woff2` | Newsreader Italic | wght 200–800 | `@fontsource-variable/newsreader@5.3.0` |
| `ibm-plex-sans-latin-wght-normal.woff2` | IBM Plex Sans | wght 100–700 | `@fontsource-variable/ibm-plex-sans@5.3.0` |
| `ibm-plex-mono-latin-400-normal.woff2` | IBM Plex Mono | 400 | `@fontsource/ibm-plex-mono@5.3.0` |
| `ibm-plex-mono-latin-500-normal.woff2` | IBM Plex Mono | 500 | `@fontsource/ibm-plex-mono@5.3.0` |

Only the Latin subset is included. To update, `npm pack` the package version
above and copy the same files from its `files/` directory.
