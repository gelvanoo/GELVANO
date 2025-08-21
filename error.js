// إذا لم يتم العثور على العنصر الرئيسي في الصفحة (مثلاً body أو عنصر رئيسي آخر)
// يمكنك تخصيص الشرط حسب هيكل صفحاتك
document.addEventListener('DOMContentLoaded', function() {
    // مثال: إذا لم يوجد عنصر رئيسي متوقع
    if (!document.body || document.body.innerHTML.trim() === "") {
        window.location.href = "error.html";
    }
});

// أو يمكنك استخدام هذا الكود لإعادة التوجيه يدوياً عند الحاجة:
// window.location.href = "error.html";

// تحقق من وجود عنصر رئيسي متوقع في كل صفحة
document.addEventListener('DOMContentLoaded', function() {
    // غيّر "#main-content" إلى معرف أو وسم موجود في كل صفحاتك الصحيحة
    if (!document.querySelector('#main-content')) {
        window.location.href = "error.html";
    }
});