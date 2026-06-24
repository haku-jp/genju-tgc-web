const LINE_START_PROHIBITED = new Set(
  Array.from("。、，．）」』】〕〉》!?！？・ー…〜：；,.、。，．)]}ぁぃぅぇぉゃゅょっァィゥェォャュョッんン"),
);
const LINE_END_CONTINUES = new Set(Array.from("ー"));
const KANA_PATTERN = /^[\u3040-\u30ff]$/u;
const ASCII_WORD_PATTERN = /^[A-Za-z0-9]$/;

export function wrapJa(text: string, maxCharsPerLine: number): string {
  const limit = Math.max(1, Math.floor(maxCharsPerLine));
  const lines: string[] = [];

  for (const sourceLine of text.replace(/\r\n/g, "\n").split("\n")) {
    if (sourceLine.length === 0) {
      lines.push("");
      continue;
    }

    const chars = Array.from(sourceLine);
    let line = "";
    let count = 0;
    let usedOverflow = false;

    for (let i = 0; i < chars.length; i += 1) {
      line += chars[i];
      count += 1;

      if (count >= limit) {
        const next = chars[i + 1];
        if (next && shouldKeepWithPrevious(chars[i], next, usedOverflow)) {
          usedOverflow = true;
          continue;
        }

        lines.push(line);
        line = "";
        count = 0;
        usedOverflow = false;
      }
    }

    if (line.length > 0) {
      lines.push(line);
    }
  }

  return lines.join("\n");
}

function shouldKeepWithPrevious(current: string, next: string, usedOverflow: boolean): boolean {
  if (LINE_START_PROHIBITED.has(next)) {
    return true;
  }
  if (usedOverflow) {
    return false;
  }
  if (LINE_END_CONTINUES.has(current) && KANA_PATTERN.test(next)) {
    return true;
  }
  return ASCII_WORD_PATTERN.test(current) && ASCII_WORD_PATTERN.test(next);
}
