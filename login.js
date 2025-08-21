window.addEventListener("load", async () => {
  try {
    await Clerk.load();

    const signInEl  = document.getElementById("sign-in");
    const signUpEl  = document.getElementById("sign-up");
    const mainEl    = document.getElementById("main-content");
    const nameEl    = document.getElementById("studentNameDisplay");
    const userBtnEl = document.getElementById("user-button");

    // ✅ دايمًا الصفحة الرئيسية
    const DEFAULT_HOME = new URL("GELVANO/index.html", window.location.origin).href;
    const afterUrl = DEFAULT_HOME;

    if (Clerk.user) {
      if (signInEl) signInEl.style.display = "none";
      if (signUpEl) signUpEl.style.display = "none";
      if (mainEl)   mainEl.style.display   = "block";

      if (nameEl) {
        nameEl.textContent = `مرحباً بالطالب/ة ${Clerk.user.firstName || "طالب"}`;
        nameEl.style.display = "block";
      }

      if (userBtnEl) {
        Clerk.mountUserButton(userBtnEl, {
          appearance: {
            elements: {
              avatarBox: { width: "40px", height: "40px" }
            }
          }
        });
      }

      // 🔹 لو عايز تضيف زر تسجيل خروج يرجع للـ index.html
      // document.getElementById("logout-btn")?.addEventListener("click", async () => {
      //   await Clerk.signOut({ redirectUrl: DEFAULT_HOME });
      // });

    } else {
      if (mainEl) mainEl.style.display = "none";

      if (signInEl) {
        Clerk.mountSignIn(signInEl, {
          redirectUrl: afterUrl,
          afterSignInUrl: afterUrl
        });
      }

      if (signUpEl) {
        Clerk.mountSignUp(signUpEl, {
          redirectUrl: afterUrl,
          afterSignUpUrl: afterUrl
        });
      }
    }

  } catch (error) {
    console.error("خطأ في Clerk:", error);
  }
});
