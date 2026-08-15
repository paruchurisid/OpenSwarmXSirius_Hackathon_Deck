# In-Sid-ious by Sid - pitch deck

A 15-slide static presentation. Auto-advances unattended on a table, drives manually during judging.

## Stack decision

Hand-written HTML, CSS and vanilla JS. No framework, no build step.

Rationale: 15 slides of fixed content have no state to manage and no components to reuse across a boundary that a framework would help with - a build step would only add a toolchain between an edit and the projector.

## Links included in the deck

- `https://www.linkedin.com/in/siddhartha-paruchuri-34a353293/`
- `https://paruchurisid.github.io`

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

## Deploying

This is a static site served by `nginx:alpine` from the contents of this directory. There is no build step.

### Fly.io

```bash
fly launch --no-deploy --copy-config --name in-sid-ious-by-sid
fly deploy
```

The container listens on port 80 and Fly routes HTTP traffic there through `[http_service]`.

## Files

- `index.html` - slide content and structure
- `assets/deck.css` - presentation styling
- `assets/deck.js` - navigation and autoplay
- `assets/qr-linkedin.png` - LinkedIn QR code
- `assets/qr-portfolio.png` - portfolio QR code
- `Dockerfile` - nginx static image
- `fly.toml` - Fly configuration
- `.dockerignore` - build context cleanup
