document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  const logo = document.querySelector('.logo');
  const navLinksWrapper = document.querySelector('.nav-links-wrapper');
  const searchBar = document.querySelector('.search-bar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelectorAll('.nav-links a');
  const scrollThreshold = 100;
  const classToggleThreshold = 50;
  let isScrolled = false;
  let isTransitioning = false;

  // Debounce function to limit scroll event frequency
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Smooth scroll animation
  function updateScrollAnimation() {
    const scrollY = window.scrollY;

    // Handle transitioning state
    if (scrollY > classToggleThreshold && !isScrolled) {
      isTransitioning = true;
      navbar.classList.add('transitioning');
      setTimeout(() => {
        navbar.classList.remove('transitioning');
        navbar.classList.add('scrolled');
        isScrolled = true;
        isTransitioning = false;
      }, 300); // Match CSS opacity transition duration
    } else if (scrollY <= classToggleThreshold && isScrolled) {
      isTransitioning = true;
      navbar.classList.add('transitioning');
      setTimeout(() => {
        navbar.classList.remove('transitioning');
        navbar.classList.remove('scrolled');
        isScrolled = false;
        isTransitioning = false;
      }, 300); // Match CSS opacity transition duration
    }
  }

  // Debounced scroll handler with requestAnimationFrame
  const debouncedScroll = debounce(() => {
    requestAnimationFrame(updateScrollAnimation);
  }, 10);

  // Scroll event listener
  window.addEventListener('scroll', debouncedScroll);

  // Hamburger menu toggle
  hamburger.addEventListener('click', () => {
    navLinksWrapper.classList.toggle('active');
  });

  // Close mobile menu when clicking on a nav link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinksWrapper.classList.remove('active');
    });
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) {
      navLinksWrapper.classList.remove('active');
    }
  });

  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.search-btn');

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

  // Menu image toggle
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
});