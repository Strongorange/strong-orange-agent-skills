import { orderRepository } from './repository';

export class NotificationSender {
  // 알림을 보낸다.
  async send(userId: string, message: string): Promise<void> {
    // 사용자 ID로 사용자를 조회한다.
    const user = await orderRepository.findUserById(userId);

    // 사용자가 없으면 리턴한다.
    if (!user) {
      return;
    }

    // 2024-03-10 김철수: 초기 구현
    // 2024-07-21 이영희: 재시도 로직 추가
    // 2025-01-05 박민수: 재시도 횟수를 3회로 변경
    let attempts = 0;

    // 3번 반복한다.
    while (attempts < 3) {
      try {
        await this.deliver(user.email, message);
        // 성공하면 루프를 빠져나간다.
        break;
      } catch (e) {
        // 무시
      }
      attempts++;
    }

    // const legacyResult = await legacyMailer.send(user.email, message);
    // if (!legacyResult.ok) throw new Error('mail failed');
    // return legacyResult;
  }

  // TODO: 나중에 수정
  private async deliver(email: string, message: string): Promise<void> {
    await fetch('https://mail.example.com/send', {
      method: 'POST',
      body: JSON.stringify({ to: email, message }),
    });
  }
}
