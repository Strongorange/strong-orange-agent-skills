export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return '결제 대기';
    case 'PAID':
      return '결제 완료';
    case 'SHIPPED':
      return '배송 중';
    case 'CANCELLED':
      return '취소됨';
  }
}
