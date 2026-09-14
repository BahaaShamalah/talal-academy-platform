# طلال أكاديمي — الموقع وبوابة ولي الأمر

Next.js على المنفذ `3000` (تسويق + بوابة ولي الأمر). لوحة الإدارة تطبيق منفصل في `../admin`.

```bash
copy .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

- `BACKEND_URL`: أصل Laravel لمسارات السيرفر فقط.
- `NEXT_PUBLIC_API_URL`: أصل يظهر في المتصفح — لا تضع فيه مفاتيح.
