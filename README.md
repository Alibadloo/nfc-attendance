# سامانه پایش حضور کارشناسان مبتنی بر NFC

## معماری پروژه

```
nfc-attendance/
├── backend/          # FastAPI + PostgreSQL
│   ├── app/
│   │   ├── api/       # مسیرهای API
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── checkpoints.py
│   │   │   ├── visits.py
│   │   │   └── reports.py
│   │   ├── models.py      # مدل‌های دیتابیس
│   │   ├── schemas.py     # Pydantic schemas
│   │   ├── config.py      # تنظیمات
│   │   ├── database.py    # اتصال دیتابیس
│   │   ├── dependencies.py
│   │   ├── main.py        # نقطه ورود
│   │   └── services/
│   │       └── auth.py    # JWT + bcrypt
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/       # صفحه ورود
│   │   │   ├── layout/     # Sidebar واکنش‌گرا
│   │   │   ├── dashboard/  # داشبورد با چارت
│   │   │   ├── users/      # مدیریت کاربران
│   │   │   ├── checkpoints/# نقاط بازرسی + تگ NFC
│   │   │   ├── visits/     # ثبت بازدید + آفلاین
│   │   │   └── reports/    # گزارش + Excel/PDF
│   │   ├── hooks/
│   │   │   └── useAuth.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

## اجرا با Docker (توصیه شده)

```bash
# Clone یا کپی پروژه
cd nfc-attendance

# اجرای کامل سیستم
docker compose up -d

# مشاهده لاگ‌ها
docker compose logs -f
```

سیستم روی آدرس http://localhost در دسترس خواهد بود.

**کاربر پیش‌فرض:** `admin` / `admin1234`

---

## اجرای محلی (بدون Docker)

### بک‌اند

```bash
cd backend

# ایجاد محیط مجازی
python -m venv venv
source venv/bin/activate  # Linux/Mac
# یا: venv\Scripts\activate  # Windows

pip install -r requirements.txt

# تنظیم دیتابیس
export DATABASE_URL="postgresql://user:pass@localhost:5432/nfc_attendance"

# اجرا
uvicorn app.main:app --reload --port 8000
```

### فرانت‌اند

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

| Method | URL | توضیح |
|--------|-----|-------|
| POST | /api/auth/login | ورود + دریافت JWT |
| GET | /api/auth/me | اطلاعات کاربر فعلی |
| GET | /api/users/ | لیست کاربران (admin) |
| POST | /api/users/ | ایجاد کاربر (admin) |
| GET | /api/checkpoints/ | لیست نقاط بازرسی |
| POST | /api/checkpoints/ | ایجاد نقطه (admin) |
| GET | /api/nfc-tags/validate/{uid} | اعتبارسنجی تگ NFC |
| POST | /api/visits/ | ثبت بازدید جدید |
| POST | /api/visits/sync | همگام‌سازی آفلاین (bulk) |
| GET | /api/visits/ | لیست بازدیدها |
| GET | /api/visits/dashboard | آمار داشبورد (admin) |
| GET | /api/reports/excel | خروجی Excel |
| GET | /api/reports/pdf | خروجی PDF |
| GET | /api/reports/summary | آمار خلاصه |

---

## قابلیت آفلاین

- در حالت آفلاین، بازدیدها در `localStorage` ذخیره می‌شوند
- پس از اتصال مجدد، endpoint `/api/visits/sync` فراخوانی می‌شود
- سیستم جلوگیری از ثبت تکراری با `local_id` (UUID) پیاده‌سازی شده

## اندروید

برای اندروید دو رویکرد وجود دارد:

**رویکرد ۱ - PWA (پیشنهادی):**
پنل وب به صورت PWA روی تبلت نصب می‌شود. NFC از طریق Web NFC API (Chrome 89+) پشتیبانی می‌شود.

**رویکرد ۲ - اپ بومی Android:**
با Kotlin + Retrofit + Room پیاده‌سازی شود که کد Web NFC را دارد.

برای فعال‌سازی Web NFC در Chrome اندروید:
```
chrome://flags/#enable-web-nfc → Enabled
```

---

## امنیت

- احراز هویت JWT با انقضای ۸ ساعته
- هش رمز عبور با bcrypt
- جلوگیری از ثبت تگ NFC ناشناس
- جلوگیری از ثبت تکراری در بازه ۳۰ دقیقه
- ثبت شناسه دستگاه در هر بازدید
- Audit log برای عملیات ورود

---

## متغیرهای محیطی

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-long-random-secret-key
DUPLICATE_SCAN_WINDOW_MINUTES=30
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/app/uploads
```
