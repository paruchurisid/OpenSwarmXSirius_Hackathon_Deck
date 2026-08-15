# Dual-Loop Retention Swarm — pitch deck

A 14-slide static presentation. Auto-advances unattended on a table, drives manually during judging.

## Stack decision

Hand-written HTML, CSS and vanilla JS. No framework, no build step.

Rationale: 14 slides of fixed content have no state to manage and no components to reuse across a boundary that a framework would help with — a build step would only add a toolchain between an edit and the projector.

## Before you present

Two placeholders need a real value. Both are plain string replacements:

- `TEAM NAME` — appears in the brand mark on every slide, plus slides 01 and 14
- `github.com/your-org/dual-loop-retention-swarm` — the repo link on slide 14

```bash
sed -i 's/TEAM NAME/Your Team/g; s|your-org/dual-loop-retention-swarm|realorg/realrepo|g' index.html
```

Also set `app` in `fly.toml` to your own Fly app name.

## Controls

| Input | Action |
|---|---|
| Auto-advance | 7s default; 9s on dense slides, 12s on the closer |
| `Space` | Pause / resume, with a visible state change in the hint and progress bar |
| `←` `→`, `PageUp` `PageDown` | Previous / next |
| `Home` `End` | First / last slide |
| Click | Left third back, right two-thirds forward |
| `#7` | Deep-links to slide 7 and stays there |
| `?autoplay=0` | Starts paused, for manual presenting |

The URL hash tracks the current slide, so you can reload into wherever you were rehearsing.

## Design notes

The deck matches the visual language of the OpenSwarm hackathon deck it will be shown alongside: a fixed 1280×720 stage scaled to fit, the violet → cyan → rose → gold spectral gradient, glass cards over a dotted field, and the same status-pill family. None of its brand assets, wordmark or copy are used — the mark is an original two-loop glyph and the content is entirely ours.

**Every card showing system output carries a `SIMULATED` pill.** The mock UI is the point of the deck and it looks real. A judge who assumes `$450 LTV erosion` came from a real customer and later learns otherwise stops trusting the whole pitch; labeled up front, the same card reads as a working system. Don't remove those pills.

Typography is the system font stack (`-apple-system`, `Segoe UI Variable Display`, etc.). No webfonts anywhere, which is why the browser makes zero external network requests.

### Accessibility and degradation

- Content is fully readable with JavaScript off — every slide renders as a stacked sequence.
- `prefers-reduced-motion` turns cross-fades into instant cuts; auto-advance still runs.
- Below 820px or in portrait, slides stack and scroll rather than scaling to unreadable.
- Visible focus rings on the three nav buttons; card interior colours are contrast-checked against white.

## Deploying

Asset paths are **relative** (`assets/deck.css`), so the same bundle serves correctly from a Fly root domain and a GitHub Pages subpath (`/repo-name/`) with no changes. Absolute `/assets/...` paths would break the Pages target — don't switch them.

### Fly.io

```bash
fly launch --no-deploy --copy-config --name your-app-name
fly deploy
```

Serves via `nginx:alpine` on port 8080, `force_https`, scale-to-zero when idle.

### GitHub Pages

Push to `main`. `.github/workflows/pages.yml` stages `index.html` + `assets/` and publishes. Enable it once under **Settings → Pages → Source → GitHub Actions**.

Note: the workflow lives at `.github/workflows/pages.yml` **relative to the repository root**. If you commit this folder as a subdirectory rather than as the repo root, move `.github/` up to the root and adjust the `cp` paths in the staging step.

## Budget

Total bundle is roughly 60KB uncompressed across three files and one favicon, well inside the 500KB ceiling. First paint is a single render-blocking stylesheet with no font fetch.
