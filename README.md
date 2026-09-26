# AI Coloring Book Generator 🎨

تطبيق ويب متكامل يعتمد على الذكاء الاصطناعي (Google Gemini 3.1 Flash) لتوليد كتب تلوين مخصصة للأطفال. يقوم التطبيق باستخدام صورة الطفل كمرجع بصري (Reference Image) لرسم مشاهد كرتونية متناسقة (Line Art) داخل ملف PDF جاهز للطباعة مع نصوص وقصص باللغة العربية.

## ✨ الميزات (Features)
- **توليد ذكي للصور (Pure Generative AI):** الاعتماد على دالة `ai.interactions.create` للحفاظ على دقة ملامح الوجه وتجنب تشوهات الصور (Hallucinations).
- **دعم اللغة العربية (RTL):** تصميم وتنسيق نصوص القصص بشكل سليم من اليمين لليسار.
- **تصدير مباشر إلى PDF:** تجميع الصفحات آلياً في ملف PDF واحد عالي الجودة جاهز للطباعة باستخدام Puppeteer.
- **واجهة مستخدم تفاعلية:** تجربة مستخدم سلسة مزودة بشريط تحميل زمني (Progress Bar) مبنية بواسطة React.

## 🛠️ التقنيات المستخدمة (Tech Stack)
- **الواجهة الأمامية (Frontend):** React.js, Vite
- **الخادم الخلفي (Backend):** Node.js, Express.js
- **الذكاء الاصطناعي (AI):** Google GenAI SDK (`gemini-3.1-flash-image`)
- **معالجة الملفات (PDF):** Puppeteer

## 🚀 طريقة التشغيل المحلي (Local Setup)

### 1. المتطلبات الأساسية
- تثبيت [Node.js](https://nodejs.org/)
- الحصول على مفتاح API من [Google AI Studio](https://aistudio.google.com/)

### 2. إعداد الخادم الخلفي (Backend)
```bash
cd backend
npm install