/**
 * js/modules/contact/main.js
 * Dedicated Controller for Contact, Legal Notices, & FAQ experience.
 * Powered by dynamic 3D WebGL Torus Knot Ribbon Flight background.
 */

import { initContactRibbon, destroyContactRibbon } from '../three/contact-ribbon.js';

let isInitialized = false;

const LEGAL_TEXTS = {
  imprint: {
    title: 'Imprint: Legal Notice',
    sub: 'Information in accordance with student club governance and RV University guidelines.',
    html: `
      <div class="legal-content-body">
        <h3>Daydreamers Film Society</h3>
        <p>An autonomous student-run cinema collective and film preservation initiative.</p>
        <p><strong>Affiliation:</strong> RV University, School of Computer Science & Engineering and School of Design.</p>
        <p><strong>Campus Location:</strong> D Block 4th Floor, RV Vidyaniketan, Mysuru Road, Bengaluru, Karnataka 560059.</p>
        
        <h3>Editorial & Club Direction</h3>
        <p><strong>Student Convenor:</strong> Alistair Moreau (Daydreamers Society)</p>
        <p><strong>Faculty Advisory:</strong> Prof. K. Tanaka, Department of Cinema & Media Studies</p>
        <p><strong>Electronic Contact:</strong> <a href="mailto:hello@daydreamers.club" style="color: var(--contact-accent-cool); text-decoration: underline;">hello@daydreamers.club</a></p>

        <h3>Purpose & Operations</h3>
        <p>Daydreamers screens educational, non-commercial, public-domain, student-submitted, and curated festival cinema exclusively for enrolled students, faculty, and invited cinephiles.</p>
      </div>
    `
  },
  terms: {
    title: 'General Terms & Conditions',
    sub: 'Screening etiquette, hall conduct, and admission guidelines.',
    html: `
      <div class="legal-content-body">
        <h3>1. Admission & Seating</h3>
        <p>Admission to all Daydreamers screenings in Auditorium D is free of charge to registered university members. A valid digital admission pass with QR code must be presented at the auditorium entrance.</p>
        <p>Seats are allocated upon reservation. Members are requested to occupy their assigned seat numbers to ensure smooth entry.</p>

        <h3>2. Screening Etiquette</h3>
        <p>In respect to fellow cinephiles and the projectionists, mobile phones must be silenced prior to curtain call. Food and beverages other than capped water bottles are prohibited inside the auditorium tier.</p>

        <h3>3. Nitrate Inversion & Experimental Screenings</h3>
        <p>Certain experimental film restoration sessions feature historical projection techniques and light strobing. Viewer discretion guidelines are noted on the respective screening billing.</p>
      </div>
    `
  },
  privacy: {
    title: 'Privacy Policy',
    sub: 'Commitment to student privacy: no user tracking, no third-party ad sharing.',
    html: `
      <div class="legal-content-body">
        <h3>1. No Registration Required</h3>
        <p>Daydreamers requires no user registration, password creation, or persistent accounts. Our service operates strictly on ephemeral reservation tokens.</p>

        <h3>2. Collection of Reservation Data</h3>
        <p>When reserving seats or submitting attendee details, we collect only the full attendee name, University Serial Number (USN), and official college email address (@rvu.edu.in). This information is used exclusively to generate, cryptographically sign, and dispatch the digital ticket pass.</p>

        <h3>3. Data Retention</h3>
        <p>Ticketing check-in logs are purged following the conclusion of each monthly screening cycle.</p>
      </div>
    `
  },
  cancellation: {
    title: 'Cancellation & Release Policy',
    sub: 'Guidelines on reservation cancellations and unclaimed auditorium seats.',
    html: `
      <div class="legal-content-body">
        <h3>1. Voluntary Cancellation</h3>
        <p>If you or your group are unable to attend a screening, please notify the society desk at least two hours before showtime so seats can be released to waitlisted students.</p>

        <h3>2. Ten-Minute Curtain Release</h3>
        <p>Unclaimed reserved seats are automatically released to rush line walk-ins exactly 10 minutes prior to the scheduled film start time.</p>
      </div>
    `
  }
};

export function initContact() {
  // 1. Mount 3D WebGL Torus Ribbon Background
  const webglContainer = document.getElementById('contactWebglBg');
  if (webglContainer) {
    try {
      initContactRibbon(webglContainer);
    } catch (e) {
      console.warn('[Contact] WebGL ribbon initialization failed:', e);
    }
  }

  // 2. View Switching Logic
  const panelContact = document.getElementById('panelContact');
  const panelFaq = document.getElementById('panelFaq');
  const panelLegal = document.getElementById('panelLegal');
  const legalTitle = document.getElementById('legalTitle');
  const legalSub = document.getElementById('legalSub');
  const legalBody = document.getElementById('legalBody');
  const faqCategoryNav = document.getElementById('faqCategoryNav');

  const navBtns = document.querySelectorAll('.sidebar-nav-btn');

  function setView(viewType, subKey) {
    navBtns.forEach(btn => btn.classList.remove('active'));

    if (panelContact) panelContact.classList.remove('active');
    if (panelFaq) panelFaq.classList.remove('active');
    if (panelLegal) panelLegal.classList.remove('active');
    if (faqCategoryNav) faqCategoryNav.classList.remove('visible');

    if (viewType === 'contact') {
      if (panelContact) panelContact.classList.add('active');
      const b = document.getElementById('navBtnContact');
      if (b) b.classList.add('active');
    } else if (viewType === 'faq') {
      if (panelFaq) panelFaq.classList.add('active');
      if (faqCategoryNav) faqCategoryNav.classList.add('visible');
      const b = document.getElementById('navBtnFaq');
      if (b) b.classList.add('active');
    } else if (viewType === 'legal') {
      if (panelLegal) panelLegal.classList.add('active');
      const b = document.getElementById(`navBtn_${subKey}`);
      if (b) b.classList.add('active');

      const data = LEGAL_TEXTS[subKey] || LEGAL_TEXTS.imprint;
      if (legalTitle) legalTitle.textContent = data.title;
      if (legalSub) legalSub.textContent = data.sub;
      if (legalBody) legalBody.innerHTML = data.html;
    }
  }

  // Sidebar navigation listeners
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const view = btn.dataset.view;
      const sub = btn.dataset.sub;
      setView(view, sub);
      try {
        const h = sub || (view === 'faq' ? 'faq' : 'contact');
        history.replaceState(null, '', `#${h}`);
      } catch (_) {}
    });
  });

  // Handle in-form links to legal terms
  const linkTerms = document.getElementById('linkTermsInForm');
  const linkPrivacy = document.getElementById('linkPrivacyInForm');
  if (linkTerms) {
    linkTerms.addEventListener('click', (e) => {
      e.preventDefault();
      setView('legal', 'terms');
      try { history.replaceState(null, '', '#terms'); } catch (_) {}
    });
  }
  if (linkPrivacy) {
    linkPrivacy.addEventListener('click', (e) => {
      e.preventDefault();
      setView('legal', 'privacy');
      try { history.replaceState(null, '', '#privacy'); } catch (_) {}
    });
  }

  // Handle initial hash routing (e.g. contact.html#faq, contact.html#terms)
  const initialHash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (initialHash === 'faq') {
    setView('faq');
  } else if (['imprint', 'terms', 'privacy', 'cancellation'].includes(initialHash)) {
    setView('legal', initialHash);
  }

  // Character counter for textarea
  const msgInput = document.getElementById('contactMessage');
  const counterEl = document.getElementById('contactCharCounter');
  if (msgInput && counterEl) {
    msgInput.addEventListener('input', () => {
      const len = msgInput.value.length;
      counterEl.textContent = `[${len} / 255] characters`;
      if (len > 255) {
        counterEl.style.color = '#ef9a9a';
      } else {
        counterEl.style.color = 'var(--contact-text-dim)';
      }
    });
  }

  // Contact Form Submission
  const contactForm = document.getElementById('contactForm');
  const alertMsg = document.getElementById('contactAlertMsg');
  const btnSend = document.getElementById('btnContactSend');
  const btnCancel = document.getElementById('btnContactCancel');

  if (btnCancel && contactForm) {
    btnCancel.addEventListener('click', (e) => {
      e.preventDefault();
      contactForm.reset();
      if (counterEl) counterEl.textContent = '[0 / 255] characters';
      if (alertMsg) alertMsg.style.display = 'none';
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (alertMsg) {
        alertMsg.style.display = 'none';
        alertMsg.className = 'contact-alert-msg';
      }

      const firstName = document.getElementById('contactFirstName')?.value.trim() || '';
      const lastName = document.getElementById('contactLastName')?.value.trim() || '';
      const company = document.getElementById('contactCompany')?.value.trim() || '';
      const email = document.getElementById('contactEmail')?.value.trim() || '';
      const message = msgInput?.value.trim() || '';
      const agree = document.getElementById('contactAgree')?.checked;

      if (!firstName || !email || !message) {
        if (alertMsg) {
          alertMsg.textContent = 'Please fill out all required fields (Name, Email, Message).';
          alertMsg.classList.add('error');
        }
        return;
      }

      if (message.length > 255) {
        if (alertMsg) {
          alertMsg.textContent = 'Message exceeds the 255-character maximum limit.';
          alertMsg.classList.add('error');
        }
        return;
      }

      if (!agree) {
        if (alertMsg) {
          alertMsg.textContent = 'Please agree to the Terms and Conditions and Privacy Policy.';
          alertMsg.classList.add('error');
        }
        return;
      }

      try {
        if (btnSend) {
          btnSend.disabled = true;
          btnSend.textContent = 'Sending...';
        }

        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, company, email, message })
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          if (alertMsg) {
            alertMsg.textContent = data.message || 'Thank you! Your transmission has reached Daydreamers Film Society.';
            alertMsg.classList.add('success');
          }
          contactForm.reset();
          if (counterEl) counterEl.textContent = '[0 / 255] characters';
        } else {
          throw new Error(data.error || 'Unable to submit your message. Please try again.');
        }
      } catch (err) {
        if (alertMsg) {
          alertMsg.textContent = err.message || 'Failed to submit. Please verify connection.';
          alertMsg.classList.add('error');
        }
      } finally {
        if (btnSend) {
          btnSend.disabled = false;
          btnSend.textContent = 'Send';
        }
      }
    });
  }

  // FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const q = item.querySelector('.faq-question');
    if (q) {
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });

  // FAQ Category Filter Pills
  const catBtns = document.querySelectorAll('.faq-cat-btn');
  catBtns.forEach(cBtn => {
    cBtn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      cBtn.classList.add('active');
      const cat = cBtn.dataset.category;

      faqItems.forEach(item => {
        if (!cat || cat === 'all' || item.dataset.category === cat) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Load more trigger
  const loadMoreBtn = document.getElementById('btnFaqLoadMore');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadMoreBtn.textContent = 'All questions loaded';
      loadMoreBtn.style.opacity = '0.6';
      loadMoreBtn.disabled = true;
    });
  }

  // Floating Back-to-Top Button
  const topBtn = document.getElementById('contactScrollTopBtn');
  if (topBtn) {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        topBtn.classList.add('is-visible');
      } else {
        topBtn.classList.remove('is-visible');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    topBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

export function destroyContact() {
  destroyContactRibbon();
}

// Auto-boot on direct landing
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('contactPageWrapper')) {
        initContact();
      }
    });
  } else {
    if (document.getElementById('contactPageWrapper')) {
      initContact();
    }
  }
}
