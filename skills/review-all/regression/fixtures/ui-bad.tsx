'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog } from '@acme/ui';
import type { CartItem, User } from './types';

type CartPanelProps = {
  user: User;
  items: CartItem[];
  onSelectionChange: (ids: string[]) => void;
};

export function CartPanel({ user, items, onSelectionChange }: CartPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setTotal(
      items
        .filter((item) => selected.includes(item.id))
        .reduce((sum, item) => sum + item.price * item.quantity, 0),
    );
  }, [items, selected]);

  useEffect(() => {
    onSelectionChange(selected);
  }, [selected, onSelectionChange]);

  const payable = user.plan === 'pro' ? Math.floor(total * 0.8) : total;
  const canCheckout = user.credits >= payable && selected.length <= 10;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <section>
      <ul>
        {items.map((item) => (
          <CartRow key={item.id} item={item} checked={selected.includes(item.id)} onToggle={toggle} />
        ))}
      </ul>
      <p>결제 금액 {payable.toLocaleString()} 크레딧</p>
      <Button disabled={!canCheckout} onClick={() => setConfirmOpen(true)}>
        결제
      </Button>
      <Dialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)}>
        {payable.toLocaleString()} 크레딧을 사용합니다.
      </Dialog>
    </section>
  );
}

type CartRowProps = {
  item: CartItem;
  checked: boolean;
  onToggle: (id: string) => void;
};

function CartRow({ item, checked, onToggle }: CartRowProps) {
  const [isRemoving, setRemoving] = useState(false);

  const remove = async () => {
    setRemoving(true);
    const res = await fetch(`/api/cart/${item.id}`, { method: 'DELETE' });
    if (res.status === 409) {
      alert('결제 중인 상품은 뺄 수 없습니다.');
    } else if (!res.ok) {
      alert('삭제에 실패했습니다.');
    }
    setRemoving(false);
  };

  return (
    <li>
      <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
      {item.name} × {item.quantity}
      <Button disabled={isRemoving} onClick={remove}>
        빼기
      </Button>
    </li>
  );
}
