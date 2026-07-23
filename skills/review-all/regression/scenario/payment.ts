interface ApprovalResult {
  approvalNo: string;
  approvedAt: string;
}

export async function approvePayment(orderId: string, amount: number): Promise<ApprovalResult> {
  const res = await fetch('https://pg.example.com/v1/approve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId, amount }),
  });

  const body = await res.json();

  return { approvalNo: body.approvalNo, approvedAt: body.approvedAt };
}
