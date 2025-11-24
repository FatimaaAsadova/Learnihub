import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Firebase Konfiqurasiyası
const firebaseConfig = {
  apiKey: "AIzaSyBAIn3a96pvltpQqvobdKKWfRqSOp2x_MA",
  authDomain: "learnihub-d14c4.firebaseapp.com",
  projectId: "learnihub-d14c4",
  storageBucket: "learnihub-d14c4.firebasestorage.app",
  messagingSenderId: "339528131716",
  appId: "1:339528131716:web:8c8c137f108a533e254ed1",
  measurementId: "G-HD76FE1BFY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elementlərini seçirik
const authBtn = document.getElementById("authBtn");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");

// 1. İSTİFADƏÇİ VƏZİYYƏTİNİ İDARƏ ETMƏK (Header Yenilənməsi)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // İstifadəçi DAXİL OLUB: "Daxil ol" gizlədilir, "İstifadəçi Menyu" görünür
    if (authBtn) authBtn.style.display = "none";
    if (userMenu) userMenu.style.display = "block";
    
    checkAuthRequired(); 

  } else {
    // İstifadəçi ÇIXIŞ EDİB: "Daxil ol" görünür, "İstifadəçi Menyu" gizlənir
    if (authBtn) {
      authBtn.style.display = "block";
      authBtn.textContent = "Daxil ol";
      authBtn.href = "login.html";
    }
    if (userMenu) userMenu.style.display = "none";
  }
});

// 2. ÇIXIŞ (LOGOUT) FUNKSİYASI
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
      // Çıxışdan sonra ana səhifəyə yönləndirmə
      window.location.href = "index.html"; 
    }).catch((error) => {
      console.error("Çıxış xətası:", error);
      alert("Çıxış zamanı xəta baş verdi.");
    });
  });
}


// 3. Sorğu səhifəsinə Təhlükəsizlik Yoxlaması
function checkAuthRequired() {
  // survey.html-in body teqində data-require-auth="true" var
  const body = document.body;
  if (body.dataset.requireAuth === "true" && !auth.currentUser) {
    // Əgər login olmayıbsa, login səhifəsinə yönləndir
    alert("Bu səhifəyə daxil olmaq üçün daxil olmalısınız.");
    window.location.href = "login.html";
  }
}