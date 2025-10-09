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
        this.apiBase = 'https://archimartbd.com/product.json';
        this.cart = JSON.parse(localStorage.getItem('cartState')) || [];
        this.init();
    }

    async init() {
        try {
            await this.loadProducts();
            this.setupEventListeners();
            this.updateDisplay();
            this.updateBreadcrumb();
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            this.showError('Failed to load products. Please try again later.');
        }
    }

    async loadProducts(category = null, subcategory = null, subsubcategory = null) {
        this.showLoading(true);
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
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.products = Array.isArray(data) ? data : data.products || [];
            this.filteredProducts = [...this.products];
            this.updateSpecificationFilters();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products. Please check your connection.');
        } finally {
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links-wrapper');
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        const priceRange = document.getElementById('priceRange');
        const maxPriceDisplay = document.getElementById('maxPrice');
        if (priceRange && maxPriceDisplay) {
            priceRange.addEventListener('input', (e) => {
                const value = e.target.value;
                maxPriceDisplay.textContent = `৳${parseInt(value).toLocaleString()}`;
                this.currentFilters.priceRange = parseInt(value);
                this.debounce(() => this.applyFilters(), 300)();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.debounce(() => this.applyFilters(), 300)();
            });
        }

        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const category = item.dataset.category;
                this.handleCategoryClick(item, category);
            });
        });

        this.handleURLParameters();
        window.addEventListener('popstate', () => this.handleURLParameters());
    }

    handleCategoryClick(item, category) {
        document.querySelectorAll('.category-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');

        const isMainCategory = !item.classList.contains('subcategory') && !item.classList.contains('sub-subcategory');
        const isSubcategory = item.classList.contains('subcategory');
        const isSubSubcategory = item.classList.contains('sub-subcategory');

        if (isMainCategory) {
            this.currentFilters.category = category;
            this.currentFilters.subcategory = null;
            this.currentFilters.subsubcategory = null;
            this.loadProducts(category);
        } else if (isSubcategory) {
            const parentCategory = this.findParentCategory(item);
            this.currentFilters.category = parentCategory;
            this.currentFilters.subcategory = category;
            this.currentFilters.subsubcategory = null;
            this.loadProducts(parentCategory, category);
        } else if (isSubSubcategory) {
            const { mainCategory, subCategory } = this.findFullCategoryHierarchy(item);
            this.currentFilters.category = mainCategory;
            this.currentFilters.subcategory = subCategory;
            this.currentFilters.subsubcategory = category;
            this.loadProducts(mainCategory, subCategory, category);
        } else {
            this.currentFilters.category = 'all';
            this.currentFilters.subcategory = null;
            this.currentFilters.subsubcategory = null;
            this.loadProducts();
        }

        this.updateURL();
        this.updateBreadcrumb();
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
        this.currentFilters.specifications = {};
        const checkboxes = document.querySelectorAll('#specificationContent input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        this.applyFilters();
    }

    applyFilters() {
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
        this.updateDisplay();
        this.updateStats();
    }

    sortProducts(products) {
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
            productGrid.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }
        if (noResults) noResults.style.display = 'none';
        productGrid.style.display = 'grid';
        productGrid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
        this.setupProductCardListeners();
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
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='Image/placeholder.jpg'">
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
                    this.viewProductDetails(productId);
                }
            });
        });
    }

    quickView(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        const modal = document.createElement('div');
        modal.className = 'modal quick-view-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <div class="quick-view-content">
                    <div class="quick-view-image">
                        <img src="${product.image || product.imageUrl || 'Image/placeholder.jpg'}" 
                             alt="${product.name}" onerror="this.src='Image/placeholder.jpg'">
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

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.stock <= 0) return;
        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.image || product.imageUrl,
                quantity: 1,
                category: product.category,
                subcategory: product.subcategory,
                subsubcategory: product.subsubcategory
            });
        }
        this.saveCart();
        this.showNotification(`${product.name} added to cart!`);
    }

    saveCart() {
        localStorage.setItem('cartState', JSON.stringify(this.cart));
    }

    viewProductDetails(productId) {
        window.location.href = `Details.html?id=${productId}`;
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
    }

    handleURLParameters() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        const subcategory = params.get('subcategory');
        const subsubcategory = params.get('subsubcategory');
        const search = params.get('search');

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
    }

    showError(message) {
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