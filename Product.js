// === Global Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new ProductGallery();
});

window.addEventListener('popstate', () => {
    if (window.gallery) {
        window.gallery.handleURLParameters();
    }
});

// === ProductGallery Class ===
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
        this.debugEnabled = true;
        this.cartHideTimeout = null;

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

    // === ENHANCED: Product Loading with Variant Support ===
    async loadProducts(category = null, subcategory = null, subsubcategory = null) {
        this.debug('loadProducts() called', { category, subcategory, subsubcategory });
        this.showLoading(true);
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters.specifications = {};

        try {
            // RESTORED: Original URL building logic with category filters
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
            // Handle new API structure with products array
            this.products = Array.isArray(data) ? data : (data.products || []);
            
            // Process each product to add variant metadata
            this.products = this.products.map(product => this.processProductVariants(product));
            
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

    // === NEW: Process product variants ===
    processProductVariants(product) {
        const processed = { ...product };
        
        // Calculate total stock from all variants
        let totalStock = 0;
        
        if (product.colors && product.colors.length > 0) {
            totalStock = product.colors.reduce((sum, color) => sum + (color.stock || 0), 0);
            processed.hasColors = true;
            processed.defaultVariant = 'color';
        }
        
        if (product.sizes && product.sizes.length > 0) {
            if (totalStock === 0) {
                totalStock = product.sizes.reduce((sum, size) => sum + (size.stock || 0), 0);
            }
            processed.hasSizes = true;
            if (!processed.defaultVariant) {
                processed.defaultVariant = 'size';
            }
        }
        
        // If no variants, assume single product with unlimited stock
        if (!processed.hasColors && !processed.hasSizes) {
            totalStock = 999;
        }
        
        processed.totalStock = totalStock;
        processed.inStock = totalStock > 0;
        
        return processed;
    }

    // === NEW: Get effective price for variant ===
    getVariantPrice(product, variantType = null, variantValue = null) {
        const basePrice = parseFloat(product.price) || 0;
        
        if (!variantType || !variantValue) {
            return basePrice;
        }
        
        if (variantType === 'color' && product.colors) {
            const color = product.colors.find(c => c.color === variantValue);
            if (color && color.price > 0) {
                return parseFloat(color.price);
            }
        }
        
        if (variantType === 'size' && product.sizes) {
            const size = product.sizes.find(s => s.size === variantValue);
            if (size && size.price > 0) {
                return parseFloat(size.price);
            }
        }
        
        return basePrice;
    }

    // === NEW: Get variant stock ===
    getVariantStock(product, variantType = null, variantValue = null) {
        if (!variantType || !variantValue) {
            return product.totalStock || 0;
        }
        
        if (variantType === 'color' && product.colors) {
            const color = product.colors.find(c => c.color === variantValue);
            return color ? (color.stock || 0) : 0;
        }
        
        if (variantType === 'size' && product.sizes) {
            const size = product.sizes.find(s => s.size === variantValue);
            return size ? (size.stock || 0) : 0;
        }
        
        return 0;
    }

    // === NEW: Get variant images ===
    getVariantImages(product, variantType = null, variantValue = null) {
        if (!variantType || !variantValue) {
            return product.images || [];
        }
        
        let variantImages = [];
        
        if (variantType === 'color' && product.colors) {
            const color = product.colors.find(c => c.color === variantValue);
            if (color && color.images) {
                variantImages = color.images;
            }
        }
        
        if (variantType === 'size' && product.sizes) {
            const size = product.sizes.find(s => s.size === variantValue);
            if (size && size.images) {
                variantImages = size.images;
            }
        }
        
        return variantImages.length > 0 ? variantImages : (product.images || []);
    }

    // === RESTORED: Apply Filters with all original logic ===
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

    // === RESTORED: Sort Products ===
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

    // === RESTORED: Update Display ===
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

    // === ENHANCED: Product Card with Variants ===
    createProductCard(product) {
        const basePrice = parseFloat(product.price) || 0;
        const discount = parseFloat(product.discount) || 0;
        const finalPrice = basePrice - discount;
        
        const formattedPrice = finalPrice > 0 ? `৳${finalPrice.toLocaleString()}` : 'Price on request';
        const hasDiscount = discount > 0;
        
        // Get first available image
        let imageUrl = 'Image/placeholder.jpg';
        if (product.images && product.images.length > 0) {
            imageUrl = product.images[0];
        } else if (product.colors && product.colors.length > 0 && product.colors[0].images && product.colors[0].images.length > 0) {
            imageUrl = product.colors[0].images[0];
        } else if (product.sizes && product.sizes.length > 0 && product.sizes[0].images && product.sizes[0].images.length > 0) {
            imageUrl = product.sizes[0].images[0];
        }
        
        const availability = product.inStock ? 'In Stock' : 'Out of Stock';
        const stockClass = product.inStock ? 'in-stock' : 'out-stock';
        
        // Show variant count if applicable
        let variantInfo = '';
        if (product.hasColors) {
            variantInfo += `<span class="variant-badge"><i class="fas fa-palette"></i> ${product.colors.length} colors</span>`;
        }
        if (product.hasSizes) {
            variantInfo += `<span class="variant-badge"><i class="fas fa-ruler"></i> ${product.sizes.length} sizes</span>`;
        }
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" 
                         onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='Image/placeholder.jpg';}else{this.onerror=null;}">
                    ${hasDiscount ? `<div class="discount-badge">-${Math.round((discount/basePrice)*100)}%</div>` : ''}
                    <div class="product-overlay">
                        <button class="btn-add-cart" onclick="event.stopPropagation();window.gallery.${product.hasColors || product.hasSizes ? 'showVariantSelector' : 'addToCart'}('${product.id}')" 
                                ${!product.inStock ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> ${product.hasColors || product.hasSizes ? 'Select Options' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category || ''}${product.subcategory ? ' > ' + product.subcategory : ''}${product.subsubcategory ? ' > ' + product.subsubcategory : ''}</p>
                    ${variantInfo ? `<div class="variant-info">${variantInfo}</div>` : ''}
                    <div class="product-price">
                        ${hasDiscount ? `<span class="original-price">৳${basePrice.toLocaleString()}</span>` : ''}
                        ${formattedPrice}
                    </div>
                </div>
            </div>
        `;
    }

    // === RESTORED: Render Specifications ===
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

    // === RESTORED: Setup Event Listeners ===
    setupEventListeners() {
        this.debug('setupEventListeners() start');

        // // Hamburger menu toggle
        // const hamburger = document.querySelector('.hamburger');
        // const navLinks = document.querySelector('.nav-links-wrapper');
        // if (hamburger && navLinks) {
        //     hamburger.addEventListener('click', (e) => {
        //         e.stopPropagation();
        //         navLinks.classList.toggle('active');
        //         hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
        //         this.debug('Hamburger clicked - toggled nav-links-wrapper');
        //     });
        // } 

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
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.debug('Search input changed', this.currentFilters.search);
                this.debounce(() => this.applyFilters(), 300)();
            });
        }

        // Sort selection
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.debug('Sort changed to', this.currentFilters.sortBy);
                this.applyFilters();
            });
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
        }

        this.handleURLParameters();
        window.addEventListener('popstate', () => {
            this.debug('popstate event received');
            this.handleURLParameters();
        });

        this.debug('setupEventListeners() done');
    }

    // === RESTORED: Setup Cart Listeners ===
    setupCartListeners() {
        const cartIcon = document.querySelector('.cart-icon');
        const cartDropdown = document.querySelector('.cart-dropdown');
        if (cartIcon && cartDropdown) {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            if (!isTouchDevice) {
                cartIcon.addEventListener('pointerenter', () => {
                    clearTimeout(this.cartHideTimeout);
                    cartDropdown.classList.add('active');
                    this.updateCartSummary();
                });

                cartDropdown.addEventListener('pointerenter', () => {
                    clearTimeout(this.cartHideTimeout);
                });

                cartIcon.addEventListener('pointerleave', () => {
                    this.cartHideTimeout = setTimeout(() => {
                        cartDropdown.classList.remove('active');
                    }, 300);
                });

                cartDropdown.addEventListener('pointerleave', () => {
                    this.cartHideTimeout = setTimeout(() => {
                        cartDropdown.classList.remove('active');
                    }, 300);
                });
            } else {
                cartIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cartDropdown.classList.toggle('active');
                    this.updateCartSummary();
                });
            }

            document.addEventListener('click', (e) => {
                if (!cartDropdown.contains(e.target) && !cartIcon.contains(e.target)) {
                    cartDropdown.classList.remove('active');
                }
            });
        }
    }

    // === RESTORED: Handle Category Click ===
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

    // === NEW: Show Variant Selector Modal ===
    showVariantSelector(productId) {
        this.debug('showVariantSelector() for', productId);
        const product = this.products.find(p => String(p.id) === String(productId));
        if (!product) {
            this.warn('Product not found', productId);
            return;
        }

        // If no variants, add directly to cart
        if (!product.hasColors && !product.hasSizes) {
            this.addToCart(productId);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal variant-selector-modal';
        
        const colorOptions = product.colors?.map(color => `
            <label class="variant-option ${color.stock <= 0 ? 'out-of-stock' : ''}">
                <input type="radio" name="color" value="${color.color}" 
                       ${color.stock <= 0 ? 'disabled' : ''} 
                       data-price="${color.price || 0}" 
                       data-stock="${color.stock || 0}">
                <span class="variant-label">
                    <span class="variant-name">${color.color}</span>
                    <span class="variant-stock">${color.stock > 0 ? `Stock: ${color.stock}` : 'Out of Stock'}</span>
                    ${color.price > 0 ? `<span class="variant-price">৳${parseFloat(color.price).toLocaleString()}</span>` : ''}
                </span>
            </label>
        `).join('') || '';

        const sizeOptions = product.sizes?.map(size => `
            <label class="variant-option ${size.stock <= 0 ? 'out-of-stock' : ''}">
                <input type="radio" name="size" value="${size.size}" 
                       ${size.stock <= 0 ? 'disabled' : ''} 
                       data-price="${size.price || 0}" 
                       data-stock="${size.stock || 0}">
                <span class="variant-label">
                    <span class="variant-name">${size.size}</span>
                    <span class="variant-stock">${size.stock > 0 ? `Stock: ${size.stock}` : 'Out of Stock'}</span>
                    ${size.price > 0 ? `<span class="variant-price">৳${parseFloat(size.price).toLocaleString()}</span>` : ''}
                </span>
            </label>
        `).join('') || '';

        modal.innerHTML = `
            <div class="modal-content variant-modal-content">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Select Options for ${product.name}</h2>
                <div class="variant-sections">
                    ${product.hasColors ? `
                        <div class="variant-section">
                            <h3>Choose Color:</h3>
                            <div class="variant-options">${colorOptions}</div>
                        </div>
                    ` : ''}
                    ${product.hasSizes ? `
                        <div class="variant-section">
                            <h3>Choose Size:</h3>
                            <div class="variant-options">${sizeOptions}</div>
                        </div>
                    ` : ''}
                </div>
                <div class="variant-summary">
                    <div class="selected-price">Price: ৳${parseFloat(product.price).toLocaleString()}</div>
                    <div class="selected-stock">Please select options</div>
                </div>
                <button class="btn-confirm-variant" onclick="window.gallery.addVariantToCart('${product.id}', this.closest('.modal'))">
                    Add to Cart
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Update price and stock when variant selected
        const updateSummary = () => {
            const selectedColor = modal.querySelector('input[name="color"]:checked');
            const selectedSize = modal.querySelector('input[name="size"]:checked');
            const priceEl = modal.querySelector('.selected-price');
            const stockEl = modal.querySelector('.selected-stock');
            const confirmBtn = modal.querySelector('.btn-confirm-variant');

            let price = parseFloat(product.price);
            let stock = 0;
            let canAdd = false;

            if (product.hasColors && selectedColor) {
                const colorPrice = parseFloat(selectedColor.dataset.price);
                if (colorPrice > 0) price = colorPrice;
                stock = parseInt(selectedColor.dataset.stock);
                canAdd = !product.hasSizes || selectedSize;
            } else if (product.hasSizes && selectedSize) {
                const sizePrice = parseFloat(selectedSize.dataset.price);
                if (sizePrice > 0) price = sizePrice;
                stock = parseInt(selectedSize.dataset.stock);
                canAdd = !product.hasColors || selectedColor;
            }

            priceEl.textContent = `Price: ৳${price.toLocaleString()}`;
            
            if (canAdd) {
                stockEl.textContent = stock > 0 ? `Stock: ${stock} available` : 'Out of Stock';
                confirmBtn.disabled = stock <= 0;
            } else {
                stockEl.textContent = 'Please select all options';
                confirmBtn.disabled = true;
            }
        };

        modal.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', updateSummary);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // === NEW: Add Variant to Cart ===
    addVariantToCart(productId, modalElement) {
        const product = this.products.find(p => String(p.id) === String(productId));
        if (!product) return;

        const selectedColor = modalElement.querySelector('input[name="color"]:checked');
        const selectedSize = modalElement.querySelector('input[name="size"]:checked');

        // Validate selection
        if (product.hasColors && !selectedColor) {
            this.showNotification('Please select a color');
            return;
        }
        if (product.hasSizes && !selectedSize) {
            this.showNotification('Please select a size');
            return;
        }

        const variantData = {
            color: selectedColor ? selectedColor.value : null,
            size: selectedSize ? selectedSize.value : null,
            price: selectedColor ? selectedColor.dataset.price : (selectedSize ? selectedSize.dataset.price : product.price),
            stock: selectedColor ? selectedColor.dataset.stock : (selectedSize ? selectedSize.dataset.stock : 999)
        };

        // Create unique cart ID for variant
        const cartId = `${productId}_${variantData.color || 'none'}_${variantData.size || 'none'}`;
        
        const existingItem = this.cart.find(item => item.cartId === cartId);
        const maxStock = parseInt(variantData.stock);

        if (existingItem) {
            if (existingItem.quantity >= maxStock) {
                this.showNotification(`Maximum stock (${maxStock}) reached for this variant`);
                return;
            }
            existingItem.quantity += 1;
        } else {
            const newItem = {
                id: productId,
                cartId: cartId,
                name: product.name,
                price: parseFloat(variantData.price) > 0 ? variantData.price : product.price,
                image: this.getVariantImages(product, 
                    variantData.color ? 'color' : 'size', 
                    variantData.color || variantData.size)[0] || product.images?.[0] || 'Image/placeholder.jpg',
                quantity: 1,
                variant: {
                    color: variantData.color,
                    size: variantData.size
                },
                maxStock: maxStock,
                category: product.category,
                subcategory: product.subcategory,
                subsubcategory: product.subsubcategory
            };
            this.cart.push(newItem);
        }

        this.saveCart();
        this.updateCartCount();
        this.updateCartSummary();
        
        let variantText = product.name;
        if (variantData.color) variantText += ` (${variantData.color})`;
        if (variantData.size) variantText += ` (${variantData.size})`;
        
        this.showNotification(`${variantText} added to cart!`);
        modalElement.remove();
    }

    // === ENHANCED: Add to Cart (for non-variant products) ===
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

        if (!product.inStock) {
            this.warn('addToCart: product out of stock', productId);
            this.showNotification(`${product.name} is out of stock.`);
            return;
        }

        // If product has variants, show selector instead
        if (product.hasColors || product.hasSizes) {
            this.showVariantSelector(productId);
            return;
        }

        const existingItem = this.cart.find(item => item.id === productId && !item.variant);
        if (existingItem) {
            existingItem.quantity += 1;
            this.debug('Increased quantity for cart item', existingItem);
        } else {
            const newItem = {
                id: productId,
                cartId: productId,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || (product.image || product.imageUrl || 'Image/placeholder.jpg'),
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

    // === ENHANCED: Remove from Cart ===
    removeFromCart(cartId) {
        this.debug('removeFromCart() called for', cartId);
        const item = this.cart.find(i => i.cartId === cartId || i.id === cartId);
        const itemName = item ? item.name : 'Item';
        this.cart = this.cart.filter(i => i.cartId !== cartId && i.id !== cartId);
        this.saveCart();
        this.updateCartCount();
        this.updateCartSummary();
        this.showNotification(`${itemName} removed from cart!`);
    }

    // === RESTORED: Save Cart ===
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

    // === RESTORED: Update Cart Count ===
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

    // === ENHANCED: Update Cart Summary ===
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
            let variantText = '';
            if (item.variant) {
                if (item.variant.color) variantText += `Color: ${item.variant.color}`;
                if (item.variant.size) variantText += `${variantText ? ', ' : ''}Size: ${item.variant.size}`;
            }
            
            return `
                <li class="cart-item" data-cart-id="${item.cartId || item.id}">
                    <img src="${item.image || 'Image/placeholder.jpg'}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name || 'Unknown Product'}</span>
                        ${variantText ? `<span class="cart-item-variant">${variantText}</span>` : ''}
                        <span class="cart-item-quantity">Qty: ${item.quantity || 1}</span>
                        <span class="cart-item-price">৳${price.toLocaleString()} x ${item.quantity || 1} = ৳${total}</span>
                        <button class="cart-item-remove" onclick="window.gallery.removeFromCart('${item.cartId || item.id}')">Remove</button>
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

    // === RESTORED: Update URL ===
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

    // === RESTORED: Handle URL Parameters ===
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

    // === RESTORED: Update Breadcrumb ===
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

    // === RESTORED: Update Specification Filters ===
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

    // === RESTORED: Handle Specification Change ===
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

    // === RESTORED: Clear Specifications ===
    clearSpecifications() {
        this.debug('clearSpecifications() called');
        this.currentFilters.specifications = {};
        const checkboxes = document.querySelectorAll('#specificationContent input[type="checkbox"]');
        checkboxes.forEach(checkbox => (checkbox.checked = false));
        this.applyFilters();
    }

    // === RESTORED: Find Parent Category ===
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

    // === RESTORED: Find Full Category Hierarchy ===
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

    // === RESTORED: Format Spec Name ===
    formatSpecName(name) {
        return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    // === RESTORED: Get Category Display Name ===
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

    // === RESTORED: Get Active Filter Count ===
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

    // === RESTORED: Show Loading ===
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

    // === RESTORED: Show Error ===
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

    // === RESTORED: Show Notification ===
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

    // === RESTORED: Debounce ===
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

    // === RESTORED: Quick View ===
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
                            <button class="btn-add-cart" onclick="window.gallery.${product.hasColors || product.hasSizes ? 'showVariantSelector' : 'addToCart'}('${product.id}');this.closest('.modal').remove();"
                                    ${!product.inStock ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> ${product.hasColors || product.hasSizes ? 'Select Options' : 'Add to Cart'}
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

    // === RESTORED: View Product Details ===
    viewProductDetails(productId) {
        this.info('viewProductDetails() navigating to details for', productId);
        window.location.href = `Details.html?id=${productId}`;
    }

    // === RESTORED: Setup Product Card Listeners ===
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

    // === RESTORED: Update Stats ===
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

// === Variant Styles Injection ===
if (!document.getElementById('variant-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'variant-styles';
    styleEl.textContent = `
.variant-selector-modal .modal-content {
    max-width: 600px;
    padding: 2rem;
}
.variant-sections {
    margin: 2rem 0;
}
.variant-section {
    margin-bottom: 2rem;
}
.variant-section h3 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: #333;
}
.variant-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.variant-option {
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}
.variant-option:hover:not(.out-of-stock) {
    border-color: #007bff;
    background-color: #f8f9fa;
}
.variant-option.out-of-stock {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
}
.variant-option input[type="radio"] {
    margin-right: 1rem;
    cursor: pointer;
}
.variant-option input[type="radio"]:disabled {
    cursor: not-allowed;
}
.variant-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 1rem;
}
.variant-name {
    font-weight: 600;
    color: #333;
}
.variant-stock {
    font-size: 0.9rem;
    color: #666;
}
.variant-price {
    font-weight: 700;
    color: #007bff;
    margin-left: auto;
}
.variant-summary {
    margin: 2rem 0;
    padding: 1.5rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.selected-price {
    font-size: 1.5rem;
    font-weight: 700;
    color: #007bff;
}
.selected-stock {
    font-size: 0.95rem;
    color: #666;
}
.btn-confirm-variant {
    width: 100%;
    padding: 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s ease;
}
.btn-confirm-variant:hover:not(:disabled) {
    background-color: #0056b3;
}
.btn-confirm-variant:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}
.variant-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background-color: #e3f2fd;
    color: #1976d2;
    border-radius: 4px;
    font-size: 0.85rem;
    margin-right: 0.5rem;
    margin-top: 0.5rem;
}
.variant-badge i {
    margin-right: 0.25rem;
}
.discount-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: #ff4444;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.9rem;
    z-index: 1;
}
.original-price {
    text-decoration: line-through;
    color: #999;
    margin-right: 0.5rem;
    font-size: 0.9rem;
}
.cart-item-variant {
    display: block;
    font-size: 0.85rem;
    color: #666;
    margin-top: 0.25rem;
}
@media (max-width: 768px) {
    .variant-selector-modal .modal-content {
        max-width: 95%;
        padding: 1.5rem;
    }
    .variant-label {
        flex-wrap: wrap;
    }
    .variant-summary {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
}
    `;
    document.head.appendChild(styleEl);
}


function toggleSidebarDrawer() {
  document.querySelector('.sidebar-drawer').classList.toggle('open');
}
// close drawer when clicking outside
document.querySelector('.sidebar-drawer').addEventListener('click', e => {
  if (e.target === e.currentTarget) toggleSidebarDrawer();
});



// Mobile drawer toggle
function toggleDrawer() {
  document.getElementById('mobileDrawer').classList.toggle('open');
}

// Close when clicking outside
document.getElementById('mobileDrawer').addEventListener('click', function(e) {
  if (e.target === this) toggleDrawer();
});

// Close with ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') toggleDrawer();
});

// Sync mobile filters with desktop
document.addEventListener('DOMContentLoaded', () => {
  const desktopPrice = document.getElementById('priceRange');
  const mobilePrice = document.getElementById('priceRangeMobile');
  const desktopSearch = document.getElementById('searchInput');
  const mobileSearch = document.getElementById('searchInputMobile');
  const desktopSort = document.getElementById('sortBy');
  const mobileSort = document.getElementById('sortByMobile');

  // Sync price
  if (desktopPrice && mobilePrice) {
    desktopPrice.addEventListener('input', () => {
      mobilePrice.value = desktopPrice.value;
      document.getElementById('maxPriceMobile').textContent = '৳' + desktopPrice.value;
    });
    mobilePrice.addEventListener('input', () => {
      desktopPrice.value = mobilePrice.value;
      document.getElementById('maxPrice').textContent = '৳' + mobilePrice.value;
    });
  }

  // Sync search & sort
  if (desktopSearch) desktopSearch.addEventListener('input', () => mobileSearch.value = desktopSearch.value);
  if (mobileSearch) mobileSearch.addEventListener('input', () => desktopSearch.value = mobileSearch.value);
  if (desktopSort) desktopSort.addEventListener('change', () => mobileSort.value = desktopSort.value);
  if (mobileSort) mobileSort.addEventListener('change', () => desktopSort.value = mobileSort.value);
});

// Close mobile sidebar-drawer when a sidebar item is selected (mobile only)
document.addEventListener('click', function (e) {
    // only act on small screens where drawer is used
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    const drawer = document.querySelector('.sidebar-drawer');
    if (!drawer || !drawer.classList.contains('open')) return;

    // selectors that should close the drawer when clicked
    const closeSelectors = [
        '.sidebar a',
        '.category-item',
        '.subcategory',
        '.sub-subcategory',
        '.spec-options label',
        '.sidebar input[type="checkbox"]',
        '.sidebar input[type="radio"]'
    ];

    let node = e.target;
    while (node && node !== document) {
        if (node.matches && closeSelectors.some(sel => node.matches(sel))) {
            drawer.classList.remove('open');
            break;
        }
        node = node.parentNode;
    }
});