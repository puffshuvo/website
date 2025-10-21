// === Global Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ProductGallery instance when DOM is fully loaded
    window.gallery = new ProductGallery();
});

window.addEventListener('popstate', () => {
    // Handle browser back/forward navigation
    if (window.gallery) {
        window.gallery.handleURLParameters();
    }
});

// === ProductGallery Class ===
class ProductGallery {
    // --- Constructor and Initialization ---
    constructor() {
        // Initialize core properties
        this.products = []; // All products from API
        this.filteredProducts = []; // Filtered products for display
        this.currentFilters = {
            category: 'all',
            subcategory: null,
            subsubcategory: null,
            priceRange: 100000,
            search: '',
            sortBy: 'name',
            specifications: {}
        };
        this.apiBase = 'https://archimartbd.com/api/product.json'; // API endpoint
        this.cart = JSON.parse(localStorage.getItem('cartState')) || []; // Cart state from localStorage
        this.debugEnabled = true; // Debug logging toggle
        this.cartHideTimeout = null; // Timeout for cart dropdown

        // Setup logging methods
        this._log = (level, ...args) => {
            if (!this.debugEnabled) return;
            const prefix = `[Gallery][${new Date().toISOString()}]`;
            try {
                console[level]?.(prefix, ...args) || console.log(prefix, ...args);
            } catch (e) {}
        };
        this.debug = (...args) => this._log('debug', ...args);
        this.info = (...args) => this._log('info', ...args);
        this.warn = (...args) => this._log('warn', ...args);
        this.error = (...args) => this._log('error', ...args);

        this.debug('Constructor: starting initialization', { cartLength: this.cart.length, apiBase: this.apiBase });
        this.init();
    }

    // Initialize gallery components
    async init() {
        this.debug('init() called with currentFilters', this.currentFilters);
        try {
            await this.loadProducts();
            this.setupEventListeners();
            this.updateDisplay();
            this.updateBreadcrumb();
            this.updateCartCount();
            this.updateCartSummary();
            this.info('Gallery initialized successfully', { productsLoaded: this.products.length });
        } catch (error) {
            this.error('Failed to initialize gallery:', error);
            this.showError('Failed to load products. Please try again later.');
        }
    }

    // --- Product Loading and Filtering ---
    // Load products from API based on category filters
    async loadProducts(category = null, subcategory = null, subsubcategory = null) {
        this.debug('loadProducts() called', { category, subcategory, subsubcategory });
        this.showLoading(true);
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters.specifications = {};

        try {
            let url = this.apiBase;
            const params = new URLSearchParams();
            if (category && category !== 'all') params.append('category', category);
            if (subcategory && subcategory !== 'all') params.append('subcategory', subcategory);
            if (subsubcategory && subsubcategory !== 'all') params.append('subsubcategory', subsubcategory);
            if (params.toString()) url += '?' + params.toString();

            this.debug('🔄 Fetching products from URL', url);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.products = Array.isArray(data) ? data : data.products || [];
            this.filteredProducts = [...this.products];
            
            if (this.products.length === 0) {
                this.debug('🚫 No products found for', { category, subcategory, subsubcategory });
            } else {
                this.debug('✅ Loaded products', { count: this.products.length });
            }

            this.updateSpecificationFilters();
            this.applyFilters();
        } catch (error) {
            this.error('❌ Error loading products:', error);
            this.showError(`No products found for "${category || 'All'}"`);
        } finally {
            this.showLoading(false);
        }
    }

    // Apply current filters to products
    applyFilters() {
        this.debug('applyFilters() currentFilters snapshot', JSON.parse(JSON.stringify(this.currentFilters)));
        let filtered = [...this.products];

        // Filter by price
        filtered = filtered.filter(product => {
            const price = parseFloat(product.price) || 0;
            return price <= this.currentFilters.priceRange;
        });

        // Filter by search term
        if (this.currentFilters.search) {
            filtered = filtered.filter(product =>
                (product.name && product.name.toLowerCase().includes(this.currentFilters.search)) ||
                (product.description && product.description.toLowerCase().includes(this.currentFilters.search)) ||
                (product.category && product.category.toLowerCase().includes(this.currentFilters.search)) ||
                (product.subcategory && product.subcategory.toLowerCase().includes(this.currentFilters.search))
            );
        }

        // Filter by specifications
        Object.keys(this.currentFilters.specifications).forEach(specKey => {
            const specValues = this.currentFilters.specifications[specKey];
            if (specValues.length > 0) {
                filtered = filtered.filter(product => {
                    if (!product.specifications || !product.specifications[specKey]) return false;
                    return specValues.includes(product.specifications[specKey]);
                });
            }
        });

        // Sort filtered products
        this.sortProducts(filtered);
        this.filteredProducts = filtered;
        this.debug('applyFilters result count', this.filteredProducts.length);
        this.updateDisplay();
        this.updateStats();
    }

    // Sort products based on current sortBy filter
    sortProducts(products) {
        this.debug('sortProducts()', this.currentFilters.sortBy);
        switch (this.currentFilters.sortBy) {
            case 'name':
                products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'price-low':
                products.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
                break;
            case 'price-high':
                products.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
                break;
            case 'category':
                products.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
                break;
        }
    }

    // --- UI Rendering ---
    // Update product grid display
    updateDisplay() {
        const productGrid = document.getElementById('productGrid');
        const noResults = document.querySelector('.no-results');
        if (!productGrid) {
            this.warn('Product grid element not found');
            return;
        }

        if (this.filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="no-products-message">
                    <i class="fas fa-search" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <h3>No Products Found</h3>
                    <p>No products match your selection.</p>
                </div>
            `;
            productGrid.style.display = 'block';
            if (noResults) noResults.style.display = 'none';
            this.debug('🚫 Displayed "No Products" message');
            return;
        }

        if (noResults) noResults.style.display = 'none';
        productGrid.style.display = 'grid';
        productGrid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
        this.setupProductCardListeners();
        this.debug('✅ Displayed products', this.filteredProducts.length);
    }

    // Create HTML for a single product card
    createProductCard(product) {
        const price = parseFloat(product.price) || 0;
        const formattedPrice = price > 0 ? `৳${price.toLocaleString()}` : 'Price on request';
        const imageUrl = (product.images && product.images.length > 0) 
        ? product.images[0] 
        : (product.image || product.imageUrl || 'Image/placeholder.jpg');
        const availability = product.stock > 0 ? 'In Stock' : 'Out of Stock';
        const stockClass = product.stock > 0 ? 'in-stock' : 'out-stock';
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='Image/placeholder.jpg';}else{this.onerror=null;}">
                    <div class="product-overlay">
                        
                        <button class="btn-add-cart" onclick="window.gallery.addToCart('${product.id}')" 
                                ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category}${product.subcategory ? ' > ' + product.subcategory : ''}${product.subsubcategory ? ' > ' + product.subsubcategory : ''}</p>
                    <div class="product-price">${formattedPrice}</div>
                    <div class="product-availability ${stockClass}">${availability}</div>
                    ${product.specifications ? this.renderSpecifications(product.specifications) : ''}
                </div>
            </div>
        `;
    }

    // Render limited product specifications for card
    renderSpecifications(specs) {
        const importantSpecs = Object.entries(specs).slice(0, 3);
        if (importantSpecs.length === 0) return '';
        return `
            <div class="product-specs">
                ${importantSpecs.map(([key, value]) => 
                    `<span class="spec-item">${this.formatSpecName(key)}: ${value}</span>`
                ).join('')}
            </div>
        `;
    }

    // Render all specifications for quick view
    renderAllSpecifications(specs) {
        return `
            <div class="all-specifications">
                <h4>Specifications</h4>
                <div class="spec-grid">
                    ${Object.entries(specs).map(([key, value]) => 
                        `<div class="spec-row">
                            <strong>${this.formatSpecName(key)}:</strong> ${value}
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    // --- Event Handlers ---
    // Setup all event listeners
    setupEventListeners() {
        this.debug('setupEventListeners() start');

        // Hamburger menu toggle
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links-wrapper');
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                navLinks.classList.toggle('active');
                hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
                this.debug('Hamburger clicked - toggled nav-links-wrapper');
            });
        } else {
            this.warn('Hamburger or nav-links-wrapper not found');
        }

        // Cart dropdown interactions
        this.setupCartListeners();

        // Price range filter
        const priceRange = document.getElementById('priceRange');
        const maxPriceDisplay = document.getElementById('maxPrice');
        if (priceRange && maxPriceDisplay) {
            priceRange.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                maxPriceDisplay.textContent = `৳${value.toLocaleString()}`;
                this.currentFilters.priceRange = value;
                this.debug('Price range changed', this.currentFilters.priceRange);
                this.debounce(() => this.applyFilters(), 300)();
            });
        } else {
            this.warn('Price range or max price display not found');
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.debug('Search input changed', this.currentFilters.search);
                this.debounce(() => this.applyFilters(), 300)();
            });
        } else {
            this.warn('Search input not found');
        }

        // Sort selection
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.debug('Sort changed to', this.currentFilters.sortBy);
                this.applyFilters();
            });
        } else {
            this.warn('Sort by element not found');
        }

        // Category selection
        const categoryItems = document.querySelectorAll('.category-item');
        if (categoryItems.length > 0) {
            categoryItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const category = item.dataset.category;
                    this.debug('Category item clicked', category, item.className);
                    this.handleCategoryClick(item, category);
                });
            });
        } else {
            this.warn('No category items found');
        }

        this.handleURLParameters();
        window.addEventListener('popstate', () => {
            this.debug('popstate event received');
            this.handleURLParameters();
        });

        this.debug('setupEventListeners() done');
    }

    // Setup cart-specific event listeners
    setupCartListeners() {
        const cartIcon = document.querySelector('.cart-icon');
        const cartDropdown = document.querySelector('.cart-dropdown');
        if (cartIcon && cartDropdown) {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            if (!isTouchDevice) {
                // Desktop hover interactions
                cartIcon.addEventListener('pointerenter', () => {
                    clearTimeout(this.cartHideTimeout);
                    cartDropdown.classList.add('active');
                    this.updateCartSummary();
                    this.debug('Cart icon hovered - showed cart-dropdown');
                });

                cartDropdown.addEventListener('pointerenter', () => {
                    clearTimeout(this.cartHideTimeout);
                    this.debug('Cart dropdown hovered - kept open');
                });

                cartIcon.addEventListener('pointerleave', () => {
                    this.cartHideTimeout = setTimeout(() => {
                        cartDropdown.classList.remove('active');
                        this.debug('Cart icon left - hid cart-dropdown');
                    }, 300);
                });

                cartDropdown.addEventListener('pointerleave', () => {
                    this.cartHideTimeout = setTimeout(() => {
                        cartDropdown.classList.remove('active');
                        this.debug('Cart dropdown left - hid cart-dropdown');
                    }, 300);
                });
            } else {
                // Mobile click interactions
                cartIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cartDropdown.classList.toggle('active');
                    this.updateCartSummary();
                    this.debug('Cart icon clicked - toggled cart-dropdown');
                });
            }

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!cartDropdown.contains(e.target) && !cartIcon.contains(e.target)) {
                    cartDropdown.classList.remove('active');
                    this.debug('Clicked outside cart - closed cart-dropdown');
                }
            });
        } else {
            this.warn('Cart icon or cart-dropdown not found');
        }
    }

    // Handle category selection
    handleCategoryClick(item, category) {
        this.debug('🖱️ Category clicked', { category, type: item.className });
        document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        const isMainCategory = !item.classList.contains('subcategory') && !item.classList.contains('sub-subcategory');
        const isSubcategory = item.classList.contains('subcategory');
        const isSubSubcategory = item.classList.contains('sub-subcategory');

        if (isMainCategory) {
            this.currentFilters = { ...this.currentFilters, category, subcategory: null, subsubcategory: null };
            this.loadProducts(category);
        } else if (isSubcategory) {
            const parentCategory = this.findParentCategory(item);
            this.currentFilters = { ...this.currentFilters, category: parentCategory, subcategory: category, subsubcategory: null };
            this.loadProducts(parentCategory, category);
        } else if (isSubSubcategory) {
            const { mainCategory, subCategory } = this.findFullCategoryHierarchy(item);
            this.currentFilters = { ...this.currentFilters, category: mainCategory, subcategory: subCategory, subsubcategory: category };
            this.loadProducts(mainCategory, subCategory, category);
        } else {
            this.currentFilters = { ...this.currentFilters, category: 'all', subcategory: null, subsubcategory: null };
            this.loadProducts();
        }

        this.updateURL();
        this.updateBreadcrumb();
        this.debug('✅ Category click handled - new data loading...');
    }

    // --- Cart Management ---
    // Add product to cart
    addToCart(productId, retries = 5) {
        this.debug('addToCart() called for', productId);

        if (!this.products || this.products.length === 0) {
            if (retries > 0) {
                this.warn('addToCart: products not loaded yet', productId);
                this.showNotification('Products are still loading. Please try again in a moment.');
                setTimeout(() => this.addToCart(productId, retries - 1), 500);
            } else {
                this.warn('addToCart: products failed to load after retries', productId);
                this.showNotification('Products failed to load. Please refresh the page.');
            }
            return;
        }

        const product = this.products.find(p => String(p.id) === String(productId));
        if (!product) {
            this.warn('addToCart: product not found', productId, this.products.map(p => p.id));
            this.showNotification('Product not found. Please refresh the page.');
            return;
        }

        if (product.stock <= 0) {
            this.warn('addToCart: product out of stock', productId);
            this.showNotification(`${product.name} is out of stock.`);
            return;
        }

        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
            this.debug('Increased quantity for cart item', existingItem);
        } else {
            const newItem = {
                id: productId,
                name: product.name,
                price: product.price,
                image: (product.images && product.images.length > 0) 
                    ? product.images[0] 
                    : (product.image || product.imageUrl || 'Image/placeholder.jpg'),
                quantity: 1,
                category: product.category,
                subcategory: product.subcategory,
                subsubcategory: product.subsubcategory
            };
            this.cart.push(newItem);
            this.debug('Added new item to cart', newItem);
        }

        this.saveCart();
        this.updateCartCount();
        this.updateCartSummary();
        this.showNotification(`${product.name} added to cart!`);
    }

    // Remove product from cart
    removeFromCart(productId) {
        this.debug('removeFromCart() called for', productId);
        const product = this.products.find(p => String(p.id) === String(productId));
        const itemName = product ? product.name : 'Item';
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartCount();
        this.updateCartSummary();
        this.showNotification(`${itemName} removed from cart!`);
    }

    // Save cart to localStorage
    saveCart() {
        try {
            localStorage.setItem('cartState', JSON.stringify(this.cart));
            this.debug('saveCart() persisted cart', { cartLength: this.cart.length });
            this.updateCartCount();
            this.updateCartSummary();
        } catch (error) {
            this.error('Failed to save cart to localStorage:', error);
            this.showNotification('Error saving cart. Please try again.');
        }
    }

    // Update cart count display
    updateCartCount() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            const totalItems = this.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            cartCountElement.textContent = totalItems;
            this.debug('updateCartCount() updated cart count', { totalItems });
        } else {
            this.warn('updateCartCount: cart-count element not found');
        }
    }

    // Update cart summary dropdown
    updateCartSummary() {
        const cartItemsList = document.querySelector('.cart-items');
        if (!cartItemsList) {
            this.warn('updateCartSummary: cart-items element not found');
            return;
        }

        if (this.cart.length === 0) {
            cartItemsList.innerHTML = '<li class="cart-empty">Your cart is empty</li>';
            this.debug('updateCartSummary: displayed empty cart message');
            return;
        }

        const totalPrice = this.cart.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);

        cartItemsList.innerHTML = this.cart.map(item => {
            const price = parseFloat(item.price) || 0;
            const total = (price * (item.quantity || 1)).toLocaleString();
            return `
                <li class="cart-item" data-product-id="${item.id}">
                    <img src="${item.image || 'Image/placeholder.jpg'}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name || 'Unknown Product'}</span>
                        <span class="cart-item-quantity">Qty: ${item.quantity || 1}</span>
                        <span class="cart-item-price">৳${price.toLocaleString()} x ${item.quantity || 1} = ৳${total}</span>
                        <button class="cart-item-remove" onclick="window.gallery.removeFromCart('${item.id}')">Remove</button>
                    </div>
                </li>
            `;
        }).join('') + `
            <li class="cart-total">
                <span>Total: ৳${totalPrice.toLocaleString()}</span>
            </li>
        `;
        this.debug('updateCartSummary: rendered cart items with total', { cartLength: this.cart.length, totalPrice });
    }

    // --- Navigation and URL Handling ---
    // Update URL with current filters
    updateURL() {
        const params = new URLSearchParams();
        if (this.currentFilters.category !== 'all') params.set('category', this.currentFilters.category);
        if (this.currentFilters.subcategory) params.set('subcategory', this.currentFilters.subcategory);
        if (this.currentFilters.subsubcategory) params.set('subsubcategory', this.currentFilters.subsubcategory);
        if (this.currentFilters.search) params.set('search', this.currentFilters.search);
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState(null, '', newUrl);
        this.debug('updateURL() pushed new URL', newUrl);
    }

    // Handle URL parameters for navigation
    handleURLParameters() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        const subcategory = params.get('subcategory');
        const subsubcategory = params.get('subsubcategory');
        const search = params.get('search');

        this.debug('handleURLParameters() parsed', { category, subcategory, subsubcategory, search });

        if (category || subcategory || subsubcategory) {
            this.currentFilters.category = category || 'all';
            this.currentFilters.subcategory = subcategory || null;
            this.currentFilters.subsubcategory = subsubcategory || null;
            this.loadProducts(category, subcategory, subsubcategory);
            const activeCategory = subsubcategory || subcategory || category;
            const categoryElement = document.querySelector(`[data-category="${activeCategory}"]`);
            if (categoryElement) {
                document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
                categoryElement.classList.add('active');
            }
        }

        if (search) {
            this.currentFilters.search = search.toLowerCase();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = search;
            this.applyFilters();
        }

        this.updateBreadcrumb();
    }

    // Update breadcrumb navigation
    updateBreadcrumb() {
        const breadcrumbList = document.querySelector('.breadcrumb-list');
        if (!breadcrumbList) {
            this.warn('Breadcrumb list not found');
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const category = this.currentFilters.category !== 'all' ? this.currentFilters.category : params.get('category');
        const subcategory = this.currentFilters.subcategory || params.get('subcategory');
        const subsubcategory = this.currentFilters.subsubcategory || params.get('subsubcategory');

        const breadcrumbs = ['<li><a href="Product.html">Home</a></li>'];

        if (category && category !== 'all') {
            const categoryName = this.getCategoryDisplayName(category);
            breadcrumbs.push(`<li><a href="Product.html?category=${encodeURIComponent(category)}">${categoryName}</a></li>`);
        }

        if (subcategory && subcategory !== 'all') {
            const subcategoryName = this.getCategoryDisplayName(subcategory);
            breadcrumbs.push(`<li><a href="Product.html?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}">${subcategoryName}</a></li>`);
        }

        if (subsubcategory && subsubcategory !== 'all') {
            const subsubcategoryName = this.getCategoryDisplayName(subsubcategory);
            breadcrumbs.push(`<li class="current">${subsubcategoryName}</li>`);
        } else if (subcategory && subcategory !== 'all') {
            const subcategoryName = this.getCategoryDisplayName(subcategory);
            breadcrumbs.push(`<li class="current">${subcategoryName}</li>`);
        } else if (category && category !== 'all') {
            const categoryName = this.getCategoryDisplayName(category);
            breadcrumbs.push(`<li class="current">${categoryName}</li>`);
        } else {
            breadcrumbs.push('<li class="current">All Products</li>');
        }

        breadcrumbList.innerHTML = breadcrumbs.join('');
        this.debug('updateBreadcrumb() updated', { category, subcategory, subsubcategory });
    }

    // --- Specifications Handling ---
    // Update specification filters UI
    updateSpecificationFilters() {
        this.debug('updateSpecificationFilters() building spec UI from products', { productsCount: this.products.length });
        const specContent = document.getElementById('specificationContent');
        if (!specContent) {
            this.warn('Specification content element not found');
            return;
        }

        const specs = {};
        this.products.forEach(product => {
            if (product.specifications) {
                Object.keys(product.specifications).forEach(key => {
                    if (!specs[key]) specs[key] = new Set();
                    specs[key].add(product.specifications[key]);
                });
            }
        });

        let html = '';
        Object.keys(specs).forEach(specKey => {
            const values = Array.from(specs[specKey]).filter(v => v && v !== '');
            if (values.length > 1) {
                html += `
                    <div class="spec-group">
                        <h4>${this.formatSpecName(specKey)}</h4>
                        <div class="spec-options">
                            ${values.map(value => `
                                <label class="spec-checkbox">
                                    <input type="checkbox" 
                                           data-spec-key="${specKey}" 
                                           data-spec-value="${value}"
                                           onchange="window.gallery.handleSpecificationChange(this)">
                                    <span class="checkmark"></span>
                                    ${value}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });
        specContent.innerHTML = html;
    }

    // Handle specification filter changes
    handleSpecificationChange(checkbox) {
        const specKey = checkbox.dataset.specKey;
        const specValue = checkbox.dataset.specValue;
        this.debug('Specification change', { specKey, specValue, checked: checkbox.checked });

        if (!this.currentFilters.specifications[specKey]) {
            this.currentFilters.specifications[specKey] = [];
        }

        if (checkbox.checked) {
            if (!this.currentFilters.specifications[specKey].includes(specValue)) {
                this.currentFilters.specifications[specKey].push(specValue);
            }
        } else {
            this.currentFilters.specifications[specKey] = this.currentFilters.specifications[specKey].filter(v => v !== specValue);
            if (this.currentFilters.specifications[specKey].length === 0) {
                delete this.currentFilters.specifications[specKey];
            }
        }

        this.applyFilters();
    }

    // Clear all specification filters
    clearSpecifications() {
        this.debug('clearSpecifications() called');
        this.currentFilters.specifications = {};
        const checkboxes = document.querySelectorAll('#specificationContent input[type="checkbox"]');
        checkboxes.forEach(checkbox => (checkbox.checked = false));
        this.applyFilters();
    }

    // --- Utility Methods ---
    // Find parent category for subcategory
    findParentCategory(element) {
        let current = element.previousElementSibling;
        while (current) {
            if (!current.classList.contains('subcategory') && !current.classList.contains('sub-subcategory')) {
                return current.dataset.category || 'Construction';
            }
            current = current.previousElementSibling;
        }
        return 'Construction';
    }

    // Find full category hierarchy for sub-subcategory
    findFullCategoryHierarchy(element) {
        let subCategory = null;
        let mainCategory = null;
        let current = element.previousElementSibling;
        while (current) {
            if (current.classList.contains('subcategory')) {
                subCategory = current.dataset.category;
                break;
            }
            current = current.previousElementSibling;
        }
        current = element.previousElementSibling;
        while (current) {
            if (!current.classList.contains('subcategory') && !current.classList.contains('sub-subcategory')) {
                mainCategory = current.dataset.category;
                break;
            }
            current = current.previousElementSibling;
        }
        if (!mainCategory) mainCategory = 'Construction';
        return { mainCategory, subCategory };
    }

    // Format specification name for display
    formatSpecName(name) {
        return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    // Get display name for category
    getCategoryDisplayName(category) {
        const displayNames = {
            'Construction': 'Construction Materials',
            'Civil Work': 'Civil Work',
            'cement': 'Cement',
            'Sand': 'Sand',
            'Brick': 'Brick',
            'Reinforcement': 'Reinforcement',
            'interior': 'Interior Materials',
            'Tiles': 'Tiles',
            'Wood': 'Wood',
            'FAccessories': 'Furniture Accessories',
            'DAccessories': 'Door Accessories',
            'MHardware': 'Misc Hardware',
            'Lock': 'Lock',
            'Mirror': 'Mirror',
            'Paint': 'Paint',
            'Waterproofing': 'Waterproofing',
            'Interior': 'Interior',
            'Exterior': 'Exterior',
            'Enamel': 'Enamel Paints',
            'WoodCoating': 'Wood Coating',
            'electronics': 'Electronics',
            'MK': 'MK Switch',
            'Universal': 'Universal Socket',
            'Gang': 'Gang Box',
            'PVCConduit': 'PVC Conduit',
            'Cable': 'Cable',
            'FanBox': 'Fan Box',
            'LightBox': 'Light Box',
            'PVCBand': 'PVC Band',
            'Holder': 'Holder',
            'OtherEssentialItems': 'Other Essential Items',
            'Sanitary': 'Sanitary',
            'Fittings': 'Fittings',
            'Fixture': 'Fixture',
            'Pump': 'Pump'
        };
        return displayNames[category] || category;
    }

    // Get count of active filters
    getActiveFilterCount() {
        let count = 0;
        if (this.currentFilters.category !== 'all') count++;
        if (this.currentFilters.subcategory) count++;
        if (this.currentFilters.subsubcategory) count++;
        if (this.currentFilters.search) count++;
        if (this.currentFilters.priceRange < 100000) count++;
        count += Object.keys(this.currentFilters.specifications).length;
        return count;
    }

    // Show/hide loading indicator
    showLoading(show) {
        const loading = document.querySelector('.loading');
        const productGrid = document.getElementById('productGrid');
        if (loading && productGrid) {
            if (show) {
                loading.style.display = 'flex';
                productGrid.style.display = 'none';
            } else {
                loading.style.display = 'none';
                productGrid.style.display = 'grid';
            }
            this.debug('showLoading()', show);
        } else {
            this.warn('Loading or product grid element not found');
        }
    }

    // Show error message in UI
    showError(message) {
        this.error('showError()', message);
        const productGrid = document.getElementById('productGrid');
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="window.gallery.init()" class="btn-retry">Try Again</button>
                </div>
            `;
        } else {
            this.warn('Product grid element not found for error display');
        }
    }

    // Show temporary notification
    showNotification(message) {
        this.debug('showNotification()', message);
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Debounce function to limit rate of execution
    debounce(func, wait) {
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

    // Show quick view modal for product
    quickView(productId) {
        this.debug('quickView() for', productId);
        const product = this.products.find(p => String(p.id) === String(productId));
        if (!product) {
            this.warn('quickView: product not found', productId);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal quick-view-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <div class="quick-view-content">
                    <div class="quick-view-image">
                        <img src="${(product.images && product.images.length > 0) ? product.images[0] : (product.image || product.imageUrl || 'Image/placeholder.jpg')}" 
                     alt="${product.name}" 
                     onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='Image/placeholder.jpg';}else{this.onerror=null;}">
                    </div>
                    <div class="quick-view-details">
                        <h2>${product.name}</h2>
                        <p class="category">${product.category}${product.subcategory ? ' > ' + product.subcategory : ''}${product.subsubcategory ? ' > ' + product.subsubcategory : ''}</p>
                        <div class="price">৳${(parseFloat(product.price) || 0).toLocaleString()}</div>
                        <p class="description">${product.description || 'No description available.'}</p>
                        ${product.specifications ? this.renderAllSpecifications(product.specifications) : ''}
                        <div class="actions">
                            <button class="btn-add-cart" onclick="window.gallery.addToCart('${product.id}');this.closest('.modal').remove();"
                                    ${product.stock <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                            <button class="btn-view-details" onclick="window.gallery.viewProductDetails('${product.id}');this.closest('.modal').remove();">
                                View Full Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Navigate to product details page
    viewProductDetails(productId) {
        this.info('viewProductDetails() navigating to details for', productId);
        window.location.href = `Details.html?id=${productId}`;
    }

    // Setup listeners for product cards
    setupProductCardListeners() {
        const productCards = document.querySelectorAll('.product-card');
        if (productCards.length > 0) {
            productCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) {
                        const productId = card.dataset.productId;
                        this.debug('product card clicked, navigating to details', productId);
                        this.viewProductDetails(productId);
                    }
                });
            });
        } else {
            this.warn('No product cards found for listeners');
        }
    }

    // Update filter stats
    updateStats() {
        const productCount = document.getElementById('productCount');
        const activeFilters = document.getElementById('activeFilters');
        if (productCount) {
            productCount.textContent = `${this.filteredProducts.length} products found`;
        } else {
            this.warn('Product count element not found');
        }
        if (activeFilters) {
            const filterCount = this.getActiveFilterCount();
            activeFilters.textContent = filterCount > 0 ? `${filterCount} filters active` : '';
        } else {
            this.warn('Active filters element not found');
        }
        this.debug('updateStats() updated UI stats', { found: this.filteredProducts.length, activeFilters: this.getActiveFilterCount() });
    }
}

// === Navigation Scroll Handling ===
const navbar = document.querySelector('.navbar') || null;
const menuSection = document.querySelector('.menu-section') || null;

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
        if (window.innerWidth > 768) {
            const navItems = navLinksWrapper.querySelectorAll('.nav-item, .dropdown-item');
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

initNavigation();