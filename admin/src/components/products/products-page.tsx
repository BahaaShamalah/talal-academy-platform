'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaPicker } from '@/components/media/media-picker';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  ConfirmDialog,
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  formatKwd,
  productImageSrc,
  qs,
  type Paginated,
  type Product,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  stock_quantity: '0',
  is_active: true,
};

export function ProductsPage() {
  const canView = useAuthStore((s) => s.hasPermission('products.view'));
  const canManage = useAuthStore((s) => s.hasPermission('products.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageId, setImageId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient<Paginated<Product>>(`/products${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const products = productsQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity || 0),
        is_active: form.is_active,
        image_media_id: imageId,
      };

      if (editing) {
        return apiClient(`/products/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/products', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المنتج' : 'تم إضافة المنتج');
      closeModal();
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (product: Product) =>
      apiClient(`/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !product.is_active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المنتج');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setImageId(null);
    setImagePreview(null);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setImageId(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      stock_quantity: String(product.stock_quantity),
      is_active: product.is_active,
    });
    setImageId(product.image_media_id ?? null);
    setImagePreview(productImageSrc(product.image_url));
    setModalOpen(true);
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="المنتجات" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</AdminContent>
      </>
    );
  }

  const loading = productsQuery.isLoading;
  const isEmpty = !loading && products.length === 0;

  return (
    <>
      <AdminHeader title="المنتجات" crumb="المتجر ← المنتجات" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">{products.length} منتج</div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة منتج
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={6} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-book-open"
              title="لا توجد منتجات"
              body="أضف مذكرات أو منتجات للبيع."
              primary={canManage ? { label: 'إضافة منتج', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['', 'الاسم', 'السعر', 'المخزون', 'الحالة', ...(canManage ? [''] : [])].map(
                      (c, i) => (
                        <th
                          key={`${c}-${i}`}
                          className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const img = productImageSrc(product.image_url);
                    const lowStock = product.stock_quantity < 5;
                    return (
                      <tr key={product.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="px-4 py-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-cream-line bg-cream-soft">
                            {img ? (
                              <Image
                                src={img}
                                alt=""
                                width={44}
                                height={44}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <Icon name="fa-solid fa-book" className="text-[16px] text-ink-faint" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[13.5px] font-bold text-ink">{product.name}</div>
                          {product.description ? (
                            <div className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-dim">
                              {product.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] font-bold text-navy">
                          {formatKwd(product.price)}
                        </td>
                        <td
                          className={`font-latin whitespace-nowrap px-4 py-3 text-[13.5px] font-bold ${
                            lowStock ? 'text-[#a34b4b]' : 'text-ink'
                          }`}
                        >
                          {product.stock_quantity}
                        </td>
                        <td className="px-4 py-3">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => toggleActiveMutation.mutate(product)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                product.is_active ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'
                              }`}
                              aria-label="تبديل الحالة"
                            >
                              <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                  product.is_active ? 'left-0.5' : 'left-[22px]'
                                }`}
                              />
                            </button>
                          ) : product.is_active ? (
                            <span className="text-[12.5px] font-bold text-[#2e7d4f]">نشط</span>
                          ) : (
                            <span className="text-[12.5px] font-bold text-ink-dim">متوقف</span>
                          )}
                        </td>
                        {canManage ? (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                aria-label="تعديل"
                                onClick={() => openEdit(product)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                              >
                                <Icon name="fa-solid fa-pen" className="text-[11px]" />
                              </button>
                              <button
                                type="button"
                                aria-label="حذف"
                                onClick={() => setDeleteTarget(product)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                              >
                                <Icon name="fa-solid fa-trash" className="text-[11px]" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!saveMutation.isPending) closeModal();
        }}
        title={editing ? 'تعديل منتج' : 'إضافة منتج'}
        eyebrow="PRODUCT"
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending || !form.name.trim() || !form.price}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الوصف</label>
            <textarea
              className={`${formFieldClass} min-h-[80px]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>السعر (د.ك)</label>
              <input
                type="number"
                step="0.001"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div>
              <label className={formLabelClass}>المخزون</label>
              <input
                type="number"
                min={0}
                className={`${formFieldClass} font-latin`}
                value={form.stock_quantity}
                onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
              />
            </div>
          </div>
          <MediaPicker
            label="صورة المنتج (اختياري)"
            valueId={imageId}
            valueUrl={imagePreview}
            onChange={(m) => {
              setImageId(m.id);
              setImagePreview(m.url);
            }}
            onClear={() => {
              setImageId(null);
              setImagePreview(null);
            }}
          />
          <label className="flex items-center gap-2 text-[13.5px] text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            نشط
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف المنتج؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}».`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
