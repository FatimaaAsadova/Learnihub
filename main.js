// --- main.js faylı ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithCustomToken, 
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// !!! DÜZƏLİŞİ BURADA EDİN: Backend Serverinizin Həqiqi URL-i !!!
const API_BASE_URL = 'https://sizin-api-serveriniz.com'; // Məsələn: 'http://localhost:3000'

// Qlobal Dəyişənlər və Konfiqurasiya
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let firebaseConfig = {};
try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
    }
} catch (e) {
    console.error("Firebase config parse xətası:", e);
}

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const fallbackConfig = {
  apiKey: "AIzaSyBAIn3a96pvltpQqvobdKKWfRqSOp2x_MA", 
  authDomain: `${appId}.firebaseapp.com`,
  projectId: appId,
};

const config = Object.keys(firebaseConfig).length > 0 ? firebaseConfig : fallbackConfig;

let app, auth;
let userId = null; 
let isAuthReady = false;
let currentNextPath = 'home'; 


// DOM elementləri
const mainContentArea = document.getElementById('mainContentArea');
const authBtn = document.getElementById('authBtn');
const userMenu = document.getElementById('userMenu');
const logoutBtn = document.getElementById('logoutBtn');
const userMenuBtn = document.getElementById('userMenuBtn');


// --- AUTHENTIKASIYA VƏ UI FUNKSİYALARI ---

function updateAuthUI() {
    if (!isAuthReady) return;

    if (userId) {
        if (authBtn) authBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
    } else {
        if (authBtn) authBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Çıxış zamanı xəta:", error);
        navigate('home', 'Çıxış xətası baş verdi.');
    }
}

// Dropdown menunun açılması üçün məntiq
if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown) dropdown.classList.toggle('hidden');
    });
}

// Menyu kənara klikləyəndə bağlansın
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown && !dropdown.classList.contains('hidden') && userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

if(logoutBtn) {
    logoutBtn.onclick = handleLogout;
}


// --- NAVİQASİYA VƏ MƏZMUN YÜKLƏNMƏSİ ---

async function loadContent(path) {
    if (!isAuthReady) {
        displayAPIContent(path, `Autentifikasiya sistemi hazırlanır...`, 'Gözlənilir');
        return;
    }

    const isProtectedRoute = (path === 'kurs' || path === 'sorğu');
    const user = auth.currentUser;
    
    // QORUMA MƏNTİQİ
    if (isProtectedRoute && !userId) {
        return navigate('login', 'Giriş tələb olunur. Kurs/Sorğu məzmununu görmək üçün email/şifrə ilə daxil olun.', path);
    }

    let token = null;
    if (user) {
        token = await user.getIdToken();
    }
    
    // !!! DÜZƏLİŞ: API sorğu URL-ini düzgün formalaşdır !!!
    const apiUrl = `${API_BASE_URL}/${path}`; 

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '' 
            }
        });

        if (response.status === 401) {
            return navigate('login', 'Sessiyanızın vaxtı bitdi və ya etibarsızdır. Yenidən daxil olun.', path);
        }
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Endpoint tapılmadı. Zəhmət olmasa backend serverinizin işlədiyinə və /${path} marşrutunun düzgün təyin olunduğuna əmin olun.`)
            } else {
                throw new Error(`Server Xətası: ${response.status} ${response.statusText}`);
            }
        }

        const data = await response.json();
        displayAPIContent(path, data.content, user ? user.uid : 'Anonim');

    } catch (error) {
        displayAPIContent(path, `Xəta baş verdi: ${error.message}. Backend serverinin düzgün işlədiyinə əmin olun.`, 'Xəta');
        console.error(`Məzmun yüklənmə xətası (${path}):`, error);
    }
}

function navigate(path, message = null, nextPath = null) {
    if (nextPath) {
         currentNextPath = nextPath; 
    }
    
    if(isAuthReady) {
        window.history.pushState({}, '', `#${path}`);
    }

    if (path === 'home') {
        displayHomeContent();
    } else if (path === 'login') {
        displayLoginRegisterForm(message);
    } else {
        loadContent(path);
    }
    updateAuthUI(); 
}

// Event Delegation (naviqasiya linkləri)
document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-path]');
    
    if (target) {
        e.preventDefault();
        const path = target.getAttribute('data-path');
        navigate(path);
    }
});

// Əlaqə linkinə klikləmə
function handleContactClick() {
    navigate('home'); 
    
    setTimeout(() => {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100); 
}

const contactBtn = document.getElementById('contactBtn');
if (contactBtn) {
    contactBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleContactClick();
    });
}

function displayAPIContent(view, data, currentUserId) {
    let title = '';
    if (view === 'kurs') title = 'Kurs Məzmunu (Qorunan)';
    else if (view === 'sorğu') title = 'Sorğu Səhifəsi (Qorunan)';

    const isLoggedIn = !!userId; 

    if (!mainContentArea) return;
    
    mainContentArea.innerHTML = `
        <section class="p-8 my-8 bg-white rounded-xl shadow-2xl text-center">
            <h2 class="text-3xl font-bold mb-4 text-blue-600">${title}</h2>
            <div class="whitespace-pre-wrap text-gray-700 p-4 bg-gray-50 rounded-lg text-left mx-auto max-w-xl">${data}</div>
            <p class="mt-6 text-sm font-semibold ${isLoggedIn ? 'text-green-600' : 'text-red-600'}">
                Giriş vəziyyəti: ${isLoggedIn ? 'Email/Şifrə ilə tam daxil olmusunuz' : 'Çıxış edilmişsiniz və ya Anonim Girişdəsiniz'}
            </p>
            <p class="text-xs text-gray-500 mt-2">İstifadəçi ID: ${currentUserId}</p>
        </section>
    `;
}

// --- STATİK MƏZMUN FUNKSİYASI (HOME) ---
function displayHomeContent() {
    if (!mainContentArea) return;
    // ... (Məzmun burada yerləşir, dəyişdirilməyib) ...
    mainContentArea.innerHTML = `
        <section class="hero">
            <h2>Öz biliklərini paylaş — yeni kurslar əlavə et</h2>
            <p>Kurslar, proqramlar və təhsil resurslarını paylaşmaq üçün platformamızdan istifadə et.</p>
            <div class="hero-actions">
                <a class="btn" href="#" data-path="kurs">Kurslara bax</a>
            </div>
        </section>

        <section class="services">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Xidmətlərimiz</h2>
            <div class="service-boxes">
                <div class="service-card">
                    <h3>Sorğularınızı yerləşdirin</h3>
                    <p>Kurslar haqqında məlumat əlavə edin və paylaşın.</p>
                </div>
                <div class="service-card">
                    <h3>Proqramlar haqqında məlumat</h3>
                    <p>Tədris sahəsində kurslar barədə ətraflı məlumat tapın.</p>
                </div>
            </div>
        </section>

        <section class="contact-section" id="contact">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Əlaqə</h2>
            <div class="contact-container">
                <div class="contact-info flex-1">
                    <h3 class="text-xl font-semibold mb-3 text-gray-700">Əlaqə məlumatları</h3>
                    <p class="mb-1"><strong>Instagram:</strong> <a href="#" class="text-blue-600 hover:underline">@learnihub</a></p>
                    <p class="mb-1"><strong>Email:</strong> <a href="mailto:info@learnihub.az" class="text-blue-600 hover:underline">info@learnihub.az</a></p>
                    <p class="mb-1"><strong>Ünvan:</strong> Bakı, Azərbaycan</p>
                </div>

                <form class="contact-form" onsubmit="event.preventDefault(); alert('Mesajınız göndərildi!');">
                    <label class="font-medium text-gray-700">Ad</label>
                    <input type="text" required>
                    <label class="font-medium text-gray-700">Email</label>
                    <input type="email" required>
                    <label class="font-medium text-gray-700">Mesaj</label>
                    <textarea rows="4" required></textarea>
                    <button type="submit" class="shadow-lg">Göndər</button>
                </form>
            </div>
        </section>
    `;
}

// --- GİRİŞ VƏ QEYDİYYAT FORMASI (Firebase) ---

function displayLoginRegisterForm(message = null) {
    if (!mainContentArea) return;
    
    // ... (Formanın HTML məzmunu burada yerləşir) ...
    mainContentArea.innerHTML = `
        <section class="p-8 my-8 bg-white rounded-xl shadow-2xl max-w-lg mx-auto border border-gray-200">
            <div id="login-form-container">
                <h2 class="text-3xl font-bold mb-6 text-blue-600 text-center">Daxil Ol</h2>
                <div id="alertMessage">
                     ${message ? `<div class="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg text-sm">${message}</div>` : ''}
                </div>
                <div id="loginMessage" class="mt-3 font-medium text-center mb-4"></div>
                
                ${currentNextPath !== 'home' ? `<p class="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">Girişdən sonra **'${currentNextPath.toUpperCase()}'** səhifəsinə yönləndiriləcəksiniz.</p>` : ''}


                <form id="loginForm" onsubmit="event.preventDefault()">
                    <input type="email" id="loginEmail" name="email" placeholder="Email" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 mb-4">
                    <input type="password" id="loginPassword" name="password" placeholder="Şifrə" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 mb-6">
                    <button type="submit" id="loginSubmit" class="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 shadow-md">Daxil ol</button>
                </form>
                <p class="text-center mt-4">Hesabınız yoxdur? <a href="#" id="show-register" class="text-blue-600 hover:underline font-medium">Qeydiyyat</a></p>
            </div>

            <div id="register-form-container" style="display:none;">
                <h2 class="text-3xl font-bold mb-6 text-green-600 text-center">Qeydiyyat</h2>
                <div id="registerMessage" class="mt-3 font-medium text-center mb-4"></div>
                
                ${currentNextPath !== 'home' ? `<p class="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">Qeydiyyatdan sonra **'${currentNextPath.toUpperCase()}'** səhifəsinə yönləndiriləcəksiniz.</p>` : ''}


                <form id="registerForm" onsubmit="event.preventDefault()">
                    <input type="text" id="regUsername" name="username" placeholder="İstifadəçi adı" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 mb-4">
                    <input type="email" id="regEmail" name="email" placeholder="Email" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 mb-4">
                    <input type="password" id="regPassword" name="password" placeholder="Şifrə (min 6 simvol)" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 mb-6">
                    <button type="submit" id="registerSubmit" class="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150 shadow-md">Qeydiyyatdan keç</button>
                </form>
                <p class="text-center mt-4">Artıq hesabınız var? <a href="#" id="show-login" class="text-green-600 hover:underline font-medium">Login</a></p>
            </div>
        </section>
    `;

    // Form logic, buraya yerləşdirilmiş funksiyaları (closure) çağırır
    const loginFormContainer = document.getElementById("login-form-container");
    const registerFormContainer = document.getElementById("register-form-container");
    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    // Formu dəyişdirmə (Toggle form)
    document.getElementById("show-register")?.addEventListener("click", e => {
        e.preventDefault();
        if (loginFormContainer) loginFormContainer.style.display = "none";
        if (registerFormContainer) registerFormContainer.style.display = "block";
    });
    document.getElementById("show-login")?.addEventListener("click", e => {
        e.preventDefault();
        if (registerFormContainer) registerFormContainer.style.display = "none";
        if (loginFormContainer) loginFormContainer.style.display = "block";
    });

    // QEYDİYYAT İŞLƏMİ
    document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (registerMessage) {
            registerMessage.textContent = 'Qeydiyyat edilir...';
            registerMessage.className = 'mt-3 font-medium text-center mb-4 text-gray-500';
        }

        const email = document.getElementById("regEmail")?.value;
        const password = document.getElementById("regPassword")?.value;
        if (!email || !password) return;
        
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            
            if (registerMessage) {
                registerMessage.textContent = 'Uğurlu qeydiyyat! Yönləndirilirsiniz.';
                registerMessage.className = 'mt-3 font-medium text-center mb-4 text-green-600';
            }
            
            const nextPath = currentNextPath; 
            currentNextPath = 'home'; 
            setTimeout(() => {
                navigate(nextPath); 
            }, 1000);

        } catch (err) {
            let errorMessage = 'Bilinməyən xəta baş verdi.';
            if (err.code === "auth/email-already-in-use") {
                errorMessage = "Bu email artıq istifadə olunur!";
            } else if (err.code === "auth/weak-password") {
                errorMessage = "Şifrə ən az 6 simvol olmalıdır!";
            } else {
                errorMessage = err.message;
            }
            if (registerMessage) {
                registerMessage.textContent = `Qeydiyyat xətası: ${errorMessage}`;
                registerMessage.className = 'mt-3 font-medium text-center mb-4 text-red-600';
            }
        }
    });

    // GİRİŞ İŞLƏMİ
    document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (loginMessage) {
            loginMessage.textContent = 'Daxil olunur...';
            loginMessage.className = 'mt-3 font-medium text-center mb-4 text-gray-500';
        }

        const email = document.getElementById("loginEmail")?.value;
        const password = document.getElementById("loginPassword")?.value;
        if (!email || !password) return;

        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            
            if (loginMessage) {
                loginMessage.textContent = 'Giriş uğurludur! Yönləndirilirsiniz.';
                loginMessage.className = 'mt-3 font-medium text-center mb-4 text-green-600';
            }

            const nextPath = currentNextPath; 
            currentNextPath = 'home'; 
            setTimeout(() => {
                navigate(nextPath); 
            }, 1000);

        } catch (err) {
            let errorMessage = 'Bilinməyən xəta baş verdi.';
            if (err.code === "auth/invalid-email" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
                 errorMessage = "Email və ya şifrə səhvdir.";
            } else {
                 errorMessage = err.message;
            }
            if (loginMessage) {
                loginMessage.textContent = `Giriş xətası: ${errorMessage}`;
                loginMessage.className = 'mt-3 font-medium text-center mb-4 text-red-600';
            }
        }
    });
}

// --- İLK BAŞLANĞIC (Initialization) ---

async function initApp() {
    // 1. Firebase başlatma
    app = initializeApp(config);
    auth = getAuth(app);
    
    // 2. Auth vəziyyətini izləyən listener
    onAuthStateChanged(auth, async (user) => {
        userId = user && !user.isAnonymous ? user.uid : null;
        isAuthReady = true;
        
        updateAuthUI();
        
        // İlk səhifə yükləməsi
        const hash = window.location.hash.substring(1);
        if (hash === 'login') {
            displayLoginRegisterForm();
        } else if (hash) {
            navigate(hash);
        } else {
            navigate('home');
        }
    });

    // 3. Custom Token VƏ Anonim Giriş
    if (initialAuthToken) {
        try {
            await signInWithCustomToken(auth, initialAuthToken);
        } catch (e) {
            console.error("Custom token ilə ilk autentifikasiya xətası:", e);
            await signInAnonymously(auth).catch(err => console.error("Anonim giriş xətası:", err));
        }
    } else if (!auth.currentUser) {
        await signInAnonymously(auth).catch(err => console.error("Anonim giriş xətası:", err));
    }

}

// Səhifə yüklənəndə çağırılır
window.onload = initApp;

// --- main.js faylının sonu ---
