// Entry for make.fun "The agent builds a game from one prompt"
// (post-x-the-agent-builds-a-game-from-20261122-1709, Node 22, stdlib only).
// The entry is the X post itself: an AI agent made a short video about an AI
// coding agent building the tiny browser game in game.html from one prompt,
// ending with make.fun's referral end card, and the video was posted natively
// on X. This program only hands the post's address to the grader: it copies
// POST.json from the repository root to /output/POST.json, where the gate
// reads it, and refuses to run on a placeholder address so a bad commit can
// never pass as a real post. Nothing it writes about the post is scored.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// An X post address looks like https://x.com/<handle>/status/<digits>
// (twitter.com works too). The starter placeholder and any address still
// carrying a REPLACE marker are not a post, so fail loudly instead of
// handing the grader a dead link.
const POST_URL_RE = /^https:\/\/(x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/[0-9]+$/;

const postPath = join(BOT_DIR, 'POST.json');
try {
  const parsed: unknown = JSON.parse(readFileSync(postPath, 'utf8'));
  const url = (parsed as { url?: unknown }).url;
  if (typeof url !== 'string' || !POST_URL_RE.test(url)) {
    throw new Error(`POST.json does not hold a real X post URL: ${String(url)}`);
  }
} catch (err) {
  console.error(`POST.json could not be read from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(postPath, join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
