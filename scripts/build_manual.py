"""Compatibility entry point for the official MeatLens manual builder.

The DOCX implementation uses the workspace's Node document runtime; this wrapper
keeps the documented Python command stable on systems where Python is the default
script launcher.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    script = Path(__file__).with_name("build_manual.mjs")
    result = subprocess.run(["node", str(script), *sys.argv[1:]], check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
