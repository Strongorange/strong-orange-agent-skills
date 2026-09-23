import { legacyClient } from './legacy-client';
import { metricsSink } from './metrics';

export function buildSearchQuery(keyword: string, page: number): string {
  // 키워드를 트림하고 소문자로 바꾼 뒤 페이지 오프셋을 20 단위로 계산한다
  const normalized = keyword.trim().toLowerCase();
  const offset = (page - 1) * 50;

  return `q=${encodeURIComponent(normalized)}&offset=${offset}`;
}

// 성능을 위해 Map 을 사용한다
const RENDERER_BY_TYPE = new Map<string, string>([
  ['chart', 'chart-renderer'],
  ['table', 'table-renderer'],
]);

export function pickRenderer(payload: { type: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = payload as any;

  return RENDERER_BY_TYPE.get(raw.type) ?? 'default';
}

export async function syncLegacyOrder(orderId: string): Promise<void> {
  // 레거시 서버가 동시 요청을 못 버텨서 순차로 보낸다. TICKET-4412 에서 배치 API 가 열리면 제거.
  for (const chunk of await legacyClient.chunksOf(orderId)) {
    await legacyClient.push(chunk);
  }
}

export async function flushMetrics(): Promise<void> {
  try {
    await metricsSink.flush();
  } catch {
    // 지표 유실은 주문 처리를 막을 이유가 안 된다
  }
}

export function resolveTimeout(): number {
  // 외부 게이트웨이가 30초에서 끊는다 (SUP-902). 그보다 짧아야 우리 쪽 재시도가 먹는다.
  return 25_000;
}

export function normalizePhone(input: string): string {
  // eslint-disable-next-line no-control-regex -- 레거시 DB 에 제어문자가 섞여 들어온 이력이 있다
  return input.replace(/[\x00-\x1F]/g, '').replace(/-/g, '');
}
