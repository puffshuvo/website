// Enhanced Mobile Navigation JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Select key DOM elements
  const navbar = document.querySelector('.navbar') || null;
  const navLinksWrapper = document.querySelector('.nav-links-wrapper');
  const hamburger = document.querySelector('.hamburger');
  const body = document.body;

  // Create and append overlay for mobile menu
  let navOverlay = document.querySelector('.nav-overlay');
  if (!navOverlay) {
    navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    body.appendChild(navOverlay);
  }

  // ==========================================================================
  // ENHANCED NAVIGATION INITIALIZATION
  // ==========================================================================

  function initNavigation() {
    // Hamburger menu toggle
    if (hamburger && navLinksWrapper) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = navLinksWrapper.classList.contains('active');
        
        toggleMobileMenu(!isActive);
      });
    }

    // Overlay click to close
    if (navOverlay) {
      navOverlay.addEventListener('click', () => {
        toggleMobileMenu(false);
      });
    }

    // Click outside to close mobile menu
    document.addEventListener('click', (e) => {
      if (!navLinksWrapper.contains(e.target) && 
          !hamburger.contains(e.target) &&
          window.innerWidth <= 768) {
        toggleMobileMenu(false);
      }
    });

    // Swipe to close on mobile
    let touchStartX = 0;
    let touchEndX = 0;

    navLinksWrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    navLinksWrapper.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const swipeDistance = touchStartX - touchEndX;
      // If swiped left more than 50px, close menu
      if (swipeDistance > 50) {
        toggleMobileMenu(false);
      }
    }

    // Enhanced navigation link handling - ONLY for mobile
    if (navLinksWrapper) {
      navLinksWrapper.addEventListener('click', (e) => {
        // Skip if desktop
        if (window.innerWidth > 768) return;

        const target = e.target.closest('.nav-link, .dropdown-link');
        if (!target) return;

        const dropdown = target.nextElementSibling;
        
        if (dropdown && (dropdown.classList.contains('dropdown-menu') || 
                        dropdown.classList.contains('sub-dropdown-menu'))) {
          e.preventDefault();
          e.stopPropagation();
          
          toggleDropdown(target, dropdown);
        } else if (target.href && !dropdown) {
          // Navigate to link only if no dropdown exists
          window.location.href = target.href;
        }
      });

      // Enhanced keyboard navigation for mobile
      navLinksWrapper.addEventListener('keydown', (e) => {
        if (window.innerWidth > 768) return;
        
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target.closest('.nav-link, .dropdown-link');
          if (!target) return;
          
          e.preventDefault();
          const dropdown = target.nextElementSibling;
          
          if (dropdown && (dropdown.classList.contains('dropdown-menu') || 
                          dropdown.classList.contains('sub-dropdown-menu'))) {
            toggleDropdown(target, dropdown);
          } else if (target.href && !dropdown) {
            window.location.href = target.href;
          }
        } else if (e.key === 'Escape') {
          toggleMobileMenu(false);
        }
      });
    }

    // Window resize handling
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768) {
          // Desktop mode - reset everything
          toggleMobileMenu(false);
          
          // Remove active class from all dropdowns
          const allDropdowns = navLinksWrapper.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
          allDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
            const link = dropdown.previousElementSibling;
            if (link) link.setAttribute('aria-expanded', 'false');
          });
        }
      }, 100);
    });

    // Prevent body scroll when mobile menu is open
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target === navLinksWrapper && 
            mutation.attributeName === 'class') {
          if (navLinksWrapper.classList.contains('active')) {
            body.style.overflow = 'hidden';
          } else {
            body.style.overflow = '';
          }
        }
      });
    });

    observer.observe(navLinksWrapper, { attributes: true });
  }

  // Toggle mobile menu function
  function toggleMobileMenu(show) {
    if (show) {
      navLinksWrapper.classList.add('active');
      hamburger.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      navOverlay.classList.add('active');
      body.style.overflow = 'hidden';
      
      // Close all dropdowns when opening menu
      setTimeout(() => {
        const allDropdowns = navLinksWrapper.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
        allDropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
          const link = dropdown.previousElementSibling;
          if (link) link.setAttribute('aria-expanded', 'false');
        });
      }, 100);
    } else {
      navLinksWrapper.classList.remove('active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      navOverlay.classList.remove('active');
      body.style.overflow = '';
      
      // Close all dropdowns
      const allDropdowns = navLinksWrapper.querySelectorAll('.dropdown-menu, .sub-dropdown-menu');
      allDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
        const link = dropdown.previousElementSibling;
        if (link) link.setAttribute('aria-expanded', 'false');
      });
    }
  }

  // Toggle dropdown function with smooth animation
  function toggleDropdown(target, dropdown) {
    const isActive = dropdown.classList.contains('active');
    
    // Close all sibling dropdowns at same level
    const parent = target.closest('.nav-item, .dropdown-item');
    if (parent) {
      const siblings = parent.parentElement.querySelectorAll(
        ':scope > .nav-item > .dropdown-menu, :scope > .dropdown-item > .sub-dropdown-menu'
      );
      siblings.forEach(sibling => {
        if (sibling !== dropdown) {
          sibling.classList.remove('active');
          const siblingLink = sibling.previousElementSibling;
          if (siblingLink) {
            siblingLink.setAttribute('aria-expanded', 'false');
            siblingLink.classList.remove('active');
          }
        }
      });
    }
    
    // Toggle current dropdown
    dropdown.classList.toggle('active');
    target.setAttribute('aria-expanded', !isActive);
    
    // Add visual feedback
    if (!isActive) {
      target.classList.add('active');
    } else {
      target.classList.remove('active');
    }

    // Scroll dropdown into view if needed (with delay for animation)
    if (!isActive) {
      setTimeout(() => {
        const rect = dropdown.getBoundingClientRect();
        const navRect = navLinksWrapper.getBoundingClientRect();
        
        if (rect.bottom > navRect.bottom) {
          dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }

  // ==========================================================================
  // CART FUNCTIONALITY (unchanged)
  // ==========================================================================

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
    try {
      localStorage.setItem('cartState', JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
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
      saveCart(cart);
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

  function initCartInteractions() {
    const cartIcon = document.querySelector('.cart-icon');
    const cartDropdown = document.querySelector('.cart-dropdown');
    
    if (!cartIcon || !cartDropdown) return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cartDropdown.classList.toggle('active');
        updateCartDisplay();
      });

      document.addEventListener('click', (e) => {
        if (!cartDropdown.contains(e.target) && !cartIcon.contains(e.target)) {
          cartDropdown.classList.remove('active');
        }
      });
    } else {
      let hideTimeout;

      cartIcon.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        updateCartDisplay();
      });

      cartIcon.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          if (!cartDropdown.matches(':hover')) {
            // Dropdown will hide via CSS
          }
        }, 100);
      });
    }
  }

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

  updateCartDisplay();
  initCartInteractions();

  window.addEventListener('storage', (e) => {
    if (e.key === 'cartState') {
      updateCartDisplay();
    }
  });

  // ==========================================================================
  // FOOTER & OTHER FUNCTIONALITY (unchanged)
  // ==========================================================================

  const footerDropdowns = document.querySelectorAll('.footer-menu .dropdown');
  
  footerDropdowns.forEach(drop => {
    drop.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      e.preventDefault();
      e.stopPropagation();
      
      footerDropdowns.forEach(otherDrop => {
        if (otherDrop !== drop) {
          otherDrop.classList.remove('open');
        }
      });
      
      drop.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    const isFooterDropdown = e.target.closest('.footer-menu .dropdown');
    if (!isFooterDropdown) {
      footerDropdowns.forEach(drop => {
        drop.classList.remove('open');
      });
    }
  });

  const logoTrack = document.querySelector('.logo-track');
  if (logoTrack) {
    const images = Array.from(logoTrack.querySelectorAll('img'));
    images.forEach(img => {
      const clone = img.cloneNode(true);
      logoTrack.appendChild(clone);
    });
  }

  // Materials grid initialization
  const materials = [
    {
      name: "Tiles",
      defaultImage: "cat/Ti.png",
      hoverImage: "cat/Tih.png",
      link: "Construction.html?category=Construction&subcategory=interior&subsubcategory=tiles"
    },
    {
      name: "Paint",
      defaultImage: "cat/Paint.png",
      hoverImage: "cat/Painth.png",
      link: "Construction.html?category=Construction&subcategory=paint"
    },
    {
      name: "Electrical Materials",
      defaultImage: "cat/Fan.png",
      hoverImage: "cat/Fanh.png",
      link: "Construction.html?category=home Appliances&subcategory=Electronic Appliances&subsubcategory=FAN"
    },
    {
      name: "Wood & Board",
      defaultImage: "cat/Wood.png",
      hoverImage: "cat/woodh.png",
      link: "Construction.html?category=Construction&subcategory=interior&subsubcategory=wood"
    },
    {
      name: "Sanitary Fixtures",
      defaultImage: "cat/Basin.png",
      hoverImage: "cat/Basinh.png",
      link: "Construction.html?category=Construction&subcategory=sanitary&subsubcategory=sanitary fixtures"
    },
    {
      name: "Sanitary Fittings",
      defaultImage: "cat/Sanitary.png",
      hoverImage: "cat/Sanitaryh.png",
      link: "Construction.html?category=Construction&subcategory=sanitary&subsubcategory=sanitary fittings"
    },
    {
      name: "Glass & Aluminum",
      defaultImage: "cat/glass.png",
      hoverImage: "cat/glassh.png",
      link: "Construction.html?category=Construction&subcategory=interior&subsubcategory=Mirror"
    },
    {
      name: "Furniture",
      defaultImage: "cat/furniture.png",
      hoverImage: "cat/furnitureh.png",
      link: "Construction.html?category=Furniture&subcategory=living room&subsubcategory=sofa"
    },
  {
      name: "Cement",
      defaultImage: "cat/Cement.png",
      hoverImage: "cat/Cementh.png",
      link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=cement"
    },
    {
      name: "Sand",
      defaultImage: "cat/Sand.png",
      hoverImage: "cat/Sandh.png",
      link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=sand"
    },
    {
      name: "Brick",
      defaultImage: "cat/Brick.png",
      hoverImage: "cat/Brickh.png",
      link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=brick"
    },
    {
      name: "Reinforcement",
      defaultImage: "cat/Rainforcement.png",
      hoverImage: "cat/Rainforcementh.png",
      link: "Construction.html?category=Construction&subcategory=Civil+Work&subsubcategory=reinforcement"
    }
    
   
    
  ];

  function createMaterialCard(material) {
    const card = document.createElement('a');
    card.href = material.link;
    card.className = 'material-card';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'material-image-container';

    if (material.defaultImage) {
      const defaultImg = document.createElement('img');
      defaultImg.src = material.defaultImage;
      defaultImg.alt = material.name;
      defaultImg.className = 'material-image default';
      imageContainer.appendChild(defaultImg);
    }

    if (material.hoverImage) {
      const hoverImg = document.createElement('img');
      hoverImg.src = material.hoverImage;
      hoverImg.alt = material.name + ' hover';
      hoverImg.className = 'material-image hover';
      imageContainer.appendChild(hoverImg);
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

  function initMaterials() {
    const grid = document.getElementById('materialsGrid');
    if (grid) {
      materials.forEach(material => {
        const card = createMaterialCard(material);
        grid.appendChild(card);
      });
    }
  }

  // Initialize everything
  initNavigation();
  initMaterials();

  // Make functions available globally
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateCartDisplay = updateCartDisplay;
});