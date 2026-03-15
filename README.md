# Naji Play Engine

نظام استخراج روابط البث الاحترافي لتطبيق Naji Play

## التثبيت والتشغيل

### 1. تثبيت الاعتماديات
```bash
npm install
```

### 2. بناء المشروع
```bash
npm run build
```

### 3. تشغيل الخادم
```bash
npm start
```

سيبدأ الخادم على المنفذ 3001

## نقاط النهاية (API Endpoints)

### استخراج رابط الفيلم
```http
POST /api/stream
Content-Type: application/json

{
  "tmdbId": "12345",
  "type": "movie"
}
```

### استخراج رابط المسلسل
```http
POST /api/stream
Content-Type: application/json

{
  "tmdbId": "12345",
  "type": "tv",
  "season": 1,
  "episode": 1
}
```

### فحص صحة الخادم
```http
GET /health
```

## النشر على Render.com

### متغيرات البيئة
```
NODE_ENV=production
PORT=10000
```

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm start
```
