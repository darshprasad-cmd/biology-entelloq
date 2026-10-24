"""Rebuild the actual Manim films, browser MP4s, posters and static frames."""
from pathlib import Path
import json
import subprocess
import sys
import hashlib
import av
import imageio_ffmpeg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "media"
OUT.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def run(args):
    subprocess.run([str(x) for x in args], cwd=ROOT, check=True)

results = []
for subject, scene in [("physics", "VectorAddition"), ("biology", "EnzymeCycle")]:
    run([sys.executable, "-m", "manim", "render", "--format", "mp4", "--renderer", "cairo",
         "--disable_caching", "-r", "1280,720", "--fps", "30", "--media_dir", "render-cache", "scenes.py", scene])
    original = next((ROOT / "render-cache/videos").rglob(scene + ".mp4"))
    final = OUT / (subject + ".mp4")
    run([FFMPEG, "-y", "-v", "error", "-i", original, "-an", "-c:v", "libx264", "-crf", "21", "-preset", "slow",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", final])
    # A complete FFmpeg decode, not just container inspection.
    run([FFMPEG, "-v", "error", "-i", final, "-f", "null", "-"])
    with av.open(final) as container:
        stream = container.streams.video[0]
        info = {"subject": subject, "duration": float(stream.duration * stream.time_base), "frames": stream.frames,
                "width": stream.width, "height": stream.height, "fps": str(stream.average_rate),
                "codec": stream.codec_context.name, "pixelFormat": stream.codec_context.format.name,
                "audioStreams": len(container.streams.audio), "bytes": final.stat().st_size,
                "sha256": hashlib.sha256(final.read_bytes()).hexdigest(), "fullFFmpegDecode": "passed"}
    assert info["duration"] == 22 and info["frames"] == 660
    assert (info["width"], info["height"]) == (1280, 720)
    assert info["bytes"] < 2_500_000
    frames = []
    for i, sec in enumerate([4.5, 9.5, 15.5, 21.5]):
        path = OUT / f"{subject}-step-{i + 1}.png"
        run([FFMPEG, "-y", "-v", "error", "-ss", sec, "-i", final, "-frames:v", "1", path])
        frames.append(Image.open(path).convert("RGB"))
    frames[-1].save(OUT / f"{subject}-poster.png")
    contact = Image.new("RGB", (1280, 720), "#081426")
    for i, frame in enumerate(frames):
        contact.paste(frame.resize((640, 360)), ((i % 2) * 640, (i // 2) * 360))
    (ROOT / "qa").mkdir(exist_ok=True)
    contact.save(ROOT / "qa" / f"{subject}-contact.png")
    results.append(info)
(ROOT / "qa/media-checks.json").write_text(json.dumps({"manim": "0.22.0", "checks": results}, indent=2) + "\n")
print(json.dumps(results, indent=2))
