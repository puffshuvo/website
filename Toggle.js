document.addEventListener('DOMContentLoaded', () => {
  // Select key DOM elements
  const navbar = document.querySelector('.navbar') || null;
  const navLinksWrapper = document.querySelector('.nav-links-wrapper');
  const hamburger = document.querySelector('.hamburger');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');
  const menuSection = document.querySelector('.menu-section') || null;
  const logoImg = document.querySelector('.logo-img'); 

  // ==========================================================================
  // Navigation Functionality: Scroll behavior, hamburger, dropdowns, and search
  // ==========================================================================

  // Variables for navbar scroll behavior
  let isScrolled = false;
  let rafPending = false;
  let stableToggleTimer = null;
  const STABLE_DELAY = 120;
  const PROGRESS_SPAN = 180;

  // Clamp value between min and max
  function clamp(v, a = 0, b = 1) {
    return Math.max(a, Math.min(b, v));
  }

  // Compute navbar scroll progress
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
    if (navbar) {
      navbar.style.setProperty('--navbar-progress', p.toFixed(3));
    }
  }

  // Schedule navbar scrolled state toggle
  function scheduleStableToggle(p) {
    const wantScrolled = p >= 0.95;
    if (stableToggleTimer) clearTimeout(stableToggleTimer);

    stableToggleTimer = setTimeout(() => {
      stableToggleTimer = null;
      if (navbar) {
        if (wantScrolled && !isScrolled) {
          navbar.classList.add('scrolled');
          isScrolled = true;
        } else if (!wantScrolled && isScrolled) {
          navbar.classList.remove('scrolled');
          isScrolled = false;
        }
      }
    }, STABLE_DELAY);
  }

  // Handle scroll frame updates
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

  // Handle pointer enter on menu
  function onPointerEnterMenu() {
    applyProgress(1);
    if (stableToggleTimer) clearTimeout(stableToggleTimer);
    stableToggleTimer = setTimeout(() => {
      if (navbar) {
        navbar.classList.add('scrolled');
        isScrolled = true;
      }
      stableToggleTimer = null;
    }, Math.min(200, STABLE_DELAY));
  }

  // Handle pointer leave from menu
  function onPointerLeaveMenu() {
    onScroll();
  }

  // Setup scroll observers
  if ('IntersectionObserver' in window && menuSection && navbar) {
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

  // === Cart Interactions ===
  function initCartInteractions() {
    const cartIcon = document.querySelector('.cart-icon');
    const cartDropdown = document.querySelector('.cart-dropdown');
    let cartHideTimeout = null;

    if (cartIcon && cartDropdown) {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (!isTouchDevice) {
        // Desktop: Hover interactions
        cartIcon.addEventListener('pointerenter', () => {
          clearTimeout(cartHideTimeout);
          cartDropdown.classList.add('active');
          updateCartDisplay(); // Update cart summary on hover
          console.log('Cart icon hovered - showed cart-dropdown');
        });

        cartDropdown.addEventListener('pointerenter', () => {
          clearTimeout(cartHideTimeout);
          console.log('Cart dropdown hovered - kept open');
        });

        cartIcon.addEventListener('pointerleave', () => {
          cartHideTimeout = setTimeout(() => {
            cartDropdown.classList.remove('active');
            console.log('Cart icon left - hid cart-dropdown');
          }, 300);
        });

        cartDropdown.addEventListener('pointerleave', () => {
          cartHideTimeout = setTimeout(() => {
            cartDropdown.classList.remove('active');
            console.log('Cart dropdown left - hid cart-dropdown');
          }, 300);
        });
      } else {
        // Mobile: Click to toggle
        cartIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          cartDropdown.classList.toggle('active');
          updateCartDisplay(); // Update cart summary on click
          console.log('Cart icon clicked - toggled cart-dropdown');
        });
      }

      // Close dropdown on click outside
      document.addEventListener('click', (e) => {
        if (!cartDropdown.contains(e.target) && !cartIcon.contains(e.target)) {
          cartDropdown.classList.remove('active');
          console.log('Clicked outside cart - closed cart-dropdown');
        }
      });
    } else {
      console.warn('Cart icon or cart-dropdown not found');
    }
  }

  // Call cart interactions setup
  initCartInteractions();

  // === Navigation Initialization ===
  function initNavigation() {
    // Hamburger menu handling
    const hamburger = document.querySelector('.hamburger');
    const navLinksWrapper = document.querySelector('.nav-links-wrapper');
    if (hamburger && navLinksWrapper) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinksWrapper.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navLinksWrapper.classList.contains('active'));

        if (navLinksWrapper.classList.contains('active')) {
          setTimeout(() => {
            const allDropdowns = navLinksWrapper.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
            allDropdowns.forEach(dropdown => {
              dropdown.classList.remove('active');
            });
            const allLinks = navLinksWrapper.querySelectorAll('.nav-link, .dropdown-link');
            allLinks.forEach(link => link.setAttribute('aria-expanded', 'false'));
          }, 100);
        }
      });

      document.addEventListener('click', (e) => {
        const footerDropdown = document.querySelector('.footer-menu .dropdown');
        if (!navLinksWrapper.contains(e.target) && !hamburger.contains(e.target) && (!footerDropdown || !footerDropdown.contains(e.target))) {
          navLinksWrapper.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
          const allDropdowns = navLinksWrapper.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
          allDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
          });
          const allLinks = navLinksWrapper.querySelectorAll('.nav-link, .dropdown-link');
          allLinks.forEach(link => link.setAttribute('aria-expanded', 'false'));
        }
      });
    }

    // Search handling
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-input');
    function handleSearch() {
      const term = (searchInput && searchInput.value || '').trim();
      if (!term) return;
      console.log('search:', term);
      if (window.gallery) {
        window.gallery.currentFilters.search = term.toLowerCase();
        window.gallery.applyFilters();
      }
    }
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch();
    });

    // Navigation link handling
    if (navLinksWrapper) {
      navLinksWrapper.addEventListener('click', (e) => {
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
            navLinksWrapper.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            window.location.href = target.href;
          }
        }
      });

      // Desktop hover interactions
      // if (window.innerWidth > 768) {
      //   const navItems = navLinksWrapper.querySelectorAll('.nav-item, .dropdown-item');
      //   navItems.forEach(item => {
      //     const dropdown = item.querySelector('.dropdown-menu, .sub-dropdown-menu');
      //     const link = item.querySelector('.nav-link, .dropdown-link');

      //     item.addEventListener('pointerenter', () => {
      //       if (!dropdown) return;
      //       clearTimeout(item._hideTimeout);
      //       dropdown.style.opacity = '1';
      //       dropdown.style.visibility = 'visible';
      //       dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
      //         ? 'translateX(-50%) translateY(0)' 
      //         : 'translateY(0)';
      //       if (link) link.setAttribute('aria-expanded', 'true');
      //     });

      //     item.addEventListener('pointerleave', () => {
      //       if (!dropdown) return;
      //       item._hideTimeout = setTimeout(() => {
      //         dropdown.style.opacity = '0';
      //         dropdown.style.visibility = 'hidden';
      //         dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
      //           ? 'translateX(-50%) translateY(-10px)' 
      //           : 'translateY(-10px)';
      //         if (link) link.setAttribute('aria-expanded', 'false');
      //       }, 120);
      //     });
      //   });
      // }

      // Keyboard navigation
      navLinksWrapper.addEventListener('keydown', (e) => {
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
            navLinksWrapper.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            window.location.href = target.href;
          }
        }
      });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && navLinksWrapper && hamburger) {
        navLinksWrapper.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        const allDropdowns = navLinksWrapper.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
        allDropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
          dropdown.style.opacity = '0';
          dropdown.style.visibility = 'hidden';
          dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
            ? 'translateX(-50%) translateY(-10px)' 
            : 'translateY(-10px)';
        });
        const allLinks = navLinksWrapper.querySelectorAll('.nav-link, .dropdown-link');
        allLinks.forEach(link => link.setAttribute('aria-expanded', 'false'));
      }
    });
  }

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
  try {
    const savedCart = localStorage.getItem('cartState') || '[]';
    return JSON.parse(savedCart);
  } catch (e) {
    console.error('Error loading cart:', e);
    return [];
  }
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
  try {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cartState', JSON.stringify(cart));
    updateCartDisplay();
  } catch (e) {
    console.error('Error removing item from cart:', e);
  }
}

  function updateCartDisplay() {
  const cart = getCart();
  updateCartCount();

  const itemsList = document.querySelector('.cart-items');
  const totalAmount = document.querySelector('.cart-total .total-amount');
  if (!itemsList) return;

  if (cart.length === 0) {
    itemsList.innerHTML = '<li class="cart-empty">Your cart is empty</li>';
    if (totalAmount) totalAmount.textContent = '৳0.00';
    return;
  }

  itemsList.innerHTML = cart.map(item => `
    <li class="cart-item">
      <img src="${item.image || 'Image/placeholder.png'}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-quantity">Qty: ${item.quantity}</div>
        <div class="cart-item-price">৳${((item.price || 0) * item.quantity).toFixed(2)}</div>
      </div>
      <button class="cart-item-remove" data-id="${item.id}">
        <i class="fas fa-times"></i>
      </button>
    </li>
  `).join('');

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  if (totalAmount) totalAmount.textContent = `৳${total.toFixed(2)}`;
}

  function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const count = getCart().reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCountElements.forEach(elem => {
      elem.textContent = count;
    });
  }

  // Initialize cart display
  updateCartDisplay();

  // Sync cart across browser tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'cartState') {
      updateCartDisplay();
    }
  });

  // Handle remove item from cart
  const cartDropdown = document.querySelector('.cart-dropdown');
  if (cartDropdown) {
    cartDropdown.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.cart-item-remove');
      if (removeBtn) {
        e.preventDefault();
        const id = removeBtn.dataset.id;
        removeFromCart(id);
      }
    });
  }

  // Example usage: Call addToCart({id: 1, name: 'Cement', price: 10}) from product pages
  initNavigation();
});




const materials = [
            {
                name: "Cement",
                defaultImage: "cat/Cement.png", // Add your default image path here
                hoverImage: "cat/Cementh.png",   // Add your hover image path here
                link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=cement"   // Add your link here
            },
             {
                name: "Sand",
                defaultImage: "cat/Sand.png", // Add your default image path here
                hoverImage: "cat/Sandh.png",   // Add your hover image path here
                link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=sand"   // Add your link here
            },
             {
                name: "Brick",
                defaultImage: "cat/Brick.png", // Add your default image path here
                hoverImage: "cat/Brickh.png",   // Add your hover image path here
                link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=brick"   // Add your link here
            },
            {
                name: "Reinforcement", 
                defaultImage: "cat/Rainforcement.png", // Add your default image path here
                hoverImage: "cat/Rainforcementh.png",   // Add your hover image path here
                link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=reinforcement"   // Add your link here
            },
            {
                name: "Paint", 
                defaultImage: "cat/Paint.png", // Add your default image path here
                hoverImage: "cat/Painth.png",   // Add your hover image path here
                link: "Construction.html?category=Paint"   // Add your link here
            },
            {
                name: "Tiles", 
                defaultImage: "cat/Ti.png", // Add your default image path here
                hoverImage: "cat/Tih.png",   // Add your hover image path here
                link: "Construction.html?category=Interior&subcategory=Tiles"   // Add your link here
            },
            {
                name: "Electrical Matrials ", 
                defaultImage: "cat/Fan.png", // Add your default image path here
                hoverImage: "cat/Fanh.png",   // Add your hover image path here
                link: "Construction.html?category=electrical"   // Add your link here
            },
            {
                name: "Wood & Board", 
                defaultImage: "cat/Wood.png", // Add your default image path here
                hoverImage: "cat/woodh.png",   // Add your hover image path here
                link: "Construction.html?category=Interior&subcategory=Wood"   // Add your link here
            },
            {
                name: "sanitary fixtures", 
                defaultImage: "cat/Basin.png", // Add your default image path here
                hoverImage: "cat/Basinh.png",   // Add your hover image path here
                link: "Construction.html?category=sanitary"   // Add your link here
            },
            {
                name: "sanitary fittings", 
                defaultImage: "cat/Sanitary.png", // Add your default image path here
                hoverImage: "cat/Sanitaryh.png",   // Add your hover image path here
                link: "Construction.html?category=sanitary"   // Add your link here
            },
            {
                name: "Glass & Aluminum", 
                defaultImage: "cat/glass.png", // Add your default image path here
                hoverImage: "cat/glassh.png",   // Add your hover image path here
                link: "Construction.html?category=Interior&subcategory=Glass"   // Add your link here
            },
            {
              name: "Furniture",
              defaultImage: "cat/furniture.png",
              hoverImage: "cat/furnitureh.png",
              link: "Construction.html?category=Furniture"
            }

        ];

        // Function to create material card HTML
        function createMaterialCard(material) {
            const card = document.createElement('a');
            card.href = material.link;
            card.className = 'material-card';
            
            const imageContainer = document.createElement('div');
            imageContainer.className = 'material-image-container';
            
            // Default image
            if (material.defaultImage) {
                const defaultImg = document.createElement('img');
                defaultImg.src = material.defaultImage;
                defaultImg.alt = material.name;
                defaultImg.className = 'material-image default';
                imageContainer.appendChild(defaultImg);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'material-image default placeholder-image';
                placeholder.textContent = 'Default Image';
                imageContainer.appendChild(placeholder);
            }
            
            // Hover image
            if (material.hoverImage) {
                const hoverImg = document.createElement('img');
                hoverImg.src = material.hoverImage;
                hoverImg.alt = material.name + ' hover';
                hoverImg.className = 'material-image hover';
                imageContainer.appendChild(hoverImg);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'material-image hover placeholder-image';
                placeholder.textContent = 'Hover Image';
                imageContainer.appendChild(placeholder);
            }
            
            const info = document.createElement('div');
            info.className = 'material-info';
            
            const name = document.createElement('p');
            name.className = 'material-name';
            name.textContent = material.name;
            
            info.appendChild(name);
            card.appendChild(imageContainer);
            card.appendChild(info);
            
            return card;
        }

        // Initialize materials grid
        function initMaterials() {
            const grid = document.getElementById('materialsGrid');
            materials.forEach(material => {
                const card = createMaterialCard(material);
                grid.appendChild(card);
            });
        }

        // Load materials when page loads
        document.addEventListener('DOMContentLoaded', initMaterials);