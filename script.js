/**
 * Documents protégés : hash SHA-256 (hex, minuscules) de l’identifiant et du mot de passe.
 * Ne mettez jamais le mot de passe en clair ici. Pour régénérer les hashs (PowerShell) :
 * $u=[Text.Encoding]::UTF8; $s=[Security.Cryptography.SHA256]::Create()
 * -join($s.ComputeHash($u.GetBytes('votre_identifiant'))|%{$_.ToString('x2')})
 * -join($s.ComputeHash($u.GetBytes('votre_mot_de_passe'))|%{$_.ToString('x2')})
 */
const PROTECTED_DOWNLOAD_USER_HASH = '550b0c53a53e2666bc9960e58c29d653f381764f06de94c020d6e1255659460b';
const PROTECTED_DOWNLOAD_PASSWORD_HASH = 'b6e3fed45400281fd27c3d2cbb5ac151186877456985ed523159b59bd461dea9';

const DOC_GATE_SESSION_KEY = 'inesPortfolioDocGateUntil';
const DOC_GATE_TTL_MS = 1000 * 60 * 60 * 8;

function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(plain) {
    const data = new TextEncoder().encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(hash);
}

function isDocGateSessionValid() {
    const raw = sessionStorage.getItem(DOC_GATE_SESSION_KEY);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    return Number.isFinite(until) && until > Date.now();
}

function setDocGateSession() {
    sessionStorage.setItem(DOC_GATE_SESSION_KEY, String(Date.now() + DOC_GATE_TTL_MS));
}

function triggerFileDownload(href) {
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('download', '');
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

let pendingProtectedFile = null;
let pendingProtectedLabel = '';

function openDownloadGateModal() {
    const modal = document.getElementById('downloadGateModal');
    const err = document.getElementById('downloadGateError');
    const userInput = document.getElementById('downloadGateUser');
    const passInput = document.getElementById('downloadGatePassword');
    const desc = document.getElementById('downloadGateDescription');
    if (!modal || !userInput || !passInput) return;
    err.hidden = true;
    userInput.value = '';
    passInput.value = '';
    if (pendingProtectedLabel) {
        desc.textContent = `Document : ${pendingProtectedLabel}. Saisissez l’identifiant et le mot de passe pour télécharger.`;
    }
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    userInput.focus();
}

function closeDownloadGateModal() {
    const modal = document.getElementById('downloadGateModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    pendingProtectedFile = null;
    pendingProtectedLabel = '';
}

async function tryProtectedDownload(href, label) {
    if (!PROTECTED_DOWNLOAD_USER_HASH || PROTECTED_DOWNLOAD_USER_HASH.length !== 64
        || !PROTECTED_DOWNLOAD_PASSWORD_HASH || PROTECTED_DOWNLOAD_PASSWORD_HASH.length !== 64) {
        console.warn('Portfolio : configurez PROTECTED_DOWNLOAD_USER_HASH et PROTECTED_DOWNLOAD_PASSWORD_HASH dans script.js');
        triggerFileDownload(href);
        return;
    }
    if (isDocGateSessionValid()) {
        triggerFileDownload(href);
        return;
    }
    pendingProtectedFile = href;
    pendingProtectedLabel = label || '';
    openDownloadGateModal();
}

async function confirmDownloadGate() {
    const userInput = document.getElementById('downloadGateUser');
    const passInput = document.getElementById('downloadGatePassword');
    const err = document.getElementById('downloadGateError');
    const id = userInput?.value?.trim() || '';
    const pwd = passInput?.value || '';
    if (!pendingProtectedFile) {
        closeDownloadGateModal();
        return;
    }
    const hashUser = await sha256Hex(id);
    const hashPass = await sha256Hex(pwd);
    if (hashUser.toLowerCase() !== PROTECTED_DOWNLOAD_USER_HASH.toLowerCase()
        || hashPass.toLowerCase() !== PROTECTED_DOWNLOAD_PASSWORD_HASH.toLowerCase()) {
        err.hidden = false;
        return;
    }
    setDocGateSession();
    const href = pendingProtectedFile;
    closeDownloadGateModal();
    triggerFileDownload(href);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.protected-download').forEach((el) => {
        el.addEventListener('click', () => {
            const href = el.getAttribute('data-protected-file');
            const label = el.getAttribute('data-protected-label') || '';
            if (href) tryProtectedDownload(href, label);
        });
    });

    const modal = document.getElementById('downloadGateModal');
    document.getElementById('downloadGateSubmit')?.addEventListener('click', () => confirmDownloadGate());
    document.getElementById('downloadGateCancel')?.addEventListener('click', () => closeDownloadGateModal());
    document.querySelectorAll('[data-gate-close]').forEach((b) => b.addEventListener('click', () => closeDownloadGateModal()));
    ['downloadGateUser', 'downloadGatePassword'].forEach((id) => {
        document.getElementById(id)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmDownloadGate();
            }
        });
    });
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('downloadGateModal');
        if (e.key === 'Escape' && modal && !modal.hidden) closeDownloadGateModal();
    });

    const contactForm = document.getElementById('contactForm');
    if (contactForm && window.location.protocol !== 'file:') {
        contactForm.addEventListener('submit', function () {
            let next = contactForm.querySelector('input[name="_next"]');
            if (!next) {
                next = document.createElement('input');
                next.type = 'hidden';
                next.name = '_next';
                contactForm.appendChild(next);
            }
            const base = `${window.location.origin}${window.location.pathname}`;
            next.value = `${base}#contact`;
        });
    }
});

// Navigation mobile
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Fermer le menu mobile lors du clic sur un lien
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Navbar scroll effect
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Active navigation link on scroll
const sections = document.querySelectorAll('section[id]');

// Update navigation links
navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === '#apropos') {
        link.setAttribute('href', '#profil');
    }
});

function activateNavLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => link.classList.remove('active'));
            if (navLink) {
                navLink.classList.add('active');
            }
        }
    });
}

window.addEventListener('scroll', activateNavLink);

// Smooth scroll for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const offsetTop = targetSection.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observer les éléments à animer
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.skill-category, .project-card, .stat-item, .about-text');
    animateElements.forEach(el => {
        observer.observe(el);
    });
});

// Parallax effect pour la section hero
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - scrolled / 500;
    }
});

// Ajouter un effet de typing pour le nom (optionnel)
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Animation au chargement de la page
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
    }, 100);
});

// Gestion du thème (optionnel - pour future fonctionnalité dark mode)
const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

// Compteur animé pour les statistiques
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start) + (element.textContent.includes('+') ? '+' : '');
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + (element.textContent.includes('+') ? '+' : '');
        }
    }
    
    updateCounter();
}

// Observer pour les compteurs
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target.querySelector('.stat-number');
            if (statNumber) {
                const target = parseInt(statNumber.textContent.replace(/\D/g, ''));
                animateCounter(statNumber, target);
                counterObserver.unobserve(entry.target);
            }
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        counterObserver.observe(item);
    });
});
