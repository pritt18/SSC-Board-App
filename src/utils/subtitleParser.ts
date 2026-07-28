export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

const parseSrtTime = (
  value: string,
): number => {
  const normalized = value
    .trim()
    .replace('.', ',');

  const [
    hours,
    minutes,
    secondsPart,
  ] = normalized.split(':');

  if (
    hours === undefined ||
    minutes === undefined ||
    secondsPart === undefined
  ) {
    return 0;
  }

  const [
    seconds,
    milliseconds = '0',
  ] = secondsPart.split(',');

  return (
    Number(hours) * 3600000 +
    Number(minutes) * 60000 +
    Number(seconds) * 1000 +
    Number(
      milliseconds
        .padEnd(3, '0')
        .slice(0, 3),
    )
  );
};

export const parseSrt = (
  content: string,
): SubtitleCue[] => {
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n\s*\n/)
    .map(block => {
      const lines = block
        .split('\n')
        .map(line => line.trim());

      const timeLineIndex =
        lines.findIndex(
          line =>
            line.includes('-->'),
        );

      if (timeLineIndex === -1) {
        return null;
      }

      const [
        start,
        end,
      ] = lines[
        timeLineIndex
      ].split('-->');

      if (!start || !end) {
        return null;
      }

      const text = lines
        .slice(
          timeLineIndex + 1,
        )
        .filter(Boolean)
        .join('\n')
        .trim();

      if (!text) {
        return null;
      }

      return {
        startTime:
          parseSrtTime(start),

        endTime:
          parseSrtTime(end),

        text,
      };
    })
    .filter(
      (
        item,
      ): item is SubtitleCue =>
        item !== null,
    );
};