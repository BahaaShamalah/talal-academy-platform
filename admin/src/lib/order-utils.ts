import type { FulfillmentType, OrderStatus } from '@/lib/api-client';

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: 'pending_payment', label: 'معلّق' },
  { id: 'processing', label: 'قيد التجهيز' },
  { id: 'ready_for_pickup', label: 'جاهز للاستلام' },
  { id: 'out_for_delivery', label: 'بالطريق' },
  { id: 'delivered', label: 'تم التسليم' },
  { id: 'cancelled', label: 'ملغى' },
];

export const FULFILLMENT_TYPES: { id: FulfillmentType; label: string }[] = [
  { id: 'delivery', label: 'توصيل' },
  { id: 'pickup', label: 'استلام' },
];

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function nextOrderStatuses(
  status: OrderStatus,
  fulfillmentType: FulfillmentType,
): { value: OrderStatus; label: string }[] {
  if (status === 'pending_payment') {
    return [{ value: 'cancelled', label: 'ملغى' }];
  }

  if (status === 'processing') {
    const options: { value: OrderStatus; label: string }[] = [
      { value: 'cancelled', label: 'ملغى' },
    ];
    if (fulfillmentType === 'pickup') {
      options.unshift({ value: 'ready_for_pickup', label: 'جاهز للاستلام' });
    }
    if (fulfillmentType === 'delivery') {
      options.unshift({ value: 'out_for_delivery', label: 'بالطريق' });
    }
    return options;
  }

  if (status === 'ready_for_pickup' || status === 'out_for_delivery') {
    return [{ value: 'delivered', label: 'تم التسليم' }];
  }

  return [];
}

export function dateLabel(value?: string | null) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}
