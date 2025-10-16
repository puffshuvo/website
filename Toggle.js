document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  const navLinksWrapper = document.querySelector('.nav-links-wrapper');
  const hamburger = document.querySelector('.hamburger');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');
  const menuSection = document.querySelector('.menu-section');
  const logoImg = document.querySelector('.logo-img');

  let isScrolled = false;
  let rafPending = false;
  let stableToggleTimer = null;
  const STABLE_DELAY = 120;
  const TRANSITION_DURATION = 600;
  const PROGRESS_SPAN = 180;

  function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }

  function computeProgress() {
    if (!menuSection || !navbar) return 0;
    const navHeight = navbar.offsetHeight || 0;
    const menuTop = menuSection.getBoundingClientRect().top;
    const start = navHeight;
    const end = navHeight + PROGRESS_SPAN;

    if (menuTop <= start) return 1;
    if (menuTop >= end) return 0;
    return clamp(1 - (menuTop - start) / (end - start));
  }

  function applyProgress(p) {
    if (navbar) navbar.style.setProperty('--navbar-progress', p.toFixed(3));
  }

  function scheduleStableToggle(p) {
    const wantScrolled = p >= 0.95;
    if (stableToggleTimer) clearTimeout(stableToggleTimer);

    stableToggleTimer = setTimeout(() => {
      stableToggleTimer = null;
      if (wantScrolled && !isScrolled) {
        navbar.classList.add('scrolled');
        isScrolled = true;
      } else if (!wantScrolled && isScrolled) {
        navbar.classList.remove('scrolled');
        isScrolled = false;
      }
    }, STABLE_DELAY);
  }

  function onFrameUpdate() {
    rafPending = false;
    const p = computeProgress();
    applyProgress(p);
    scheduleStableToggle(p);
  }

  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(onFrameUpdate);
  }

  function onPointerEnterMenu() {
    applyProgress(1);
    if (stableToggleTimer) clearTimeout(stableToggleTimer);
    stableToggleTimer = setTimeout(() => {
      navbar.classList.add('scrolled');
      isScrolled = true;
      stableToggleTimer = null;
    }, Math.min(200, STABLE_DELAY));
  }

  function onPointerLeaveMenu() {
    onScroll();
  }

  if ('IntersectionObserver' in window && menuSection) {
    const navHeight = () => (navbar ? navbar.offsetHeight : 0);
    const io = new IntersectionObserver(entries => {
      entries.forEach(() => onScroll());
    }, {
      root: null,
      rootMargin: `-${navHeight()}px 0px 0px 0px`,
      threshold: 0
    });
    io.observe(menuSection);

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        onScroll();
        io.disconnect();
        io.observe(menuSection);
        resizeTimer = null;
      }, 120);
    });
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  if (menuSection) {
    menuSection.addEventListener('pointerenter', onPointerEnterMenu, { passive: true });
    menuSection.addEventListener('pointerleave', onPointerLeaveMenu, { passive: true });
  }

  onScroll();

  function initNavigation() {
    if (hamburger && navLinksWrapper) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinksWrapper.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navLinksWrapper.classList.contains('active'));
      });

      document.addEventListener('click', (e) => {
        if (!navLinksWrapper.contains(e.target) && !hamburger.contains(e.target)) {
          navLinksWrapper.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    function handleSearch() {
      const term = (searchInput && searchInput.value || '').trim();
      if (!term) return;
      console.log('search:', term);
    }
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
  }
  initNavigation();

  // Logo slider dynamic duplication
  const logoTrack = document.querySelector('.logo-track');
  if (logoTrack) {
    const images = Array.from(logoTrack.querySelectorAll('img'));
    images.forEach(img => {
      const clone = img.cloneNode(true);
      logoTrack.appendChild(clone);
    });
  }

  const preview = document.getElementById('hover-preview');
  const previewImg = preview.querySelector('img');
  const links = document.querySelectorAll('.subcategory-list a');

  links.forEach(link => {
    const imgSrc = link.dataset.image;
    if (!imgSrc) return;
    link.addEventListener('mouseenter', (e) => {
      previewImg.src = imgSrc;
      previewImg.alt = link.textContent.trim();
      preview.style.display = 'block';
      preview.setAttribute('aria-hidden', 'false');
    });
    link.addEventListener('mousemove', (e) => {
      const offset = 12;
      const rect = preview.getBoundingClientRect();
      let x = e.clientX + offset;
      let y = e.clientY + offset;
      if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - offset;
      if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - offset;
      preview.style.left = x + 'px';
      preview.style.top = y + 'px';
    });
    link.addEventListener('mouseleave', () => {
      preview.style.display = 'none';
      preview.setAttribute('aria-hidden', 'true');
      previewImg.src = '';
    });
  });

  const navLinksWrapperNav = document.querySelector('.nav-links-wrapper');
  const hamburgerNav = document.querySelector('.hamburger');

  function initNavigationNav() {
    navLinksWrapperNav.addEventListener('click', (e) => {
      const target = e.target.closest('.nav-link, .dropdown-link');
      if (!target) return;

      if (window.innerWidth <= 768) {
        e.preventDefault();
        const dropdown = target.nextElementSibling;
        if (dropdown && (dropdown.classList.contains('dropdown-menu') || dropdown.classList.contains('sub-dropdown-menu'))) {
          dropdown.classList.toggle('active');
          const isExpanded = dropdown.classList.contains('active');
          target.setAttribute('aria-expanded', isExpanded);
          e.stopPropagation();

          const parent = target.closest('.nav-item, .dropdown-item');
          const siblingDropdowns = parent.parentElement.querySelectorAll('.dropdown-menu.active, .sub-dropdown-menu.active');
          siblingDropdowns.forEach(sibling => {
            if (sibling !== dropdown) {
              sibling.classList.remove('active');
              const siblingLink = sibling.previousElementSibling;
              if (siblingLink) siblingLink.setAttribute('aria-expanded', 'false');
            }
          });
        } else if (target.href) {
          navLinksWrapperNav.classList.remove('active');
          hamburgerNav.setAttribute('aria-expanded', 'false');
          window.location.href = target.href;
        }
      }
    });

    if (window.innerWidth > 768) {
      const navItems = navLinksWrapperNav.querySelectorAll('.nav-item, .dropdown-item');
      navItems.forEach(item => {
        const dropdown = item.querySelector('.dropdown-menu, .sub-dropdown-menu');
        const link = item.querySelector('.nav-link, .dropdown-link');

        item.addEventListener('pointerenter', () => {
          if (!dropdown) return;
          clearTimeout(item._hideTimeout);
          dropdown.style.opacity = '1';
          dropdown.style.visibility = 'visible';
          dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
            ? 'translateX(-50%) translateY(0)' 
            : 'translateY(0)';
          if (link) link.setAttribute('aria-expanded', 'true');
        });

        item.addEventListener('pointerleave', () => {
          if (!dropdown) return;
          item._hideTimeout = setTimeout(() => {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
              ? 'translateX(-50%) translateY(-10px)' 
              : 'translateY(-10px)';
            if (link) link.setAttribute('aria-expanded', 'false');
          }, 120);
        });
      });
    }

    hamburgerNav.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinksWrapperNav.classList.toggle('active');
      hamburgerNav.setAttribute('aria-expanded', navLinksWrapperNav.classList.contains('active'));

      if (navLinksWrapperNav.classList.contains('active')) {
        setTimeout(() => {
          const allDropdowns = navLinksWrapperNav.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
          allDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
          });
          const allLinks = navLinksWrapperNav.querySelectorAll('.nav-link, .dropdown-link');
          allLinks.forEach(link => link.setAttribute('aria-expanded', 'false'));
        }, 100);
      }
    });

    document.addEventListener('click', (e) => {
      if (!navLinksWrapperNav.contains(e.target) && !hamburgerNav.contains(e.target)) {
        navLinksWrapperNav.classList.remove('active');
        hamburgerNav.setAttribute('aria-expanded', 'false');
        const allDropdowns = navLinksWrapperNav.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
        allDropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
        });
        const allLinks = navLinksWrapperNav.querySelectorAll('.nav-link, .dropdown-link');
        allLinks.forEach(link => link.setAttribute('aria-expanded', 'false'));
      }
    });

    navLinksWrapperNav.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('.nav-link, .dropdown-link');
        if (!target) return;
        e.preventDefault();
        const dropdown = target.nextElementSibling;
        if (dropdown && (dropdown.classList.contains('dropdown-menu') || dropdown.classList.contains('sub-dropdown-menu'))) {
          dropdown.classList.toggle('active');
          const isExpanded = dropdown.classList.contains('active');
          target.setAttribute('aria-expanded', isExpanded);

          const parent = target.closest('.nav-item, .dropdown-item');
          const siblingDropdowns = parent.parentElement.querySelectorAll('.dropdown-menu.active, .sub-dropdown-menu.active');
          siblingDropdowns.forEach(sibling => {
            if (sibling !== dropdown) {
              sibling.classList.remove('active');
              const siblingLink = sibling.previousElementSibling;
              if (siblingLink) siblingLink.setAttribute('aria-expanded', 'false');
            }
          });
        } else if (target.href) {
          navLinksWrapperNav.classList.remove('active');
          hamburgerNav.setAttribute('aria-expanded', 'false');
          window.location.href = target.href;
        }
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        navLinksWrapperNav.classList.remove('active');
        hamburgerNav.setAttribute('aria-expanded', 'false');
        const allDropdowns = navLinksWrapperNav.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
        allDropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
          dropdown.style.opacity = '0';
          dropdown.style.visibility = 'hidden';
          dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
            ? 'translateX(-50%) translateY(-10px)' 
            : 'translateY(-10px)';
        });
        const allLinks = navLinksWrapperNav.querySelectorAll('.nav-link, .dropdown-link');
        allLinks.forEach(link => link.setAttribute('aria-expanded', 'false'));
      }
    });
  }

  initNavigationNav();

  const footerDropdowns = document.querySelectorAll('.footer-menu .dropdown');
  if (!footerDropdowns.length) return;

  footerDropdowns.forEach(drop => {
    drop.setAttribute('tabindex', '0');
    drop.setAttribute('role', 'button');
    drop.setAttribute('aria-expanded', 'false');

    const menu = drop.querySelector('.dropdown-menu');

    function setOpen(state) {
      drop.classList.toggle('open', state);
      drop.setAttribute('aria-expanded', state ? 'true' : 'false');
    }

    drop.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a') || e.target.closest('.dropdown-menu')) return;
      e.preventDefault();
      setOpen(!drop.classList.contains('open'));
      e.stopPropagation();
    });

    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(!drop.classList.contains('open'));
      } else if (e.key === 'Escape') {
        setOpen(false);
        drop.blur();
      }
    });

    drop.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!drop.contains(document.activeElement)) setOpen(false);
      }, 0);
    });
  });

  document.addEventListener('pointerdown', (e) => {
    footerDropdowns.forEach(drop => {
      if (!drop.contains(e.target)) drop.classList.remove('open');
      drop.setAttribute('aria-expanded', drop.classList.contains('open') ? 'true' : 'false');
    });
  });

  window.addEventListener('unload', () => {
    if (stableToggleTimer) clearTimeout(stableToggleTimer);
  });
});