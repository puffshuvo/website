document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  const navLinksWrapper = document.querySelector('.nav-links-wrapper');
  const hamburger = document.querySelector('.hamburger');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');
  const scrollThreshold = 100;
  const classToggleThreshold = 50;
  let isScrolled = false;
  let isTransitioning = false;

  // Throttle function to limit scroll event frequency
  function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Smooth scroll animation for navbar
  function updateScrollAnimation() {
    if (isTransitioning) return;

    const scrollY = window.scrollY;

    if (scrollY > classToggleThreshold && !isScrolled) {
      isTransitioning = true;
      navbar.classList.add('transitioning');
      setTimeout(() => {
        navbar.classList.remove('transitioning');
        navbar.classList.add('scrolled');
        isScrolled = true;
        isTransitioning = false;
      }, 600); // Match CSS transition duration
    } else if (scrollY <= classToggleThreshold && isScrolled) {
      isTransitioning = true;
      navbar.classList.add('transitioning');
      setTimeout(() => {
        navbar.classList.remove('transitioning');
        navbar.classList.remove('scrolled');
        isScrolled = false;
        isTransitioning = false;
      }, 600); // Match CSS transition duration
    }
  }

  // Throttled scroll handler
  const throttledScroll = throttle(() => {
    requestAnimationFrame(updateScrollAnimation);
  }, 50);

  // Scroll event listener
  window.addEventListener('scroll', throttledScroll);

  // Enhanced Navigation Handler
  function initNavigation() {
    // Event delegation for nav links and dropdowns
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

          // Close other open dropdowns at the same level
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

    // Desktop hover functionality
    if (window.innerWidth > 768) {
      navLinksWrapper.addEventListener('mouseenter', (e) => {
        const item = e.target.closest('.nav-item, .dropdown-item');
        if (!item) return;

        const dropdown = item.querySelector('.dropdown-menu, .sub-dropdown-menu');
        if (dropdown) {
          dropdown.style.opacity = '1';
          dropdown.style.visibility = 'visible';
          dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
            ? 'translateX(-50%) translateY(0)' 
            : 'translateY(0)';
          const link = item.querySelector('.nav-link, .dropdown-link');
          if (link) link.setAttribute('aria-expanded', 'true');
        }
      }, true);

      navLinksWrapper.addEventListener('mouseleave', (e) => {
        const item = e.target.closest('.nav-item, .dropdown-item');
        if (!item) return;

        const dropdown = item.querySelector('.dropdown-menu, .sub-dropdown-menu');
        if (dropdown) {
          dropdown.style.opacity = '0';
          dropdown.style.visibility = 'hidden';
          dropdown.style.transform = dropdown.classList.contains('dropdown-menu') 
            ? 'translateX(-50%) translateY(-10px)' 
            : 'translateY(-10px)';
          const link = item.querySelector('.nav-link, .dropdown-link');
          if (link) link.setAttribute('aria-expanded', 'false');
        }
      }, true);
    }

    // Hamburger menu toggle
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

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLinksWrapper.contains(e.target) && !hamburger.contains(e.target)) {
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

          // Close other open dropdowns at the same level
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

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
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

  // Search functionality
  function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'products.json', true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const products = JSON.parse(xhr.responseText);
              const hasResults = products.some(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
              );
              if (hasResults) {
                window.location.href = `Construction.html?search=${encodeURIComponent(searchTerm)}`;
              } else {
                alert('No products found for your search term.');
              }
            } catch (error) {
              console.error('Error parsing JSON:', error);
              alert('Error performing search. Please try again.');
            }
          } else {
            console.error('Error loading JSON:', xhr.statusText);
            alert('Error performing search. Please try again.');
          }
        }
      };
      xhr.onerror = () => {
        console.error('Network error while loading JSON');
        alert('Network error. Please try again.');
      };
      xhr.send();
    } else {
      alert('Please enter a search term.');
    }
  }

  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // Menu image toggle (unchanged)
  const categories = document.querySelectorAll('.menu-category');
  const images = document.querySelectorAll('.image-panel img');

  categories.forEach(category => {
    category.addEventListener('mouseenter', () => {
      const imageId = category.getAttribute('data-image');
      images.forEach(img => {
        img.classList.toggle('active', img.getAttribute('data-image') === imageId);
      });
    });

    category.addEventListener('mouseleave', () => {
      images.forEach(img => {
        img.classList.toggle('active', img.getAttribute('data-image') === 'default');
      });
    });
  });

  // Initialize navigation
  initNavigation();
});