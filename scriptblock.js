document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    alert('🚫 ممنوع الضغط بالزر اليمين في هذا الموقع');
});

// منع اختصارات فتح أدوات المطور (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S, Ctrl+Shift+K)
document.addEventListener('keydown', function(e) {
    // قائمة الاختصارات الممنوعة
    if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.keyCode === 75)) || // Ctrl+Shift+I/J/C/K
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 83)    // Ctrl+S
    ) {
        e.preventDefault();
        e.stopPropagation();
        alert('🚫 الوصول للكود ممنوع');
        return false;
    }
});