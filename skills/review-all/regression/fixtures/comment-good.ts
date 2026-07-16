import { retryUntilAvailable } from './retry';
import { cdn } from './cdn';
import { useEffect } from 'react';

const AUDIT_LOG_RETENTION_DAYS = 30;

export function auditRetentionSeconds(): number {
  // 개인정보 처리방침(SEC-142)에 따라 탈퇴 사용자 감사 로그를 30일간 보존한다.
  return AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60;
}

export async function loadConvertedImage(id: string): Promise<Buffer> {
  // API-381: 변환 완료 응답과 CDN 반영 사이에 지연이 있어 즉시 조회하면 404가 날 수 있다.
  // 문제 해결 전까지 최대 5회 재시도한다.
  return retryUntilAvailable(() => cdn.fetch(id), {
    intervalMs: 1000,
    maxAttempts: 5,
  });
}

export function useEditor(documentId: string) {
  // initializeEditor는 생성 시점의 옵션만 사용해야 한다.
  // documentId 외 값 변경마다 재초기화하면 편집 중 선택 영역과 undo 스택이 사라진다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    initializeEditor(documentId);
  }, [documentId]);
}

declare function initializeEditor(documentId: string): void;
