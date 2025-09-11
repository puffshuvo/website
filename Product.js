// Updated Product.js
// Changes:
// - In addToCart: Instead of increasing quantity for existing items, check if product exists by ID and alert "This product is already in your cart!" if it does.
// - Prevent adding duplicates; quantity can still be adjusted in the cart page.
// - Ensured cart starts empty if no localStorage data (already handled).
// - Minor cleanup and comments for professionalism.

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const logo = document.querySelector('.logo');
    const navLinksWrapper = document.querySelector('.nav-links-wrapper');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelectorAll('.nav-links a');
    const scrollThreshold = 100;
    const maxTranslate = -10;
    const maxLinkTranslate = 10;
    const classToggleThreshold = 50;
    let isScrolled = false;

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

    function updateScrollAnimation() {
        const scrollY = window.scrollY;
        const progress = Math.min(scrollY / scrollThreshold, 1);
        logo.style.transform = `translateX(${progress * maxTranslate}px)`;
        navLinksWrapper.style.transform = `translateX(${progress * maxLinkTranslate}px)`;
        if (scrollY > classToggleThreshold + 10 && !isScrolled) {
            navbar.classList.add('scrolled');
            isScrolled = true;
        } else if (scrollY < classToggleThreshold - 10 && isScrolled) {
            navbar.classList.remove('scrolled');
            isScrolled = false;
        }
    }

    const debouncedScroll = debounce(() => {
        requestAnimationFrame(updateScrollAnimation);
    }, 10);

    window.addEventListener('scroll', debouncedScroll);

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinksWrapper.classList.toggle('active');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinksWrapper.classList.remove('active');
        });
    });

    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) {
            navLinksWrapper.classList.remove('active');
        }
    });
});

class ProductGallery {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            category: 'all',
            maxPrice: 100000,
            search: '',
            specifications: {}
        };
        this.currentSort = 'name';
        this.currentSubSubCategory = null;

        // Specification definitions for different sub-subcategories
        this.specificationDefinitions = {
            'Tiles': {
                'Size': ['12x12', '24x24', '12x24', '18x18', '36x36'],
                'Material': ['Ceramic', 'Porcelain', 'Natural Stone', 'Marble', 'Granite'],
                'Finish': ['Glossy', 'Matte', 'Textured', 'Polished'],
                'Thickness': ['8mm', '10mm', '12mm', '15mm', '20mm']
            },
            'Wood': {
                'Type': ['Oak', 'Pine', 'Mahogany', 'Teak', 'Maple', 'Birch'],
                'Thickness': ['12mm', '15mm', '18mm', '20mm', '25mm'],
                'Grade': ['Premium', 'Standard', 'Economy'],
                'Treatment': ['Treated', 'Untreated', 'Pressure Treated']
            },
            'cement': {
                'Grade': ['OPC 43', 'OPC 53', 'PPC', 'PSC'],
                'Brand': ['Lafarge', 'ACC', 'UltraTech', 'Ambuja', 'Shree'],
                'Pack Size': ['25kg', '50kg'],
                'Setting Time': ['Initial', 'Final', 'Quick Set']
            },
            'Cable': {
                'Type': ['PVC', 'XLPE', 'Armoured', 'Flexible'],
                'Core': ['Single Core', '2 Core', '3 Core', '4 Core'],
                'Size': ['1.5 sq mm', '2.5 sq mm', '4 sq mm', '6 sq mm', '10 sq mm'],
                'Voltage': ['1100V', '3300V', '11KV']
            },
            'Lock': {
                'Type': ['Mortise', 'Cylindrical', 'Deadbolt', 'Smart Lock'],
                'Material': ['Brass', 'Stainless Steel', 'Iron', 'Zinc Alloy'],
                'Security Level': ['Standard', 'High Security', 'Maximum Security'],
                'Finish': ['Chrome', 'Brass', 'Black', 'Satin']
            },
            'Sand': {
                'Type': ['River Sand', 'Sea Sand', 'Pit Sand', 'Fine Sand'],
                'Grade': ['Coarse', 'Medium', 'Fine'],
                'Color': ['White', 'Yellow', 'Red', 'Brown'],
                'Mesh Size': ['20-30', '30-50', '50-70', '70-100']
            },
            'Brick': {
                'Type': ['Red Brick', 'Fly Ash Brick', 'Concrete Brick', 'Clay Brick'],
                'Size': ['Standard', 'Modular', 'King Size', 'Queen Size'],
                'Grade': ['First Class', 'Second Class', 'Third Class'],
                'Strength': ['3.5 MPa', '7 MPa', '10 MPa', '15 MPa']
            },
            'Mirror': {
                'Type': ['Plain Mirror', 'Tinted Mirror', 'Antique Mirror', 'Safety Mirror'],
                'Thickness': ['3mm', '4mm', '5mm', '6mm'],
                'Size': ['2x3 ft', '3x4 ft', '4x6 ft', 'Custom'],
                'Edge': ['Polished', 'Beveled', 'Straight']
            }
        };

        // Category hierarchy mapping for breadcrumbs
        this.categoryHierarchy = {
            'Construction': {
                'civil-work': ['cement', 'Sand', 'Brick', 'Reinforcement'],
                'interior': ['Tiles', 'Wood', 'FAccessories', 'DAccessories', 'MHardware', 'Lock', 'Mirror'],
                'Paint': ['Waterproofing', 'Interior', 'Exterior', 'Enamel', 'WoodCoating'],
                'electronics': ['MK', 'Universal', 'Gang', 'PVCConduit', 'Cable', 'FanBox', 'LightBox', 'PVCBand', 'Holder', 'OtherEssentialItems'],
                'Sanitary': ['Fittings', 'Fixture', 'Pump']
            }
        };

        this.breadcrumbElement = document.querySelector('.breadcrumb-list');
        this.init();
    }

    init() {
        this.loadProductsFromJSON();
        this.bindEvents();
        this.addKeyboardNavigation();
        this.updateBreadcrumb();
        // Handle initial search from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const initialSearch = urlParams.get('search');
        if (initialSearch) {
            this.currentFilters.search = initialSearch.toLowerCase();
            document.getElementById('searchInput').value = initialSearch;
            this.filterProducts();
        }
    }

    loadProductsFromJSON(categoryFilter = null) {
    this.showLoading(true);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'products.json', true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    let data = JSON.parse(xhr.responseText);
                    
                    if (categoryFilter && categoryFilter !== 'all') {
                        data = data.filter(product =>
                            product.subcategory === categoryFilter ||
                            product.category === categoryFilter ||
                            product.subsubcategory === categoryFilter
                        );
                    }
                    
                    this.products = data.map(product => ({
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        category: product.category,
                        subcategory: product.subcategory,
                        subsubcategory: product.subsubcategory,
                        price: product.price,
                        currency: product.currency,
                        stock: product.stock,
                        specifications: product.specifications || {},
                        image: product.images && product.images.length > 0 
                            ? product.images[0] // Use the first image from the images array
                            : this.generateProductImage(product.subcategory || product.category) // Fallback
                    }));
                    
                    this.filteredProducts = [...this.products];
                    this.renderProducts();
                    this.updateStats();
                    this.updateBreadcrumb();
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    document.getElementById('productCount').textContent = 'Error loading products';
                }
            } else {
                console.error('Error loading JSON:', xhr.statusText);
                document.getElementById('productCount').textContent = 'Error loading products';
            }
            this.showLoading(false);
        }
    };
    xhr.onerror = () => {
        console.error('Network error while loading JSON');
        document.getElementById('productCount').textContent = 'Error loading products';
        this.showLoading(false);
    };
    xhr.send();
}
    generateProductImage(category) {
        const colors = ['#FFF3E3', '#E6D5B8', '#D8A48F', '#A68A64', '#736B60', '#4A4238'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
                    </linearGradient>
                </defs>
                <rect width="200" height="200" fill="url(#grad)" rx="15"/>
                <text x="100" y="100" font-family="Arial, sans-serif" font-size="14" 
                      fill="white" text-anchor="middle" dominant-baseline="middle">
                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                </text>
                <circle cx="50" cy="50" r="15" fill="rgba(255,255,255,0.3)"/>
                <circle cx="150" cy="150" r="20" fill="rgba(255,255,255,0.2)"/>
            </svg>
        `)}`;
    }

    bindEvents() {
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                e.target.classList.add('active');
                const selectedCategory = e.target.dataset.category;
                this.currentFilters.category = selectedCategory;

                if (e.target.classList.contains('sub-subcategory')) {
                    this.currentSubSubCategory = selectedCategory;
                    this.showSpecificationFilter(selectedCategory);
                } else {
                    this.currentSubSubCategory = null;
                    this.hideSpecificationFilter();
                }

                this.loadProductsFromJSON(selectedCategory);
                this.updateBreadcrumb();
            });
        });

        const priceRange = document.getElementById('priceRange');
        priceRange.addEventListener('input', (e) => {
            this.currentFilters.maxPrice = parseInt(e.target.value);
            document.getElementById('maxPrice').textContent = `৳${e.target.value}`;
            this.filterProducts();
        });

        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.filterProducts();
            }, 300);
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortProducts();
            this.renderProducts();
        });
    }

    showSpecificationFilter(category) {
        const specFilter = document.getElementById('specificationFilter');
        const specContent = document.getElementById('specificationContent');
        
        if (this.specificationDefinitions[category]) {
            let html = '';
            const specs = this.specificationDefinitions[category];
            
            for (const [specType, options] of Object.entries(specs)) {
                html += `
                    <div class="spec-group">
                        <h4>${specType}</h4>
                        <div class="spec-options">
                `;
                
                options.forEach(option => {
                    const isChecked = this.currentFilters.specifications[specType]?.includes(option) ? 'checked' : '';
                    html += `
                        <label>
                            <input type="checkbox" value="${option}" data-spec-type="${specType}" ${isChecked}>
                            <span>${option}</span>
                        </label>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            specContent.innerHTML = html;
            
            const specHeader = specFilter.querySelector('h3');
            if (!specHeader.querySelector('.spec-close-btn')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'spec-close-btn';
                closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                closeBtn.setAttribute('aria-label', 'Close specifications');
                closeBtn.onclick = () => this.hideSpecificationFilter();
                specHeader.appendChild(closeBtn);
            }
            
            specContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleSpecificationChange(e);
                });
            });
            
            specFilter.classList.add('show');
            
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    specFilter.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 300);
            }
        }
    }

    hideSpecificationFilter() {
        const specFilter = document.getElementById('specificationFilter');
        specFilter.classList.remove('show');
        this.currentFilters.specifications = {};
        
        if (this.currentSubSubCategory) {
            this.currentSubSubCategory = null;
            
            const activeSubSubCat = document.querySelector('.sub-subcategory.active');
            if (activeSubSubCat) {
                activeSubSubCat.classList.remove('active');
                
                const parentSubcat = activeSubSubCat.closest('.category-list')
                    .querySelector(`[data-category="${activeSubSubCat.dataset.category}"]`)
                    .previousElementSibling;
                
                if (parentSubcat && parentSubcat.classList.contains('subcategory')) {
                    parentSubcat.classList.add('active');
                    this.currentFilters.category = parentSubcat.dataset.category;
                }
            }
        }
        
        this.filterProducts();
        this.updateBreadcrumb();
    }

    addKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const specFilter = document.getElementById('specificationFilter');
            
            if (e.key === 'Escape' && specFilter.classList.contains('show')) {
                this.hideSpecificationFilter();
            }
        });
    }

    handleSpecificationChange(event) {
        const specType = event.target.dataset.specType;
        const value = event.target.value;
        const isChecked = event.target.checked;

        if (!this.currentFilters.specifications[specType]) {
            this.currentFilters.specifications[specType] = [];
        }

        if (isChecked) {
            if (!this.currentFilters.specifications[specType].includes(value)) {
                this.currentFilters.specifications[specType].push(value);
            }
        } else {
            this.currentFilters.specifications[specType] = this.currentFilters.specifications[specType].filter(v => v !== value);
            if (this.currentFilters.specifications[specType].length === 0) {
                delete this.currentFilters.specifications[specType];
            }
        }

        this.filterProducts();
    }

    clearSpecifications() {
        this.currentFilters.specifications = {};
        
        const checkboxes = document.querySelectorAll('#specificationContent input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            setTimeout(() => {
                checkbox.checked = false;
                checkbox.closest('label').style.transform = 'scale(0.95)';
                setTimeout(() => {
                    checkbox.closest('label').style.transform = '';
                }, 100);
            }, index * 50);
        });
        
        const clearBtn = document.querySelector('.clear-specs');
        const originalText = clearBtn.innerHTML;
        clearBtn.innerHTML = '<i class="fas fa-check"></i> Cleared!';
        clearBtn.style.background = '#28a745';
        clearBtn.style.borderColor = '#28a745';
        clearBtn.style.color = 'white';
        
        setTimeout(() => {
            clearBtn.innerHTML = originalText;
            clearBtn.style.background = '';
            clearBtn.style.borderColor = '';
            clearBtn.style.color = '';
        }, 1500);
        
        this.filterProducts();
    }

    filterProducts() {
        this.showLoading(true);

        setTimeout(() => {
            this.filteredProducts = this.products.filter(product => {
                const categoryMatch = this.currentFilters.category === 'all' ||
                    product.category === this.currentFilters.category ||
                    product.subcategory === this.currentFilters.category ||
                    product.subsubcategory === this.currentFilters.category;

                const priceMatch = product.price <= this.currentFilters.maxPrice;

                const searchMatch = !this.currentFilters.search ||
                    product.name.toLowerCase().includes(this.currentFilters.search) ||
                    product.description.toLowerCase().includes(this.currentFilters.search) ||
                    product.category.toLowerCase().includes(this.currentFilters.search);

                let specMatch = true;
                if (Object.keys(this.currentFilters.specifications).length > 0) {
                    for (const [specType, selectedValues] of Object.entries(this.currentFilters.specifications)) {
                        if (selectedValues.length > 0) {
                            const productSpecValue = product.specifications && product.specifications[specType];
                            if (!productSpecValue || !selectedValues.includes(productSpecValue)) {
                                specMatch = false;
                                break;
                            }
                        }
                    }
                }

                return categoryMatch && priceMatch && searchMatch && specMatch;
            });

            this.sortProducts();
            this.renderProducts();
            this.updateStats();
            this.updateBreadcrumb();
            this.showLoading(false);
        }, 300);
    }

    sortProducts() {
        this.filteredProducts.sort((a, b) => {
            switch (this.currentSort) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }

    renderProducts() {
        const grid = document.getElementById('productGrid');
        const noResults = document.querySelector('.no-results');

        if (this.filteredProducts.length === 0) {
            grid.innerHTML = '';
            grid.style.display = 'grid';
            noResults.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        noResults.style.display = 'none';

        grid.innerHTML = this.filteredProducts.map(product => {
            let specsHtml = '';
            if (product.specifications) {
                specsHtml = `
                    <div class="product-specs">
                        ${Object.entries(product.specifications).map(([key, value]) => 
                            `<span class="spec-tag">${key}: ${value}</span>`
                        ).join('')}
                    </div>
                `;
            }

            return `
                <div class="product-card" data-id="${product.id}">
                    <a href="details.html?id=${product.id}" class="product-image">
                        <img src="${product.image}" alt="${product.name}">
                    </a>
                    <div class="product-info">
                        <h3 class="product-name">
                            <a href="details.html?id=${product.id}">${product.name}</a>
                        </h3>
                        <div class="product-category">${product.subcategory || product.category}</div>
                        ${specsHtml}
                        <div class="product-price">৳${product.price.toFixed(2)}</div>
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="gallery.addToCart(${product.id})">
                                Add to Cart
                            </button>
                            <a href="details.html?id=${product.id}" class="btn btn-secondary">
                                View Details
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            document.querySelectorAll('.product-card').forEach((card, index) => {
                card.style.animation = `slideInUp 0.6s ease forwards ${index * 0.1}s`;
            });
        }, 100);
    }

    updateStats() {
        const total = this.products.length;
        const filtered = this.filteredProducts.length;
        const activeFilters = [];

        if (this.currentFilters.category !== 'all') {
            activeFilters.push(`Category: ${this.currentFilters.category}`);
        }
        if (this.currentFilters.maxPrice < 100000) {
            activeFilters.push(`Max Price: ৳${this.currentFilters.maxPrice}`);
        }
        if (this.currentFilters.search) {
            activeFilters.push(`Search: "${this.currentFilters.search}"`);
        }
        if (Object.keys(this.currentFilters.specifications).length > 0) {
            const specCount = Object.values(this.currentFilters.specifications).reduce((acc, arr) => acc + arr.length, 0);
            activeFilters.push(`Specifications: ${specCount} selected`);
        }

        document.getElementById('productCount').textContent =
            `Showing ${filtered} of ${total} products`;

        document.getElementById('activeFilters').textContent =
            activeFilters.length > 0 ? `Filters: ${activeFilters.join(', ')}` : '';
    }

    showLoading(show) {
        const loading = document.querySelector('.loading');
        document.getElementById('productGrid').style.display = show ? 'none' : 'grid';
        loading.style.display = show ? 'block' : 'none';
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.error('Product not found');
            return;
        }

        // Load existing cart from localStorage
        let cart = [];
        try {
            const savedCart = localStorage.getItem('cartState');
            if (savedCart) {
                cart = JSON.parse(savedCart);
            }
        } catch (e) {
            console.error('Error loading cart from localStorage:', e);
        }

        // Check if the product is already in the cart (by ID)
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            alert('This product is already in your cart!');
            return; // Prevent adding duplicate
        }

        // Add new item with quantity 1
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price, // Use actual product price from JSON
            quantity: 1,
            image: product.image,
            category: product.category,
            subcategory: product.subcategory,
            subsubcategory: product.subsubcategory
        });

        // Save updated cart to localStorage
        try {
            localStorage.setItem('cartState', JSON.stringify(cart));
            alert(`${product.name} added to cart!`); // Success feedback
        } catch (e) {
            console.error('Error saving cart to localStorage:', e);
            alert('Failed to add to cart. Please try again.');
        }

        // Optional: Visual feedback on the product card
        const card = document.querySelector(`[data-id="${productId}"]`);
        if (card) {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        }
    }

    updateBreadcrumb() {
        if (!this.breadcrumbElement) return;

        const breadcrumb = ['<li><a href="index.html">Home</a></li>'];
        const categoryPath = this.getCategoryPath(this.currentFilters.category);

        // Add category path with proper links
        categoryPath.forEach((cat, index) => {
            const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1').trim();
            const href = this.getCategoryHref(cat);
            breadcrumb.push(`<li><a href="${href}" data-category="${cat}">${formattedCat}</a></li>`);
        });

        // Add current category or sub-subcategory as the last item (non-clickable)
        if (this.currentSubSubCategory) {
            const formattedSubSubCat = this.currentSubSubCategory.charAt(0).toUpperCase() + 
                this.currentSubSubCategory.slice(1).replace(/([A-Z])/g, ' $1').trim();
            breadcrumb.push(`<li class="current">${formattedSubSubCat}</li>`);
        } else if (this.currentFilters.category !== 'all') {
            const formattedCat = this.currentFilters.category.charAt(0).toUpperCase() + 
                this.currentFilters.category.slice(1).replace(/([A-Z])/g, ' $1').trim();
            breadcrumb.push(`<li class="current">${formattedCat}</li>`);
        }

        this.breadcrumbElement.innerHTML = breadcrumb.join('');

        // Add click event listeners to breadcrumb links
        this.breadcrumbElement.querySelectorAll('a[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.dataset.category;
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                const targetItem = document.querySelector(`.category-item[data-category="${category}"]`);
                if (targetItem) {
                    targetItem.classList.add('active');
                    this.currentFilters.category = category;
                    this.currentSubSubCategory = null;
                    this.hideSpecificationFilter();
                    this.loadProductsFromJSON(category);
                    this.updateBreadcrumb();
                }
            });
        });
    }

    getCategoryPath(category) {
        if (category === 'all') return [];
        
        const path = [];
        let currentCategory = category;

        // Check if it's a sub-subcategory
        for (const [mainCat, subCats] of Object.entries(this.categoryHierarchy)) {
            for (const [subCat, subSubCats] of Object.entries(subCats)) {
                if (subSubCats.includes(currentCategory)) {
                    path.unshift(currentCategory); // Sub-subcategory
                    path.unshift(subCat); // Subcategory
                    path.unshift(mainCat); // Main category
                    return path;
                }
            }
            if (Object.keys(subCats).includes(currentCategory)) {
                path.unshift(currentCategory); // Subcategory
                path.unshift(mainCat); // Main category
                return path;
            }
        }

        // If it's a main category
        if (this.categoryHierarchy[currentCategory]) {
            path.unshift(currentCategory);
        }

        return path;
    }

    getCategoryHref(category) {
        // Map categories to their respective pages or filter actions
        const categoryPages = {
            'Construction': 'Construction.html',
            'civil-work': 'Construction.html',
            'interior': 'Construction.html',
            'Paint': 'Construction.html',
            'electronics': 'Construction.html',
            'Sanitary': 'Construction.html'
        };

        // For sub-subcategories, return the Construction page with a filter
        if (!categoryPages[category]) {
            return `Construction.html?category=${encodeURIComponent(category)}`;
        }

        return categoryPages[category] || 'Construction.html';
    }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Initialize the gallery
const gallery = new ProductGallery();

// Handle URL parameters to set initial category or search
const urlParams = new URLSearchParams(window.location.search);
const initialCategory = urlParams.get('category');
const initialSearch = urlParams.get('search');
if (initialCategory) {
    gallery.currentFilters.category = initialCategory;
    if (gallery.categoryHierarchy.Construction[initialCategory] || 
        Object.values(gallery.categoryHierarchy.Construction).some(subCats => subCats.includes(initialCategory))) {
        gallery.currentSubSubCategory = initialCategory;
        document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
        const targetItem = document.querySelector(`.category-item[data-category="${initialCategory}"]`);
        if (targetItem) {
            targetItem.classList.add('active');
            gallery.showSpecificationFilter(initialCategory);
        }
        gallery.loadProductsFromJSON(initialCategory);
    }
} else if (initialSearch) {
    gallery.currentFilters.search = initialSearch.toLowerCase();
    document.getElementById('searchInput').value = initialSearch;
    gallery.filterProducts();
}







