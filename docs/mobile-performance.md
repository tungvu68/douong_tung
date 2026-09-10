# Mobile audio and rendering — 2026-09-09

## Findings and changes

The old implementation created a fresh HTMLAudioElement for every crossing tick and reveal, calling play() from requestAnimationFrame and swallowing rejections. Safari's gesture-based media policy makes this unreliable. It also creates repeated media-player work. This is an identified compatibility problem, not a confirmed diagnosis of one particular physical phone.

The replacement uses one AudioContext, decoded buffers and short-lived AudioBufferSourceNodes. Files are fetched and decoded before the click; resume() is invoked synchronously inside the open/unmute gesture. navigator.audioSession.type is feature-detected and set to playback. Older iOS without AudioSession uses one reusable silent media element for the media audio route. Muting stops active sources; hidden-page playback is stopped, and returning to the page attempts to recover an already activated context. Browsers may still require a new tap after an interruption.

The original WAV assets remain as sources. Playback uses MP3 encodings (~408 KiB including the legacy silent clip, versus ~3.8 MiB WAV). No synthesized replacement sounds were introduced. Encoding command: ffmpeg -i source.wav -codec:a libmp3lame -q:a 3 output.mp3.

The reel mounts at most 12 cards instead of 116 initially and roughly 40 during a roll. Windowing preserves absolute slot IDs/coordinates and the continuous transform, so it cannot intentionally reverse or rebase the reel. Memoized cards/catalog avoid rerendering the 116-item inventory on each window change. Offscreen catalog painting uses content-visibility; mobile uses a scrolling background and omits the gold SVG drop shadow. Legacy blur CSS was already overridden; it was removed as dead code, not identified as an active cause.

Counter wording: “Cư dân mạng đã mở … hòm”.

## Validation and limits

TypeScript and static production build pass. Six consecutive geometry-instrumented rolls across desktop and a 320px mobile viewport, with 4× CPU slowdown on mobile, detected zero right-moving frames and matching pointer/winner IDs. Observed click-to-motion: 25–73 ms.

The browser audio test checks decoded sources actually start in a running context, a single context is reused, mute suppresses playback, unmute restores it, the strip never exceeds 12 cards, and the mocked counter wording. It mocks all counter requests to avoid inflating production totals. Run against a Pages preview:

```
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/mobile-audio.cjs
```

Set SITE_URL to override the preview URL, or BROWSER=webkit to try WebKit. Test Chrome executable currently uses the local macOS installation.

Playwright WebKit on this macOS version is a frozen build and hung at newPage(), before navigation. No physical iPhone was available; do not interpret Chromium mobile emulation or frame timing as proof of iPhone Safari performance or audible speaker output. Confirm on-device with silent switch on/off, low-power mode, mute/unmute, background/foreground, and several consecutive rolls.

## References

- [WebKit media gesture policy](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [AudioSession feature detection and playback](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession)
- [WebKit ringer/Web Audio discussion](https://bugs.webkit.org/show_bug.cgi?id=237322)
