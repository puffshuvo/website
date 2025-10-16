document.addEventListener('DOMContentLoaded', () => {
  // Select key DOM elements
  const navbar = document.querySelector('.navbar');
  const navLinksWrapper = document.querySelector('.nav-links-wrapper');
  const hamburger = document.querySelector('.hamburger');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');
  const menuSection = document.querySelector('.menu-section');
  const logoImg = document.querySelector('.logo-img');

  // ==========================================================================
  // Navigation Functionality: Scroll behavior, hamburger, dropdowns, and search
  // ==========================================================================

  // Variables for navbar scroll behavior
  let isScrolled = false;
  let rafPending = false;
  let stableToggleTimer = null;
  const STABLE_DELAY = 120;
  const TRANSITION_DURATION = 600;
  const PROGRESS_SPAN = 180;

  // Utility function to clamp a value between a min and max
  function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }

  // Calculate scroll progress for navbar transition
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

  // Apply scroll progress to navbar
  function applyProgress(p) {
    if (navbar) navbar.style.setProperty('--navbar-progress', p.toFixed(3));
  }

  // Schedule navbar scrolled state toggle
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

  // Update navbar on scroll using requestAnimationFrame
  function onFrameUpdate() {
    rafPending = false;
    const p = computeProgress();
    applyProgress(p);
    scheduleStableToggle(p);
  }

  // Handle scroll event
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(onFrameUpdate);
  }

  // Force navbar to scrolled state when hovering over menu section
  function onPointerEnterMenu() {
    applyProgress(1);
    if (stableToggleTimer) clearTimeout(stableToggleTimer);
    stableToggleTimer = setTimeout(() => {
      navbar.classList.add('scrolled');
      isScrolled = true;
      stableToggleTimer = null;
    }, Math.min(200, STABLE_DELAY));
  }

  // Revert to scroll-based behavior when leaving menu section
  function onPointerLeaveMenu() {
    onScroll();
  }

  // Use IntersectionObserver for scroll detection if available
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

    // Handle window resize to update IntersectionObserver
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
    // Fallback to scroll and resize event listeners
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  // Add pointer events for menu section to affect navbar
  if (menuSection) {
    menuSection.addEventListener('pointerenter', onPointerEnterMenu, { passive: true });
    menuSection.addEventListener('pointerleave', onPointerLeaveMenu, { passive: true });
  }

  // Initial scroll update
  onScroll();

  // Initialize navigation interactions (hamburger, dropdowns, search)
  function initNavigation() {
    // Toggle hamburger menu on click
    if (hamburger && navLinksWrapper) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinksWrapper.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navLinksWrapper.classList.contains('active'));
      });

      // Close menu when clicking outside, excluding footer dropdown
      document.addEventListener('click', (e) => {
        const footerDropdown = document.querySelector('.footer-menu .dropdown');
        if (!navLinksWrapper.contains(e.target) && !hamburger.contains(e.target) && (!footerDropdown || !footerDropdown.contains(e.target))) {
          navLinksWrapper.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Handle search functionality
    function handleSearch() {
      const term = (searchInput && searchInput.value || '').trim();
      if (!term) return;
      console.log('search:', term);
    }
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

    // Handle dropdown interactions
    const navLinksWrapperNav = document.querySelector('.nav-links-wrapper');
    const hamburgerNav = document.querySelector('.hamburger');

    // Handle clicks on navigation links (mobile)
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

    // Handle hover events for dropdowns (desktop)
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

    // Toggle hamburger menu
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

    // Close menu when clicking outside, excluding footer dropdown
    document.addEventListener('click', (e) => {
      const footerDropdown = document.querySelector('.footer-menu .dropdown');
      if (!navLinksWrapperNav.contains(e.target) && !hamburgerNav.contains(e.target) && (!footerDropdown || !footerDropdown.contains(e.target))) {
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

    // Handle keyboard navigation for dropdowns
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

    // Reset navigation on window resize
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

  // Initialize navigation
  initNavigation();

  // ==========================================================================
  // Non-Navigation Functionality: Logo slider, cart, footer dropdowns, hover previews, image panel
  // ==========================================================================

  // Image Panel Functionality: Toggle images based on menu category interaction
  const menuCategories = document.querySelectorAll('.menu-category');
  const imagePanelImages = document.querySelectorAll('.image-panel img');

  function toggleImagePanel(dataImage) {
    imagePanelImages.forEach(img => {
      if (img.getAttribute('data-image') === dataImage) {
        img.classList.add('active');
      } else {
        img.classList.remove('active');
      }
    });
  }

  if (menuCategories && imagePanelImages) {
    menuCategories.forEach(category => {
      const dataImage = category.getAttribute('data-image');

      // Desktop: Hover to toggle image
      if (window.innerWidth > 768) {
        category.addEventListener('mouseenter', () => {
          toggleImagePanel(dataImage);
        });
        category.addEventListener('mouseleave', () => {
          toggleImagePanel('default');
        });
      }

      // Mobile: Click to toggle image
      category.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault(); // Prevent navigation on click for mobile
          toggleImagePanel(dataImage);
        }
      });
    });

    // Reset to default image on page load or when clicking outside
    document.addEventListener('click', (e) => {
      const isMenuCategory = e.target.closest('.menu-category');
      const footerDropdown = document.querySelector('.footer-menu .dropdown');
      if (!isMenuCategory && (!footerDropdown || !footerDropdown.contains(e.target))) {
        toggleImagePanel('default');
      }
    });
  }

  // Logo Slider: Duplicate images for seamless scrolling
  const logoTrack = document.querySelector('.logo-track');
  if (logoTrack) {
    const images = Array.from(logoTrack.querySelectorAll('img'));
    images.forEach(img => {
      const clone = img.cloneNode(true);
      logoTrack.appendChild(clone);
    });
  }

  // Hover Preview for Subcategory Links
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

  // Footer Dropdown Handling
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
      if (menu) {
        menu.style.opacity = state ? '1' : '0';
        menu.style.visibility = state ? 'visible' : 'hidden';
        menu.style.transform = state ? 'translateY(0)' : 'translateY(-6px)';
        menu.style.pointerEvents = state ? 'auto' : 'none';
      }
    }

    // Handle click to toggle dropdown
    drop.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a') || e.target.closest('.dropdown-menu')) return;
      e.preventDefault();
      e.stopPropagation(); // Prevent navigation's click-outside handler from interfering
      setOpen(!drop.classList.contains('open'));
    });

    // Handle keyboard navigation
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation(); // Prevent navigation's keydown handler from interfering
        setOpen(!drop.classList.contains('open'));
      } else if (e.key === 'Escape') {
        setOpen(false);
        drop.blur();
      }
    });

    // Close dropdown on focusout
    drop.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!drop.contains(document.activeElement)) setOpen(false);
      }, 0);
    });
  });

  // Close footer dropdowns when clicking outside, with explicit check
  document.addEventListener('pointerdown', (e) => {
    footerDropdowns.forEach(drop => {
      if (!drop.contains(e.target)) {
        drop.classList.remove('open');
        drop.setAttribute('aria-expanded', 'false');
        const menu = drop.querySelector('.dropdown-menu');
        if (menu) {
          menu.style.opacity = '0';
          menu.style.visibility = 'hidden';
          menu.style.transform = 'translateY(-6px)';
          menu.style.pointerEvents = 'none';
        }
      }
    });
  });

  // Cleanup on page unload
  window.addEventListener('unload', () => {
    if (stableToggleTimer) clearTimeout(stableToggleTimer);
  });

  // Cart Functionality
  function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  }

  function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function addToCart(product) {
    let cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      cart.push({ ...product, quantity: product.quantity || 1 });
    }
    saveCart(cart);
    updateCartDisplay();
  }

  function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    updateCartDisplay();
  }

  function updateCartDisplay() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElem = document.querySelector('.cart-count');
    if (cartCountElem) cartCountElem.textContent = count;

    const itemsList = document.querySelector('.cart-items');
    const totalAmount = document.querySelector('.total-amount');
    if (!itemsList || !totalAmount) return;

    itemsList.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.classList.add('cart-empty');
      emptyMsg.textContent = 'Your cart is empty.';
      itemsList.appendChild(emptyMsg);
    } else {
      cart.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="item-name">${item.name} x ${item.quantity}</span>
          <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
          <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
        `;
        itemsList.appendChild(li);
        total += item.price * item.quantity;
      });
    }

    totalAmount.textContent = `$${total.toFixed(2)}`;
  }

  // Initialize cart display
  updateCartDisplay();

  // Sync cart across browser tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') updateCartDisplay();
  });

  // Handle remove item from cart
  const cartDropdown = document.querySelector('.cart-dropdown');
  if (cartDropdown) {
    cartDropdown.addEventListener('click', (e) => {
      if (e.target.closest('.remove-item')) {
        const id = e.target.closest('.remove-item').dataset.id;
        removeFromCart(parseInt(id));
      }
    });
  }

  // Example usage: Call addToCart({id: 1, name: 'Cement', price: 10}) from product pages
});