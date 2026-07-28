from pathlib import Path
import whisper

PROJECT_ROOT = Path(__file__).resolve().parent.parent

VIDEOS_DIR = PROJECT_ROOT / "assets" / "videos"
SUBTITLES_DIR = PROJECT_ROOT / "assets" / "subtitles"

SUPPORTED_FORMATS = {
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".webm",
}

MODEL_NAME = "base"


def format_timestamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)

    hours = milliseconds // 3_600_000
    milliseconds %= 3_600_000

    minutes = milliseconds // 60_000
    milliseconds %= 60_000

    secs = milliseconds // 1000
    milliseconds %= 1000

    return (
        f"{hours:02}:"
        f"{minutes:02}:"
        f"{secs:02},"
        f"{milliseconds:03}"
    )


def generate_srt(
    model,
    video_path: Path,
    output_path: Path,
) -> None:
    print()
    print(f"Processing: {video_path.name}")

    result = model.transcribe(
        str(video_path),
        task="transcribe",
        verbose=False,
    )

    segments = result.get(
        "segments",
        [],
    )

    if not segments:
        print(
            f"No speech detected: {video_path.name}"
        )
        return

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        for index, segment in enumerate(
            segments,
            start=1,
        ):
            start = format_timestamp(
                segment["start"]
            )

            end = format_timestamp(
                segment["end"]
            )

            text = (
                segment["text"]
                .strip()
            )

            file.write(
                f"{index}\n"
            )

            file.write(
                f"{start} --> {end}\n"
            )

            file.write(
                f"{text}\n\n"
            )

    print(
        f"Created: {output_path.name}"
    )


def main() -> None:
    print(
        "Automatic Subtitle Generator"
    )

    if not VIDEOS_DIR.exists():
        print(
            f"Videos folder not found: "
            f"{VIDEOS_DIR}"
        )
        return

    SUBTITLES_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    videos = [
        file
        for file in VIDEOS_DIR.iterdir()
        if (
            file.is_file()
            and
            file.suffix.lower()
            in SUPPORTED_FORMATS
        )
    ]

    if not videos:
        print(
            "No video files found."
        )
        return

    print(
        f"Found {len(videos)} video(s)."
    )

    print(
        f"Loading Whisper model: "
        f"{MODEL_NAME}"
    )

    model = whisper.load_model(
        MODEL_NAME
    )

    print(
        "Whisper model loaded."
    )

    for video_path in videos:
        output_path = (
            SUBTITLES_DIR
            /
            f"{video_path.stem}.srt"
        )

        if output_path.exists():
            print()
            print(
                f"Skipping existing: "
                f"{output_path.name}"
            )
            continue

        try:
            generate_srt(
                model,
                video_path,
                output_path,
            )

        except Exception as error:
            print(
                f"Failed: "
                f"{video_path.name}"
            )

            print(
                f"Error: {error}"
            )

    print()
    print(
        "Subtitle generation completed."
    )


if __name__ == "__main__":
    main()