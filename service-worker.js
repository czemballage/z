// إسم التخزين المؤقت
const CACHE_NAME = 'capital-manager-cache-v1';

// قائمة الملفات التي سيتم تخزينها مؤقتًا
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.rtl.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap'
];

// تثبيت مستمع الخدمة وتخزين الموارد المطلوبة
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('فتح التخزين المؤقت');
        return cache.addAll(urlsToCache);
      })
  );
});

// إدارة طلبات الشبكة
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إرجاع الاستجابة المخزنة مؤقتًا إذا وجدت
        if (response) {
          return response;
        }
        
        // إذا لم تكن الاستجابة في التخزين المؤقت، جلبها من الشبكة
        return fetch(event.request)
          .then(response => {
            // تحقق من أن الاستجابة صالحة
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // تخزين نسخة من الاستجابة في التخزين المؤقت
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // إذا فشلت الشبكة وكانت الطلب لصفحة، عرض صفحة التطبيق دون اتصال
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // في حالة أخرى، فشل الطلب
            return new Response('حدث خطأ في الاتصال بالإنترنت.', {
              status: 503,
              statusText: 'خدمة غير متوفرة',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// حذف التخزينات المؤقتة القديمة عند تنشيط مستمع الخدمة الجديد
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // حذف التخزينات المؤقتة القديمة
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 