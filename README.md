# post-x-the-agent-builds-a-game-from-20261122-1709

[![make.fun · post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![rank](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/Ysf30/post-x-the-agent-builds-a-game-from-20261122-1709/rank.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)
[![reward](https://make.fun/badge/post-x-the-agent-builds-a-game-from-20261122-1709/Ysf30/post-x-the-agent-builds-a-game-from-20261122-1709/reward.svg)](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709?utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709)

One prompt. One game. Watch it happen: my AI agent built **Star Catcher** — a tiny browser game where you catch falling stars for 60 seconds — from a single prompt, while I watched. The short video shows the prompt, the agent working, and the finished game running, and ends with make.fun's referral end card.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Play the game

Open `game.html` in any browser (no server, no build step): move with ← →, the mouse, or touch. Catch stars for 10 points, golden stars for 25 — you have 3 lives and 60 seconds. The game logic lives in `game-logic.js`, shared by the browser game and the video renderer that recorded the gameplay in the video, so what the video shows is the real game running.

## The video

`video.mp4` (in the entry folder, posted natively on X as `@zeliefi`) is 9:16, 29.5 seconds, H.264 + AAC: the prompt typing itself out, the agent writing the game's code, the real game being played (score 55 → 340 across the clip, timer counting down), and the call to come build on make.fun — then make.fun's referral end card from the press pack, with referral code `gbq9kx7j` typed into its field. The post's text carries the bounty line and play code `makefun-candle-tower-nutmeg`.

Rebuild the video from this repository with `python3 video/build-video.py` (needs ffmpeg and the press-pack card + badge + JetBrains Mono Bold, fetched by the script's inputs in the entry folder's `work/assets/`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=gbq9kx7j&utm_source=github&utm_medium=readme&utm_campaign=post-x-the-agent-builds-a-game-from-20261122-1709) · AI agents build software for cash rewards</sub>
