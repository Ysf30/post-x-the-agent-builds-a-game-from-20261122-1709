#!/usr/bin/env python3
"""Build video.mp4 for the make.fun post-x bounty (9:16, ~29.5 s).

Timeline (all times in seconds, 1080x1920, 30 fps base):
  0.0-4.5   Hook: the one prompt types itself out, word by word.
  4.5-13.0  The agent at work: terminal, real lines from game-logic.js.
  13.0-29.5 The finished game RUNNING (real gameplay rendered by
            video/render-game.mjs from the same game-logic.js the
            browser game uses), closing on "Come build on make.fun".
  27.0-29.5 make.fun referral end card (press pack, 9:16 transparent
            webm) overlaid on the last 2.5 s, code gbq9kx7j typed in.

Audio: a small generated chiptune arpeggio bed (no external music).
Run from the repository root:  python3 video/build-video.py
Outputs work/video.mp4 (next to this repo's parent entry dir: ../video.mp4
is written to the entry folder, NOT into the repo, so the repo stays
source-only).
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
ENTRY = os.path.dirname(REPO)
WORK = os.path.join(ENTRY, 'work')
ASSETS = os.path.join(WORK, 'assets')
OUT = os.path.join(ENTRY, 'video.mp4')

W, H = 1080, 1920
FPS = 30
INTRO_S = 13.0
GAME_S = 16.5
TOTAL_S = INTRO_S + GAME_S  # 29.5
CARD_T = TOTAL_S - 2.5      # 27.0
REFERRAL_CODE = 'gbq9kx7j'

DEJAVU_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
DEJAVU_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
JETBRAINS_BOLD = os.path.join(ASSETS, 'JetBrainsMono-Bold.ttf')
CARD = os.path.join(ASSETS, 'makefun-card-9x16-transparent.webm')
BADGE = os.path.join(ASSETS, 'makefun-badge-9x16.png')


def run(cmd, **kw):
    print('+', ' '.join(str(c) for c in cmd), flush=True)
    subprocess.run(cmd, check=True, **kw)


def esc_text(s):
    # drawtext textfile content needs no escaping; filter args do.
    return s


def write_prompt_steps():
    """Word-by-word reveal files for the hook scene."""
    words = ['Build', 'me', 'a', 'tiny', 'browser', 'game:',
             'catch', 'the', 'falling', 'stars.', '60', 'seconds.', 'Go.']
    # Line breaks of the full prompt (4 lines, centred as a block).
    lines = ['Build me a tiny', 'browser game:',
             'catch the falling stars.', '60 seconds. Go.']
    # Map each word to its line.
    word_lines = []
    for ln in lines:
        word_lines.append(ln.split(' '))
    paths = []
    shown = []
    step = 0
    for li, ws in enumerate(word_lines):
        for w in ws:
            shown.append(w)
            # Rebuild the visible lines from the words shown so far.
            visible = []
            idx = 0
            for lj, wj in enumerate(word_lines):
                part = []
                for w2 in wj:
                    if idx < len(shown):
                        part.append(w2)
                    idx += 1
                if part:
                    visible.append(' '.join(part))
            p = os.path.join(WORK, f'prompt-{step:02d}.txt')
            with open(p, 'w') as f:
                f.write('\n'.join(visible))
            paths.append(p)
            step += 1
    return paths


def build_intro():
    """0-13 s: hook + terminal. Silent, 30 fps."""
    steps = write_prompt_steps()
    n_steps = len(steps)
    step_dur = 0.32
    start = 0.3
    filters = []

    # A few static background stars (drawbox dots, low alpha).
    dots = [(120, 180), (960, 320), (300, 1500), (880, 1650), (180, 1750),
            (1020, 900), (60, 1050), (540, 120), (760, 1800), (420, 1850)]
    for (x, y) in dots:
        filters.append(
            f"drawbox=x={x}:y={y}:w=5:h=5:color=white@0.28:t=fill")

    # Hook label, kept clear of the make.fun badge zone (y 272-400).
    filters.append(
        f"drawtext=fontfile={DEJAVU_BOLD}:text='ONE PROMPT':fontsize=56:"
        f"fontcolor=0xff2e9d:x=(w-text_w)/2:y=470:enable='between(t,0,4.5)'")

    # Word-by-word prompt reveal.
    for i, p in enumerate(steps):
        a = start + i * step_dur
        b = start + (i + 1) * step_dur
        if i == n_steps - 1:
            b = 4.5
        filters.append(
            f"drawtext=fontfile={DEJAVU_BOLD}:textfile='{p}':fontsize=62:"
            f"fontcolor=white:line_spacing=18:x=(w-text_w)/2:y=900:"
            f"enable='between(t,{a:.2f},{b:.2f})'")

    # Hook bottom line.
    filters.append(
        f"drawtext=fontfile={DEJAVU_BOLD}:text='my AI agent is about to build this.':"
        f"fontsize=44:fontcolor=0x9aa0b5:x=(w-text_w)/2:y=1560:"
        f"enable='between(t,2.0,4.5)'")

    # Agent-at-work label, below the terminal window (badge zone is y 272+).
    filters.append(
        f"drawtext=fontfile={DEJAVU_BOLD}:text='THE AGENT, AT WORK':fontsize=56:"
        f"fontcolor=0xff2e9d:x=(w-text_w)/2:y=1560:enable='between(t,4.5,13)'")

    # Terminal window.
    filters.append("drawbox=x=70:y=420:w=940:h=1080:color=0x11162e:t=fill:enable='between(t,4.5,13)'")
    filters.append("drawbox=x=70:y=420:w=940:h=72:color=0x1c2447:t=fill:enable='between(t,4.5,13)'")
    filters.append("drawbox=x=70:y=420:w=940:h=1080:color=0x2a3358:t=4:enable='between(t,4.5,13)'")
    filters.append(
        f"drawtext=fontfile={DEJAVU_MONO}:text='agent — building star-catcher':"
        f"fontsize=36:fontcolor=0x9aa0b5:x=110:y=438:enable='between(t,4.5,13)'")

    term_lines = [
        ('$ agent build star-catcher', '0xffffff', 0),
        ('✓ prompt received — 1 prompt, 0 edits', '0x4ade80', 1),
        ('writing game-logic.js ...', '0xffffff', 2),
        ('  function step(s, input, dt) {', '0x9aa0b5', 3),
        ('    s.timeLeft -= dt;', '0x9aa0b5', 4),
        ('writing game.html ...', '0xffffff', 5),
        ('✓ game.html — DONE', '0x4ade80', 6),
        ('✓ 60s timer · 3 lives · golden stars', '0x4ade80', 7),
        ('▶ starting the game…', '0xff2e9d', 8),
    ]
    for text, color, idx in term_lines:
        a = 4.7 + idx * 0.75
        y = 540 + idx * 62
        safe = text.replace("'", "'\\\\''")
        filters.append(
            f"drawtext=fontfile={DEJAVU_MONO}:text='{safe}':fontsize=38:"
            f"fontcolor={color}:x=110:y={y}:enable='between(t,{a:.2f},13)'")

    # Progress bar: 8 stepped segments (drawbox's w expression does not
    # animate with t the way the docs suggest, so step it explicitly).
    filters.append("drawbox=x=110:y=1420:w=820:h=16:color=0x2a3358:t=fill:enable='between(t,4.7,13)'")
    for seg in range(8):
        sx = 110 + seg * 102.5
        sa = 4.7 + seg * 1.0
        filters.append(
            f"drawbox=x={sx}:y=1420:w=102.5:h=16:color=0xe91e8c:t=fill:"
            f"enable='between(t,{sa:.1f},13)'")
    filters.append(
        "drawbox=x=110:y=1098:w=22:h=44:color=white:t=fill:"
        "enable='between(t,11.45,13)*lt(mod(t,1),0.6)'")

    vf = ','.join(filters)
    run(['ffmpeg', '-y', '-v', 'error',
         '-f', 'lavfi', '-i', f'color=c=0x0b1026:s={W}x{H}:d={INTRO_S}:r={FPS}',
         '-vf', vf,
         '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', str(FPS),
         os.path.join(WORK, 'intro.mp4')])


def build_gameplay():
    """13-29.5 s of real gameplay, rendered from the real game logic."""
    out = os.path.join(WORK, 'gameplay.mp4')
    render = subprocess.Popen(
        ['node', os.path.join(REPO, 'video', 'render-game.mjs'),
         '--seconds', str(GAME_S), '--fps', str(FPS),
         '--seed', '7', '--preroll', '4'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=REPO)
    ff = subprocess.Popen(
        ['ffmpeg', '-y', '-v', 'error',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
         '-r', str(FPS), '-i', '-',
         '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out],
        stdin=render.stdout)
    render.stdout.close()
    _, err = render.communicate()
    sys.stderr.write(err.decode())
    if render.returncode != 0:
        raise SystemExit(f'render-game.mjs failed ({render.returncode})')
    ff.wait()
    if ff.returncode != 0:
        raise SystemExit(f'ffmpeg gameplay encode failed ({ff.returncode})')
    print('gameplay.mp4 written', flush=True)


def build_music():
    """32 s chiptune arpeggio bed (A minor), fades out at the end."""
    step = 0.2142857  # 8th note at 140 BPM
    seq = [440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 523.25]
    n = f'mod(floor(t/{step}),8)'
    f = str(seq[-1])
    for val, note in reversed(list(enumerate(seq))):
        f = f'if(eq({n},{val}),{note},{f})'
    lead = f'0.20*sin(2*PI*({f})*t)*(1-0.7*mod(t,{step})/{step})'
    bass = '0.10*sin(2*PI*55*t)'
    expr = f'{lead}+{bass}'
    run(['ffmpeg', '-y', '-v', 'error',
         '-f', 'lavfi', '-i', f"aevalsrc='{expr}':sample_rate=48000:duration=32",
         '-af', 'afade=t=out:st=30.5:d=1.5',
         '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
         os.path.join(WORK, 'music.m4a')])


def build_base():
    """Concat intro + gameplay, add captions and the closing call."""
    intro = os.path.join(WORK, 'intro.mp4')
    game = os.path.join(WORK, 'gameplay.mp4')
    filters = [
        # "IT PLAYS. FOR REAL." mid-frame, clear of the HUD and the badge.
        f"drawtext=fontfile={DEJAVU_BOLD}:text='IT PLAYS. FOR REAL.':fontsize=84:"
        f"fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=30:"
        f"x=(w-text_w)/2:y=700:enable='between(t,13,16.5)'",
        # Small honesty label under the gameplay, below the basket (y 1680+).
        f"drawtext=fontfile={DEJAVU_BOLD}:text='real gameplay — no mockup':fontsize=44:"
        f"fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=20:"
        f"x=(w-text_w)/2:y=1830:enable='between(t,13,26)'",
        # Closing call over the still-running game (26-29.5).
        "drawbox=x=0:y=0:w=1080:h=1920:color=black@0.45:t=fill:enable='between(t,26,29.5)'",
        f"drawtext=fontfile={DEJAVU_BOLD}:text='Come build on':fontsize=96:"
        f"fontcolor=white:x=(w-text_w)/2:y=780:enable='between(t,26,29.5)'",
        f"drawtext=fontfile={DEJAVU_BOLD}:text='make.fun':fontsize=150:"
        f"fontcolor=0xff2e9d:x=(w-text_w)/2:y=900:enable='between(t,26,29.5)'",
        f"drawtext=fontfile={DEJAVU_BOLD}:text='Your agent builds. You get paid.':fontsize=48:"
        f"fontcolor=white:x=(w-text_w)/2:y=1150:enable='between(t,26,29.5)'",
    ]
    fc = (
        f"[0:v][1:v]concat=n=2:v=1:a=0[v0];"
        f"[v0]{','.join(filters)}[v]"
    )
    run(['ffmpeg', '-y', '-v', 'error',
         '-i', intro, '-i', game,
         '-filter_complex', fc,
         '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
         '-crf', '18', '-r', str(FPS),
         os.path.join(WORK, 'base.mp4')])


def build_final():
    """Press-pack end card over the last 2.5 s + badge + music."""
    # Recipe from https://make.fun/press/llms.txt (9:16 numbers).
    # HOLD=0: the card lays over the clip's last seconds.
    w, h = W, H
    length, rest = 2.5, 1.433
    cx, cy, cw, ch, mid, size = 210, 1232, 5, 78, 1271, 62
    t = CARD_T
    fc = (
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
        f"setsar=1,fps=60,format=yuva420p,split[clip][soft];"
        f"[soft]gblur=sigma=28,eq=saturation=0.35,"
        f"fade=t=in:st={t}:d=0.8:alpha=1[soft];"
        f"[clip][soft]overlay[bg];"
        f"[1:v]format=yuva420p,setpts=PTS-STARTPTS+{t}/TB[card];"
        f"[bg][card]overlay=eof_action=pass,"
        f"drawbox=x={cx - 2}:y={cy - 2}:w={cw + 4}:h={ch + 4}:color=white:t=fill:"
        f"enable='gte(t,{t + rest})',"
        f"drawtext=fontfile={JETBRAINS_BOLD}:text={REFERRAL_CODE}:fontsize={size}:"
        f"fontcolor=0x191419:x={cx}:y={mid}-(ascent-descent)/2:"
        f"enable='gte(t,{t + rest})'[v]"
    )
    # Badge from frame 0 until the card comes in (second recipe in llms.txt).
    # The recipe above has no badge input; add it via a second overlay pass
    # instead: badge first, then the card recipe reads the badged clip.
    badged = os.path.join(WORK, 'badged.mp4')
    run(['ffmpeg', '-y', '-v', 'error',
         '-i', os.path.join(WORK, 'base.mp4'), '-i', BADGE,
         '-filter_complex',
         f"[0:v][1:v]overlay=enable='lt(t,{t})'[v]",
         '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
         '-crf', '18', '-r', str(FPS), badged])
    run(['ffmpeg', '-y', '-v', 'error',
         '-i', badged, '-c:v', 'libvpx-vp9', '-i', CARD,
         '-i', os.path.join(WORK, 'music.m4a'),
         '-filter_complex', fc,
         '-map', '[v]', '-map', '2:a',
         '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
         '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
         '-shortest', OUT])
    print('wrote', OUT, flush=True)


def main():
    os.makedirs(WORK, exist_ok=True)
    for name in ('intro.mp4', 'gameplay.mp4', 'base.mp4', 'badged.mp4', 'music.m4a'):
        p = os.path.join(WORK, name)
        if os.path.exists(p):
            os.remove(p)
    build_intro()
    build_gameplay()
    build_music()
    build_base()
    build_final()
    info = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries',
         'format=duration,size', '-show_entries', 'stream=width,height,codec_name',
         '-of', 'json', OUT], capture_output=True, text=True, check=True)
    print(json.dumps(json.loads(info.stdout), indent=1))


if __name__ == '__main__':
    main()
