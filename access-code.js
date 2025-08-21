// يجب تحديد LESSON_KEY في كل صفحة قبل استدعاء هذا السكريبت
const API_URL = "https://68a25cb6c5a31eb7bb1ccafd.mockapi.io/codes";
const NOTIF_URL = "https://68a25cb6c5a31eb7bb1ccafd.mockapi.io/notifications";
const LESSON_KEY = window.LESSON_KEY || "A"; // يجب تعريفه في الصفحة
const PAGE_NAME = document.title || location.pathname.split("/").pop();

function decode(str) {
    try { return decodeURIComponent(escape(atob(str))); } catch(e){ return ""; }
}
function encode(str) {
    try { return btoa(unescape(encodeURIComponent(str))); } catch(e){ return ""; }
}
function getUserEmail() {
    return localStorage.getItem("studentEmail") || "";
}
function saveLessonAccess(code, email) {
    localStorage.setItem("lessonCode_" + LESSON_KEY, encode(code));
    localStorage.setItem("lessonEmail_" + LESSON_KEY, encode(email));
}
function hasLessonAccess(email) {
    const code = localStorage.getItem("lessonCode_" + LESSON_KEY);
    const savedEmail = localStorage.getItem("lessonEmail_" + LESSON_KEY);
    return code && savedEmail && decode(savedEmail) === email;
}
function showCodeForm(msg = "") {
    document.body.innerHTML = `
    <div style="max-width:340px;margin:100px auto;padding:30px;background:#fff;border-radius:10px;box-shadow:0 2px 12px #0001;text-align:center;">
        <h2>دخول الحصة (${PAGE_NAME})</h2>
        <input id="lessonCodeInput" type="text" placeholder="ادخل كود الحصة" style="margin-bottom:10px;width:90%;padding:10px;border-radius:7px;border:1px solid #ccc;"><br>
        <button onclick="submitLessonCode()" style="background:#ff4d4d;color:#fff;padding:10px 30px;border:none;border-radius:7px;font-size:1.1rem;cursor:pointer;">دخول</button>
        <div id="lessonMsg" style="color:#e74c3c;margin-top:10px;">${msg}</div>
        <button onclick="window.location.href='index.html'" style="margin-top:18px;background:#3498db;color:#fff;padding:8px 18px;border:none;border-radius:7px;cursor:pointer;">الرجوع لاختيار الحصة</button>
    </div>
    `;
}
async function notifyAdmin(code, email, usedEmail) {
    try {
        await fetch(NOTIF_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                message: `محاولة استخدام كود مستخدم بالفعل (${code}) من حساب آخر (${email})، الكود مسجل لـ: ${usedEmail}`,
                code,
                userEmail: email,
                attemptEmail: email,
                usedEmail: usedEmail,
                page: PAGE_NAME,
                createdAt: new Date().toISOString()
            })
        });
    } catch(e){}
}
async function submitLessonCode() {
    const input = document.getElementById("lessonCodeInput");
    const code = (input.value || "").trim().toUpperCase();
    const email = getUserEmail();
    if (!code || !email) {
        document.getElementById("lessonMsg").textContent = "يرجى إدخال الكود والبريد.";
        return;
    }
    if (!code.startsWith(LESSON_KEY)) {
        document.getElementById("lessonMsg").textContent = "كود الحصة غير صحيح لهذه الحصة.";
        return;
    }
    try {
        const res = await fetch(API_URL);
        const codes = await res.json();
        const codeObj = Array.isArray(codes) ? codes.find(c => c.code === code) : null;
        if (!codeObj) {
            document.getElementById("lessonMsg").textContent = "الكود غير موجود.";
            return;
        }
        if (codeObj.isUsed && codeObj.username !== email) {
            document.getElementById("lessonMsg").textContent = "❌ الكود مستخدم من حساب آخر. تواصل مع الإدارة.";
            await notifyAdmin(code, email, codeObj.username);
            return;
        }
        if (!codeObj.isUsed) {
            await fetch(`${API_URL}/${codeObj.id}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({isUsed: true, username: email})
            });
        }
        saveLessonAccess(code, email);
        location.reload();
    } catch(e) {
        document.getElementById("lessonMsg").textContent = "حدث خطأ أثناء التحقق.";
    }
}
function copyLessonCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        alert("تم نسخ الكود!");
    });
}
function showLessonInfo(codeObj) {
    const infoDiv = document.createElement("div");
    infoDiv.style = "background:#f9fafb;padding:12px 18px;border-radius:10px;box-shadow:0 2px 8px #0001;max-width:420px;margin:30px auto 0 auto;text-align:center;";
    infoDiv.innerHTML = `
        <div style="font-size:1.1rem;margin-bottom:6px;">كود الحصة: <b style="font-family:monospace">${codeObj.code}</b>
            <button onclick="copyLessonCode('${codeObj.code}')" style="margin-right:8px;background:#e5e7eb;color:#111;padding:4px 12px;border-radius:7px;border:none;cursor:pointer;">نسخ</button>
        </div>
        <div style="margin-bottom:6px;">الحالة: ${codeObj.isUsed ? '<span style="color:#16a34a;font-weight:bold">مستخدم</span>' : '<span style="color:#dc2626;font-weight:bold">غير مستخدم</span>'}</div>
        <div style="margin-bottom:6px;">الإيميل المسجل: <span style="color:#2563eb">${codeObj.username || "غير معروف"}</span></div>
        <button onclick="window.location.href='index.html'" style="margin-top:10px;background:#3498db;color:#fff;padding:8px 18px;border:none;border-radius:7px;cursor:pointer;">الرجوع لاختيار الحصة</button>
    `;
    document.body.prepend(infoDiv);
}
window.addEventListener("DOMContentLoaded", async function() {
    const email = getUserEmail();
    if (!email) {
        showCodeForm("يرجى تسجيل الدخول أولاً.");
        return;
    }
    if (hasLessonAccess(email)) {
        const code = decode(localStorage.getItem("lessonCode_" + LESSON_KEY));
        try {
            const res = await fetch(API_URL);
            const codes = await res.json();
            const codeObj = Array.isArray(codes) ? codes.find(c => c.code === code) : null;
            if (codeObj) {
                showLessonInfo(codeObj);
            }
        } catch(e){}
        return;
    }
    showCodeForm();
});


// عند تحميل الصفحة: تحقق من الدخول أو أظهر نموذج الكود
window.addEventListener("DOMContentLoaded", async function() {
    const email = getUserEmail();
    if (!email) {
        showCodeForm("يرجى تسجيل الدخول أولاً.");
        return;
    }
    // تحقق إذا كان المستخدم دخل الحصة من قبل
    if (hasLessonAccess(email)) {
        // جلب الكود من التخزين
        const code = decode(localStorage.getItem("lessonCode_" + LESSON_KEY));
        // جلب بيانات الكود من الـ API
        try {
            const res = await fetch(API_URL);
            const codes = await res.json();
            const codeObj = Array.isArray(codes) ? codes.find(c => c.code === code) : null;
            if (codeObj) {
                showLessonInfo(codeObj);
            }
        } catch(e){}
        // لا تظهر نموذج الكود مرة أخرى
        return;
    }
    // لم يدخل الكود بعد
    showCodeForm();
});
