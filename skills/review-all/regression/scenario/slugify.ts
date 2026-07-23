export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '');
}

// 한글 자모(ㄱ-ㅎ, ㅏ-ㅣ)는 완성형이 아니라 URL에서 깨져 보이므로 제외한다.
export function isSlugSafe(input: string): boolean {
  return !/[ㄱ-ㅎㅏ-ㅣ]/.test(input);
}
