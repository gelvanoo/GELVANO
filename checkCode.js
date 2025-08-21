/* checkCode.js — حماية الصفحات بالكود */

const API_URL     = "https://68a25cb6c5a31eb7bb1ccafd.mockapi.io/codes";
const THIRTY_DAYS = 30*24*60*60*1000;

// غيّر المسار حسب مكان صفحة إدخال الكود:
// - لو code-entry.html في نفس الفولدر: خليها "code-entry.html"
// - لو في الروت: خليها "/code-entry.html"
const ENTRY_URL   = "code-entry.html";

/* =========== أدوات مساعدة =========== */
async function guardFetch(url, opt){
  const r = await fetch(url, opt);
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}

function pageFile(){
  let p = location.pathname.split("/").pop() || "";
  return p.toLowerCase();
}

function isEntryPage(){
  const wanted = ENTRY_URL.toLowerCase();
  // لو ENTRY_URL أبسولوت يبدأ بـ /
  if (wanted.startsWith("/")) {
    return (location.pathname.toLowerCase() === wanted);
  }
  // مقارنة بالاسم فقط
  return pageFile() === wanted;
}

function redirectToEntry(){
  // استخدم replace عشان يمنع الرجوع بزر Back
  location.replace(ENTRY_URL);
  return false;
}

// Clerk جاهز؟ انتظر حتى يكون جاهز قبل التحقق
function clerkReady(callback) {
  let tries = 0;
  function check() {
    if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
      callback();
    } else if (tries < 80) {
      tries++;
      setTimeout(check, 100);
    }
  }
  check();
}

function decode(str) {
  try { return decodeURIComponent(escape(atob(str))); } catch(e){ return ""; }
}

function getCurrentUserEmail() {
  // Clerk جاهز؟
  if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
    // استخدم الـ id كـ userId و الـ email كـ userEmail
    if (window.Clerk.user.primaryEmailAddress && window.Clerk.user.primaryEmailAddress.emailAddress) {
      return window.Clerk.user.primaryEmailAddress.emailAddress;
    } else if (window.Clerk.user.emailAddresses && window.Clerk.user.emailAddresses.length > 0) {
      return window.Clerk.user.emailAddresses[0].emailAddress;
    }
  }
  return null;
}

function getCurrentUserId() {
  if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
    return window.Clerk.user.id;
  }
  return null;
}

// =========== مميزات إضافية ===========

// 1. إشعار المستخدم إذا تم حذف الكود أثناء تصفحه (بدل التحويل الصامت)
// احذف الـ alert واجعل التحويل دايركت فقط
function notifyAndRedirect(msg) {
  redirectToEntry();
  return false;
}

// 2. حفظ آخر وقت تحقق ناجح في localStorage (للمتابعة أو التحليل)
function setLastCheckOk() {
  localStorage.setItem("lastCodeCheck", Date.now().toString());
}

// 3. منع فتح أكثر من تبويب بنفس الكود (حماية من مشاركة الكود)
function isAnotherTabActive() {
  // استخدم localStorage event
  const key = "studentCodeTabActive";
  try {
    localStorage.setItem(key, Date.now().toString());
    window.addEventListener("storage", function(e){
      if(e.key === key && !isEntryPage()) {
        alert("تم فتح الكود في نافذة أخرى. سيتم تسجيل الخروج هنا.");
        localStorage.removeItem("studentCode");
        localStorage.removeItem("studentEmail");
        localStorage.removeItem("studentUserId");
        redirectToEntry();
      }
    });
  } catch(e){}
}

// 4. عرض اسم المستخدم والإيميل في الكونسول (للمطور أو الدعم)
function logUserInfo(){
  let code = localStorage.getItem("studentCode");
  let email = localStorage.getItem("studentEmail");
  let userId = localStorage.getItem("studentUserId");
  if(code || email || userId){
    console.log("معلومات المستخدم الحالي:", {
      code: code ? decode(code) : "",
      email: email ? decode(email) : "",
      userId: userId ? decode(userId) : ""
    });
  }
}

async function checkAccess(){
  clerkReady(async function() {
    let savedCode = localStorage.getItem("studentCode");
    let savedEmail = localStorage.getItem("studentEmail");
    let savedUserId = localStorage.getItem("studentUserId");
    if(savedCode) savedCode = decode(savedCode);
    if(savedEmail) savedEmail = decode(savedEmail);
    if(savedUserId) savedUserId = decode(savedUserId);
    const currentEmail = getCurrentUserEmail();
    const currentUserId = getCurrentUserId();

    // ميزة: سجل معلومات المستخدم في الكونسول
    logUserInfo();

    // ميزة: منع فتح أكثر من تبويب بنفس الكود
    isAnotherTabActive();

    // لو مفيش كود أو مفيش حساب مسجل الدخول → رجّع لصفحة إدخال الكود
    if(!savedCode || !currentEmail || !currentUserId){
      localStorage.removeItem("studentCode");
      localStorage.removeItem("studentEmail");
      localStorage.removeItem("studentUserId");
      return redirectToEntry();
    }

    try {
      // هات الأكواد من الـ API
      const codes = await guardFetch(API_URL);
      // ابحث عن الكود فقط (لا تهتم بأي شرط آخر)
      const codeObj = Array.isArray(codes) ? codes.find(c => c.code === savedCode) : null;

      // الكود اتحذف من الأدمن أو غير موجود
      if(!codeObj){
        localStorage.removeItem("studentCode");
        localStorage.removeItem("studentEmail");
        localStorage.removeItem("studentUserId");
        redirectToEntry();
        return false;
      }

      // ميزة: حفظ آخر وقت تحقق ناجح
      setLastCheckOk();

      // الكود موجود: لا تطلب منه الكود مرة أخرى حتى لو تغير الإيميل أو انتهت الصلاحية
      // (لو أردت التحقق من الصلاحية أو الإيميل أضف شرطك هنا)

      // تمام
      return true;
    } catch(e){
      console.error("checkAccess error", e);
      localStorage.removeItem("studentCode");
      localStorage.removeItem("studentEmail");
      localStorage.removeItem("studentUserId");
      return redirectToEntry();
    }
  });
}

/* =========== تشغيل تلقائي على كل الصفحات المحمية =========== */
/* هيشتغل أوتوماتيك بمجرد تضمين الملف في الصفحة (ماعدا صفحة إدخال الكود) */
(function autoProtect(){
  // لو دي صفحة إدخال الكود، متعملش حاجة
  if (isEntryPage()) return;

  // شغّل التحقق بدري
  // مفيش داعي نستنّى DOMContentLoaded — الكود بسيط وهينفّذ بسرعة
  checkAccess();
})();


/* =========== تشغيل تلقائي على كل الصفحات المحمية =========== */
/* هيشتغل أوتوماتيك بمجرد تضمين الملف في الصفحة (ماعدا صفحة إدخال الكود) */
(function autoProtect(){
  // لو دي صفحة إدخال الكود، متعملش حاجة
  if (isEntryPage()) return;

  // شغّل التحقق بدري
  // مفيش داعي نستنّى DOMContentLoaded — الكود بسيط وهينفّذ بسرعة
  checkAccess();
})();
