/* ============================================
   YANTRIXA — Script
   Particle animation, scroll reveal, navigation
   ============================================ */

// ---- Loading Screen ----
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
        // Trigger hero reveals after loader
        triggerHeroReveal();
    }, 1800);
});

function triggerHeroReveal() {
    const heroReveals = document.querySelectorAll('.hero .reveal');
    heroReveals.forEach(el => el.classList.add('revealed'));
}

// ---- Particle Animation ----
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.pulse = Math.random() * Math.PI * 2;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.pulse += 0.01;

        // Mouse interaction
        if (mouse.x !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                const force = (150 - dist) / 150;
                this.x -= dx * force * 0.01;
                this.y -= dy * force * 0.01;
            }
        }

        // Wrap around
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        const dynamicOpacity = this.opacity * (0.7 + Math.sin(this.pulse) * 0.3);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${dynamicOpacity})`;
        ctx.fill();
    }
}

// Create particles
const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));
for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function drawLines() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 120) {
                const opacity = (1 - dist / 120) * 0.08;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    drawLines();
    requestAnimationFrame(animateParticles);
}

animateParticles();

// ---- Navbar Scroll Effect ----
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ---- Mobile Menu Toggle ----
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('open');
    });
});

// ---- Scroll Reveal ----
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

// Observe all elements with .reveal class, excluding hero section (handled by loader)
document.querySelectorAll('.reveal').forEach(el => {
    if (!el.closest('.hero')) {
        revealObserver.observe(el);
    }
});

// ---- Toast Notification System ----
function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ---- Contact Form (Web3Forms Integration) ----
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-btn');
    const originalText = btn.textContent;

    btn.textContent = 'Sending...';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    // Update hidden subject with selected service
    const serviceSelect = document.getElementById('form-service');
    const hiddenSubject = document.getElementById('hidden-subject');
    if (serviceSelect && serviceSelect.value) {
        hiddenSubject.value = `Yantrixa Inquiry: ${serviceSelect.value}`;
    }

    const formData = new FormData(contactForm);

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            btn.textContent = '✓ Message Sent!';
            btn.style.opacity = '1';
            btn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
            contactForm.reset();
            showToast('✓ Message sent successfully! We\'ll get back to you soon.', 'success');
        } else {
            throw new Error(result.message || 'Submission failed');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        btn.textContent = '✗ Failed to Send';
        btn.style.background = 'linear-gradient(135deg, #ff1744, #ff5252)';
        showToast('✗ Failed to send message. Please try email or WhatsApp instead.', 'error');
    }

    // Reset button after 3 seconds
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.opacity = '1';
        btn.disabled = false;
    }, 3000);
});

// ---- Smooth Scroll for anchor links ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({
                top: top,
                behavior: 'smooth'
            });
        }
    });
});

// ---- Typing Effect for Hero (optional subtle touch) ----
// The metallic shimmer on the title handles the visual dynamism

// ---- Counter Animation for Stats ----
function animateCounter(el, target, suffix = '') {
    let current = 0;
    const step = target / 40;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current) + suffix;
    }, 40);
}

// ---- Console Branding ----
console.log(
    '%c YANTRIXA %c Engineering Intelligence ',
    'background: #00d4ff; color: #050508; font-family: monospace; font-size: 16px; font-weight: bold; padding: 8px 16px;',
    'background: #0a0a10; color: #00d4ff; font-family: monospace; font-size: 16px; padding: 8px 16px; border: 1px solid #00d4ff;'
);
