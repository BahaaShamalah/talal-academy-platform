# طلال أكاديمي — Talal Academy

منصة معهد طلال أكاديمي: واجهة برمجية Laravel، موقع تسويقي/بوابة ولي الأمر (Next.js)، ولوحة إدارة (Next.js).

| المشروع | المجلد | المنفذ المحلي |
|---|---|---|
| Laravel API | جذر المستودع | `8000` |
| الموقع وبوابة ولي الأمر | `nextjs/` | `3000` |
| لوحة الإدارة | `admin/` | `3001` |

## المتطلبات

- PHP 8.3+ مع امتدادات Laravel المعتادة (pgsql, gd, mbstring, xml, …)
- Composer
- Node.js 20+
- PostgreSQL

لا ترفع ملفات `.env` أو مفاتيح حقيقية إلى GitHub.

## الإعداد المحلي

### 1) الباك اند (Laravel)

```bash
composer install
copy .env.example .env   # Windows
php artisan key:generate
```

عدّل `.env`: قاعدة البيانات، ثم:

```bash
php artisan migrate
php artisan storage:link
php artisan serve        # http://localhost:8000
```

متغيرات مهمة (قيم فارغة في `.env.example` — املأها محليًا فقط):

- `APP_KEY`, `APP_DEBUG`, `APP_URL`
- `DB_*`
- `CORS_ALLOWED_ORIGINS` (مثال التطوير: `http://localhost:3000,http://localhost:3001`)
- `MYFATOORAH_API_KEY`, `MYFATOORAH_WEBHOOK_SECRET`, `MYFATOORAH_TEST_MODE`
- `SMS_*` (الحالي يسجّل الرسائل في اللوج حتى يُربط مزوّد)

**قبل النشر على VPS:** `APP_DEBUG=false` و `APP_ENV=production` و `MYFATOORAH_TEST_MODE=false` مع سر الويب هوك.

### 2) الموقع (`nextjs/`)

```bash
cd nextjs
copy .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

`BACKEND_URL` للسيرفر فقط. لا تضع أسرارًا في `NEXT_PUBLIC_*`.

### 3) لوحة الإدارة (`admin/`)

```bash
cd admin
copy .env.example .env.local
npm install
npm run dev              # http://localhost:3001
```

التوكن يُحفظ في كوكي `httpOnly` عبر مسار `/api/auth/login`.

## الاختبارات

```bash
php artisan test
```
