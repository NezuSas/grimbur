"""
Converts the music WAV masters (assets-src/music) to the OGG Vorbis the app ships (src/assets/music):
about an eighth of the size, and OGG loops gaplessly on Android. iOS cannot play OGG: before an iOS
release, export the masters as .m4a/.caf instead and swap the requires in src/state/sound/store.ts.

  pip install soundfile
  python scripts/convertMusic.py
"""
import os

import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDER = os.path.join(ROOT, 'assets-src', 'music')
OUT = os.path.join(ROOT, 'src', 'assets', 'music')

BLOCK = 65536  # frames per write: one huge write overflows libsndfile's stack on Windows

for name in sorted(os.listdir(FOLDER)):
    if not name.endswith('.wav'):
        continue
    path = os.path.join(FOLDER, name)
    out = os.path.join(OUT, name[:-4] + '.ogg')
    with sf.SoundFile(path) as src, sf.SoundFile(out, 'w', samplerate=src.samplerate, channels=src.channels, format='OGG', subtype='VORBIS') as dst:
        while True:
            block = src.read(BLOCK)
            if len(block) == 0:
                break
            dst.write(block)
    print(name, os.path.getsize(path) // 1024, 'KB ->', os.path.basename(out), os.path.getsize(out) // 1024, 'KB')
