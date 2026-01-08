# MCQ Mobile Quiz (GitHub Pages)

موقع اختبار MCQ بسيط ومناسب للموبايل.

## الملفات
- index.html
- style.css
- script.js
- questions.json (ضع ملف الأسئلة بجانبها)

## التشغيل محليًا
افتح `index.html` (يفضل عبر خادم محلي بسيط لأن بعض المتصفحات تمنع fetch من file://).

### خادم محلي سريع
- Python:
  - `python -m http.server 8000`
  - ثم افتح: `http://localhost:8000`

## النشر على GitHub Pages
1) أنشئ Repository جديد
2) ارفع الملفات الأربعة إلى الجذر (root)
3) من Settings → Pages اختر Branch: main / root
4) افتح رابط GitHub Pages

## ملاحظة
- تأكد أن `questions.json` بنفس الاسم وبجانب `index.html`.
