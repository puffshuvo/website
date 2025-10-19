class ProductGallery {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            category: 'all',
            subcategory: null,
            subsubcategory: null,
            priceRange: 100000,
            search: '',
            sortBy: 'name',
            specifications: {}
        };
        this.apiBase = 'https://archimartbd.com/api/product.json';
        this.cart = JSON.parse(localStorage.getItem('cartState')) || [];

        // Debugging toggle: set to false to silence debug logs
        this.debugEnabled = true;

        // Small helper logging functions
        this._log = (level, ...args) => {
            if (!this.debugEnabled) return;
            const prefix = `[Gallery][${new Date().toISOString()}]`;
            try {
                if (console && console[level]) {
                    console[level](prefix, ...args);
                } else {
                    console.log(prefix, ...args);
                }
            } catch (e) {
                // ignore logging errors
            }
        };
        this.debug = (...args) => this._log('debug', ...args);
        this.info = (...args) => this._log('info', ...args);
        this.warn = (...args) => this._log('warn', ...args);
        this.error = (...args) => this._log('error', ...args);

        this.debug('Constructor: starting initialization', { cartLength: this.cart.length, apiBase: this.apiBase });
        this.init();
    }

    async init() {
        this.debug('init() called with currentFilters', this.currentFilters);
        try {
            await this.loadProducts();
            this.setupEventListeners();
            this.updateDisplay();
            this.updateBreadcrumb();
            this.info('Gallery initialized successfully', { productsLoaded: this.products.length });
        } catch (error) {
            this.error('Failed to initialize gallery:', error);
            this.showError('Failed to load products. Please try again later.');
        }
    }

   async loadProducts(category = null, subcategory = null, subsubcategory = null) {
    this.debug('loadProducts() called', { category, subcategory, subsubcategory });
    this.showLoading(true);
    
    // ✅ EXPLICIT: Clear ALL previous data
    this.products = [];
    this.filteredProducts = [];
    this.currentFilters.specifications = {}; // Clear specs too
    
    try {
        let url = this.apiBase;
        const params = new URLSearchParams();
        if (category && category !== 'all') {
            params.append('category', category);
        }
        if (subcategory && subcategory !== 'all') {
            params.append('subcategory', subcategory);
        }
        if (subsubcategory && subsubcategory !== 'all') {
            params.append('subsubcategory', subsubcategory);
        }
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        this.debug('🔄 Fetching NEW products from URL', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.products = Array.isArray(data) ? data : data.products || [];
        
        // ✅ CRITICAL: If NO products returned, show empty state
        if (this.products.length === 0) {
            this.filteredProducts = [];
            this.debug('🚫 NO PRODUCTS found for', { category, subcategory, subsubcategory });
        } else {
            this.filteredProducts = [...this.products];
            this.debug('✅ Loaded NEW products', { count: this.products.length });
        }
        
        // Rebuild filters for NEW products only
        this.updateSpecificationFilters();
        this.applyFilters();
        
    } catch (error) {
        this.error('❌ Error loading products:', error);
        this.products = [];
        this.filteredProducts = [];
        this.showError(`No products found for "${category || 'All'}"`);
    } finally {
        this.showLoading(false);
    }
}
    setupEventListeners() {
        this.debug('setupEventListeners() start');
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links-wrapper');
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                this.debug('Hamburger clicked - toggled nav-links-wrapper');
            });
        }

        const priceRange = document.getElementById('priceRange');
        const maxPriceDisplay = document.getElementById('maxPrice');
        if (priceRange && maxPriceDisplay) {
            priceRange.addEventListener('input', (e) => {
                const value = e.target.value;
                maxPriceDisplay.textContent = `৳${parseInt(value).toLocaleString()}`;
                this.currentFilters.priceRange = parseInt(value);
                this.debug('Price range changed', this.currentFilters.priceRange);
                this.debounce(() => this.applyFilters(), 300)();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.debug('Search input changed', this.currentFilters.search);
                this.debounce(() => this.applyFilters(), 300)();
            });
        }

        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.debug('Sort changed to', this.currentFilters.sortBy);
                this.applyFilters();
            });
        }

        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const category = item.dataset.category;
                this.debug('Category item clicked', category, item.className);
                this.handleCategoryClick(item, category);
            });
        });

        this.handleURLParameters();
        window.addEventListener('popstate', () => {
            this.debug('popstate event received');
            this.handleURLParameters();
        });

        this.debug('setupEventListeners() done');
    }

    handleCategoryClick(item, category) {
    this.debug('🖱️ Category clicked', { category, type: item.className });
    
    // Clear all active states first
    document.querySelectorAll('.category-item').forEach(el => {
        el.classList.remove('active');
    });
    item.classList.add('active');

    const isMainCategory = !item.classList.contains('subcategory') && !item.classList.contains('sub-subcategory');
    const isSubcategory = item.classList.contains('subcategory');
    const isSubSubcategory = item.classList.contains('sub-subcategory');

    // ✅ EXPLICIT: Set filters and LOAD NEW DATA
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

    findParentCategory(element) {
        let current = element.previousElementSibling;
        while (current) {
            if (!current.classList.contains('subcategory') && !current.classList.contains('sub-subcategory')) {
                return current.dataset.category;
            }
            current = current.previousElementSibling;
        }
        return 'Construction';
    }

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

    updateSpecificationFilters() {
        this.debug('updateSpecificationFilters() building spec UI from products', { productsCount: this.products.length });
        const specContent = document.getElementById('specificationContent');
        if (!specContent) return;
        const specs = {};
        this.products.forEach(product => {
            if (product.specifications) {
                Object.keys(product.specifications).forEach(key => {
                    if (!specs[key]) {
                        specs[key] = new Set();
                    }
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
                                           onchange="gallery.handleSpecificationChange(this)">
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

    formatSpecName(name) {
        return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

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
            this.currentFilters.specifications[specKey] =
                this.currentFilters.specifications[specKey].filter(v => v !== specValue);
            if (this.currentFilters.specifications[specKey].length === 0) {
                delete this.currentFilters.specifications[specKey];
            }
        }
        this.applyFilters();
    }

    clearSpecifications() {
        this.debug('clearSpecifications() called');
        this.currentFilters.specifications = {};
        const checkboxes = document.querySelectorAll('#specificationContent input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        this.applyFilters();
    }

    applyFilters() {
        this.debug('applyFilters() currentFilters snapshot', JSON.parse(JSON.stringify(this.currentFilters)));
        let filtered = [...this.products];
        filtered = filtered.filter(product => {
            const price = parseFloat(product.price) || 0;
            return price <= this.currentFilters.priceRange;
        });
        if (this.currentFilters.search) {
            filtered = filtered.filter(product =>
                (product.name && product.name.toLowerCase().includes(this.currentFilters.search)) ||
                (product.description && product.description.toLowerCase().includes(this.currentFilters.search)) ||
                (product.category && product.category.toLowerCase().includes(this.currentFilters.search)) ||
                (product.subcategory && product.subcategory.toLowerCase().includes(this.currentFilters.search))
            );
        }
        Object.keys(this.currentFilters.specifications).forEach(specKey => {
            const specValues = this.currentFilters.specifications[specKey];
            if (specValues.length > 0) {
                filtered = filtered.filter(product => {
                    if (!product.specifications || !product.specifications[specKey]) {
                        return false;
                    }
                    return specValues.includes(product.specifications[specKey]);
                });
            }
        });
        this.sortProducts(filtered);
        this.filteredProducts = filtered;
        this.debug('applyFilters result count', this.filteredProducts.length);
        this.updateDisplay();
        this.updateStats();
    }

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

    updateDisplay() {
    const productGrid = document.getElementById('productGrid');
    const noResults = document.querySelector('.no-results');
    
    if (!productGrid) return;
    
    if (this.filteredProducts.length === 0) {
        // ✅ BETTER NO PRODUCTS MESSAGE
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
    
    // Show products
    if (noResults) noResults.style.display = 'none';
    productGrid.style.display = 'grid';
    productGrid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
    this.setupProductCardListeners();
    this.debug('✅ Displayed products', this.filteredProducts.length);
}

    createProductCard(product) {
        const price = parseFloat(product.price) || 0;
        const formattedPrice = price > 0 ? `৳${price.toLocaleString()}` : 'Price on request';
        const imageUrl = product.image || product.imageUrl || 'Image/placeholder.jpg';
        const availability = product.stock > 0 ? 'In Stock' : 'Out of Stock';
        const stockClass = product.stock > 0 ? 'in-stock' : 'out-stock';
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" onerror="if(!this.dataset.tried){this.dataset.tried='1'; this.src='Image/placeholder.jpg';} else {this.onerror=null;}">
                    <div class="product-overlay">
                        <button class="btn-quick-view" onclick="gallery.quickView('${product.id}')">
                            <i class="fas fa-eye"></i> Quick View
                        </button>
                        <button class="btn-add-cart" onclick="gallery.addToCart('${product.id}')" 
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

    setupProductCardListeners() {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const productId = card.dataset.productId;
                    this.debug('product card clicked, navigating to details', productId);
                    this.viewProductDetails(productId);
                }
            });
        });
    }

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
                        <img src="${product.image || product.imageUrl || 'Image/placeholder.jpg'}" 
                             alt="${product.name}" onerror="if(!this.dataset.tried){this.dataset.tried='1'; this.src='Image/placeholder.jpg';} else {this.onerror=null;}">
                    </div>
                    <div class="quick-view-details">
                        <h2>${product.name}</h2>
                        <p class="category">${product.category}${product.subcategory ? ' > ' + product.subcategory : ''}${product.subsubcategory ? ' > ' + product.subsubcategory : ''}</p>
                        <div class="price">৳${(parseFloat(product.price) || 0).toLocaleString()}</div>
                        <p class="description">${product.description || 'No description available.'}</p>
                        ${product.specifications ? this.renderAllSpecifications(product.specifications) : ''}
                        <div class="actions">
                            <button class="btn-add-cart" onclick="gallery.addToCart('${product.id}'); this.closest('.modal').remove();"
                                    ${product.stock <= 0 ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                            <button class="btn-view-details" onclick="gallery.viewProductDetails('${product.id}'); this.closest('.modal').remove();">
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
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

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
            image: product.image || product.imageUrl,
            quantity: 1,
            category: product.category,
            subcategory: product.subcategory,
            subsubcategory: product.subsubcategory
        };
        this.cart.push(newItem);
        this.debug('Added new item to cart', newItem);
    }

    this.saveCart();
    this.showNotification(`${product.name} added to cart!`);
}


    saveCart() {
        localStorage.setItem('cartState', JSON.stringify(this.cart));
        this.debug('saveCart() persisted cart', { cartLength: this.cart.length });
    }

    viewProductDetails(productId) {
        this.info('viewProductDetails() navigating to details for', productId);
        window.location.href = `https://archimartbd.com/details?id=${productId}`;
    }

    updateStats() {
        const productCount = document.getElementById('productCount');
        const activeFilters = document.getElementById('activeFilters');
        if (productCount) {
            productCount.textContent = `${this.filteredProducts.length} products found`;
        }
        if (activeFilters) {
            const filterCount = this.getActiveFilterCount();
            activeFilters.textContent = filterCount > 0 ? `${filterCount} filters active` : '';
        }
        this.debug('updateStats() updated UI stats', { found: this.filteredProducts.length, activeFilters: this.getActiveFilterCount() });
    }

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

    updateBreadcrumb() {
        const breadcrumbList = document.querySelector('.breadcrumb-list');
        if (!breadcrumbList) return;

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

    updateURL() {
        const params = new URLSearchParams();
        if (this.currentFilters.category !== 'all') {
            params.set('category', this.currentFilters.category);
        }
        if (this.currentFilters.subcategory) {
            params.set('subcategory', this.currentFilters.subcategory);
        }
        if (this.currentFilters.subsubcategory) {
            params.set('subsubcategory', this.currentFilters.subsubcategory);
        }
        if (this.currentFilters.search) {
            params.set('search', this.currentFilters.search);
        }
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState(null, '', newUrl);
        this.debug('updateURL() pushed new URL', newUrl);
    }

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
            if (searchInput) {
                searchInput.value = search;
            }
            this.applyFilters();
        }

        this.updateBreadcrumb();
    }

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
        }
        this.debug('showLoading()', show);
    }

    showError(message) {
        this.error('showError()', message);
        const productGrid = document.getElementById('productGrid');
        if (productGrid) {
            productGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="gallery.init()" class="btn-retry">Try Again</button>
                </div>
            `;
        }
    }

    showNotification(message) {
        this.debug('showNotification()', message);
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

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
}




document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new ProductGallery();
});

window.addEventListener('popstate', () => {
    if (window.gallery) {
        window.gallery.handleURLParameters();
    }
});



