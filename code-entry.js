async function useCode(codeObj, code) {
  try {
    if (!codeObj) {
      document.getElementById("lessonMsg").textContent = "الكود غير موجود.";
      return;
    }
    if (codeObj.isUsed) {
      document.getElementById("lessonMsg").textContent = "❌ الكود مستخدم من حساب آخر.";
      return;
    }
    // سجل الكود كـ مستخدم لهذا الإيميل (لو عندك إيميل للطالب أضفه هنا)
    await fetch(`https://68a3fbe0c123272fb9b0ee15.mockapi.io/gelvano/${codeObj.id}`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({isUsed: true})
    });
    // احفظ الكود في localStorage
    localStorage.setItem("lessonCode", code);
    // احفظ اسم الحصة (الحرف الأول)
    localStorage.setItem("lessonKey", code.charAt(0));
    window.location.href = "videos.html";
  } catch(e) {
    document.getElementById("lessonMsg").textContent = "حدث خطأ أثناء التحقق.";
  }
}

function getCurrentUserEmail(){
  if (window.Clerk && Clerk.user) {
    if (Clerk.user.emailAddresses && Clerk.user.emailAddresses.length > 0) {
      return Clerk.user.emailAddresses[0].emailAddress;
    }
  }
  return "غير معروف";
}

function getCurrentUserId(){
  if (window.Clerk && Clerk.user && Clerk.user.id) {
    return Clerk.user.id;
  }
  return "غير معروف";
}

// جلب اسم المستخدم من Clerk
function getCurrentUsername(){
  if (window.Clerk && Clerk.user && Clerk.user.id) {
    return Clerk.user.firstName || "غير معروف";
  }
  return "غير معروف";
}

async function safeFetch(url, opt){
  try {
    const r = await fetch(url, opt);
    if(!r.ok) throw new Error("HTTP "+r.status);
    return await r.json();
  } catch(e) {
    throw new Error("فشل الاتصال بالخادم");
  }
}

// إرسال إشعار مخصص مع معالجة الخطأ
  // الآن الدالة تقبل أي خصائص إضافية وتضعها في الـ payload
  async function sendCustomNotif(payload) {
    try {
      const body = Object.assign({}, payload, { createdAt: new Date().toISOString() });
      await safeFetch(NOTIF_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
      });
    } catch(e) {
      msg.className="msg error";
      msg.textContent="⚠️ مشكلة اتصال بالخادم أثناء إرسال الإشعار.";
    }
  }

// تشفير وفك تشفير بسيط للكود في localStorage
function encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function decode(str) {
  try { return decodeURIComponent(escape(atob(str))); } catch(e){ return ""; }
}

// تحقق من صحة الكود قبل الإرسال
function isValidCode(code) {
  return /^[A-Z0-9]{4,10}$/.test(code);
}

// منع الهجمات المتكررة (rate limit على العميل)
let lastSubmitTime = 0;
function canSubmit() {
  const now = Date.now();
  if (now - lastSubmitTime < 1500) return false;
  lastSubmitTime = now;
  return true;
}

// تعريف المتغيرات الأساسية إذا لم تكن معرفة
const API_URL = typeof API_URL !== "undefined" ? API_URL : "https://68a3fbe0c123272fb9b0ee15.mockapi.io/gelvano";
const MAX_ATTEMPTS = typeof MAX_ATTEMPTS !== "undefined" ? MAX_ATTEMPTS : 5;
const BAN_TIME = typeof BAN_TIME !== "undefined" ? BAN_TIME : 5 * 60 * 1000; // 5 دقائق
const NOTIF_URL = typeof NOTIF_URL !== "undefined" ? NOTIF_URL : "https://68a3fbe0c123272fb9b0ee15.mockapi.io/notif";
let attempts = Number(localStorage.getItem('codeAttempts') || 0);
let banUntil = Number(localStorage.getItem('codeBanUntil') || 0);
let countdownInterval = null;

// عناصر الصفحة
const msg = document.getElementById("lessonMsg");
const input = document.getElementById("lessonCodeInput") || null;
const btn = document.querySelector("#codeForm button") || null;
const banBox = document.getElementById("banBox") || {style:{display:"none"}};
const timerEl = document.getElementById("banTimer") || {textContent:""};
const barEl = document.getElementById("banBar") || {style:{width:"0%"}};

// دعم مربعات إدخال الكود (code boxes)
const codeBoxes = document.querySelectorAll('.codeBox');
function getInputCode() {
  if (codeBoxes.length > 0) {
    return Array.from(codeBoxes).map(b => b.value).join('').trim().toUpperCase();
  }
  if (input) return (input.value || "").trim().toUpperCase();
  return "";
}

// منطق التنقل بين مربعات الكود
if (codeBoxes.length > 0) {
  codeBoxes.forEach((box, idx) => {
    box.addEventListener('input', function(e) {
      this.value = this.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (this.value && idx < codeBoxes.length - 1) codeBoxes[idx + 1].focus();
    });
    box.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value && idx > 0) codeBoxes[idx - 1].focus();
    });
  });
}

async function verifyCode(){
  if(!canSubmit()) {
    msg.className="msg error";
    msg.textContent="⚠️ برجاء الانتظار قبل المحاولة مرة أخرى.";
    return;
  }

  if(getCurrentUserEmail() === "غير معروف" || getCurrentUserId() === "غير معروف"){
    msg.className="msg error";
    msg.textContent="⚠️ يجب تسجيل الدخول أولاً.";
    return;
  }

  const now=Date.now();
  if(now<banUntil){ setBannedState(true); startCountdown(banUntil); return; }

  let inputCode=(input.value||"").trim().toUpperCase();
  if(!isValidCode(inputCode)){
    msg.className="msg error"; msg.textContent="❌ الكود غير صالح. استخدم حروف وأرقام فقط (4-10)."; return;
  }

  try{
    const codes = await safeFetch(API_URL);
    const codeObj = codes.find(c=> c.code===inputCode);
    const userEmail = getCurrentUserEmail();
    const username = getCurrentUsername();
    const userId = getCurrentUserId();

    if(!codeObj){
      await sendCustomNotif({
        code: inputCode,
        username,
        userEmail,
        message: `حاول هذا الشخص إدخال كود غير صالح`,
        highlight: false
      });
      return wrongAttempt();
    }

    if(!codeObj.isUsed){
      await safeFetch(`${API_URL}/${codeObj.id}`,{
        method:"PUT", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...codeObj, isUsed:true, userEmail, username, userId})
      });
      localStorage.setItem("studentCode", encode(codeObj.code));
      localStorage.setItem("studentEmail", encode(userEmail));
      localStorage.setItem("studentUserId", encode(userId));
      await sendCustomNotif({
        code: codeObj.code,
        username,
        userEmail,
        message: `تم تسجيل هذا الكود بنجاح`,
        highlight: true
      });
      msg.className="msg success"; msg.textContent="✅ تم التسجيل بنجاح";
      setTimeout(()=> location.href="index.html", 800);
      return;
    }

    if(codeObj.userEmail===userEmail){
      localStorage.setItem("studentCode", encode(codeObj.code));
      localStorage.setItem("studentEmail", encode(userEmail));
      localStorage.setItem("studentUserId", encode(userId));
      msg.className="msg success"; msg.textContent="✅ دخول";
      setTimeout(()=> location.href="index.html", 400);
    }else{
      // أرسل إشعار يتضمن بيانات المحاول من Clerk فقط
      await sendCustomNotif({
        code: codeObj.code,
        // بيانات صاحب الكود (المالك الأول)
        ownerUsername: codeObj.username || "غير معروف",
        ownerEmail: codeObj.userEmail || "غير معروف",
        ownerCreatedAt: codeObj.createdAt || null,
        // بيانات المحاول من Clerk مباشرة
        attemptUsername: getCurrentUsername() || "غير معروف",
        attemptEmail: getCurrentUserEmail() || "غير معروف",
        attemptUserId: getCurrentUserId() || null,
        message: `حاول هذا الشخص الدخول بكود مستخدم بالفعل`,
        highlight: false
      });
      msg.className="msg error"; msg.textContent="⚠️ هذا الكود مستخدم من حساب آخر. تواصل مع الإدارة.";
    }
  }catch(e){
    msg.className="msg error";
    msg.textContent="⚠️ السيرفر غير متاح حالياً. حاول لاحقاً.";
  }
}

async function wrongAttempt(){
  attempts++; localStorage.setItem('codeAttempts', String(attempts));
  const remain = MAX_ATTEMPTS - attempts;
  if(attempts>=MAX_ATTEMPTS){
    banUntil = Date.now()+BAN_TIME; localStorage.setItem('codeBanUntil', String(banUntil));
    setBannedState(true); startCountdown(banUntil);
    msg.className="msg error"; msg.textContent="";
  }else{
    msg.className="msg error"; msg.textContent=`❌ الكود غير صحيح. تبقى ${remain} محاولات.`;
  }
}

function setBannedState(b){ input.disabled=b; btn.disabled=b; banBox.style.display=b?"block":"none"; }

function startCountdown(untilTs){
  stopCountdown(); tick(); countdownInterval=setInterval(tick,1000);
  function tick(){
    const now=Date.now(); const remaining=Math.max(0, untilTs-now);
    const m=Math.floor(remaining/60000), s=Math.floor((remaining%60000)/1000);
    timerEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const percent=Math.min(100, Math.max(0,(remaining/BAN_TIME)*100)); barEl.style.width=`${percent}%`;
    if(remaining<=0){ clearBan(); setBannedState(false); msg.className="msg"; msg.textContent="يمكنك المحاولة الآن."; stopCountdown(); }
  }
}
function stopCountdown(){ if(countdownInterval){ clearInterval(countdownInterval); countdownInterval=null; } }
function clearBan(){ localStorage.removeItem('codeBanUntil'); banUntil=0; attempts=0; localStorage.setItem('codeAttempts','0'); }

// عند بدء الصفحة فك تشفير القيم من localStorage إذا وجدت
(function decodeLocalStorage(){
  if(localStorage.getItem("studentCode"))
    localStorage.setItem("studentCode", decode(localStorage.getItem("studentCode")));
  if(localStorage.getItem("studentEmail"))
    localStorage.setItem("studentEmail", decode(localStorage.getItem("studentEmail")));
})();

// تحقق تلقائي عند تحميل الصفحة: إذا الكود صحيح والحساب نفسه، حول المستخدم مباشرة
function clerkReady(callback) {
  let tries = 0;
  function check() {
    if (window.Clerk && window.Clerk.user && window.Clerk.user.id) {
      callback();
    } else if (tries < 80) { // انتظر حتى 8 ثواني كحد أقصى
      tries++;
      setTimeout(check, 100);
    }
  }
  check();
}

async function autoRedirectOrShowMsg() {
  clerkReady(async function() {
    let savedCode = localStorage.getItem("studentCode");
    let savedEmail = localStorage.getItem("studentEmail");
    if(savedCode) savedCode = decode(savedCode);
    if(savedEmail) savedEmail = decode(savedEmail);
    const currentEmail = getCurrentUserEmail();

    // تحقق من وجود كود وإيميل وحساب
    if(savedCode && savedEmail && currentEmail && savedEmail === currentEmail){
      try {
        const codes = await safeFetch(API_URL);
        const codeObj = codes.find(c=> c.code===savedCode);
        if(codeObj && codeObj.isUsed && codeObj.userEmail === currentEmail){
          const expired = (new Date(codeObj.createdAt).getTime() + (30*24*60*60*1000)) < Date.now();
          if(!expired){
            // دخول تلقائي بدون طلب الكود
            location.href = "index.html";
            return;
          } else {
            // الكود منتهي الصلاحية → امسح من التخزين
            localStorage.removeItem("studentCode");
            localStorage.removeItem("studentEmail");
          }
        } else {
          // الكود غير مستخدم أو الحساب مختلف → امسح من التخزين
          localStorage.removeItem("studentCode");
          localStorage.removeItem("studentEmail");
        }
      } catch(e){
        // تجاهل الخطأ، سيظهر نموذج الكود كالعادة
      }
    }
    // إذا لم يوجد كود أو الحساب مختلف أو الكود منتهي، يظهر نموذج الكود كالعادة
  });
}

// نفذ التحقق عند تحميل الصفحة (بعد جاهزية Clerk)
autoRedirectOrShowMsg();