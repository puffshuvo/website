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

        this.debug('Constructor: starting initialization', { cartLength: this.cart.length });
        this.init();
    }

    async init() {
        this.debug('init() called');
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
                this.debug('🚫 No products found');
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
            // If no colors, use sizes stock
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
            totalStock = 999; // Default stock for products without variants
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
        
        // Fallback to product images if no variant images
        return variantImages.length > 0 ? variantImages : (product.images || []);
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
                        
                        <button class="btn-add-cart" onclick="event.stopPropagation();window.gallery.showVariantSelector('${product.id}')" 
                                ${!product.inStock ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> ${product.hasColors || product.hasSizes ? 'Select Options' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${product.category || ''}${product.subcategory ? ' > ' + product.subcategory : ''}</p>
                    ${variantInfo ? `<div class="variant-info">${variantInfo}</div>` : ''}
                    <div class="product-price">
                        ${hasDiscount ? `<span class="original-price">৳${basePrice.toLocaleString()}</span>` : ''}
                        ${formattedPrice}
                    </div>
                    <div class="product-stock ${stockClass}">${availability}</div>
                </div>
            </div>
        `;
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
                maxStock: maxStock
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
                setTimeout(() => this.addToCart(productId, retries - 1), 500);
            }
            return;
        }

        const product = this.products.find(p => String(p.id) === String(productId));
        if (!product) {
            this.showNotification('Product not found');
            return;
        }

        if (!product.inStock) {
            this.showNotification(`${product.name} is out of stock`);
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
        } else {
            this.cart.push({
                id: productId,
                cartId: productId,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || 'Image/placeholder.jpg',
                quantity: 1
            });
        }

        this.saveCart();
        this.updateCartCount();
        this.updateCartSummary();
        this.showNotification(`${product.name} added to cart!`);
    }

    // === ENHANCED: Remove from Cart ===
    removeFromCart(cartId) {
        this.debug('removeFromCart() called for', cartId);
        const item = this.cart.find(i => i.cartId === cartId);
        const itemName = item ? item.name : 'Item';
        this.cart = this.cart.filter(i => i.cartId !== cartId);
        this.saveCart();
        this.updateCartCount();
        this.updateCartSummary();
        this.showNotification(`${itemName} removed from cart!`);
    }

    // === ENHANCED: Update Cart Summary ===
    updateCartSummary() {
        const cartItemsList = document.querySelector('.cart-items');
        if (!cartItemsList) return;

        if (this.cart.length === 0) {
            cartItemsList.innerHTML = '<li class="cart-empty">Your cart is empty</li>';
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
                <li class="cart-item" data-cart-id="${item.cartId}">
                    <img src="${item.image || 'Image/placeholder.jpg'}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name || 'Unknown Product'}</span>
                        ${variantText ? `<span class="cart-item-variant">${variantText}</span>` : ''}
                        <span class="cart-item-quantity">Qty: ${item.quantity || 1}</span>
                        <span class="cart-item-price">৳${price.toLocaleString()} x ${item.quantity || 1} = ৳${total}</span>
                        <button class="cart-item-remove" onclick="window.gallery.removeFromCart('${item.cartId}')">Remove</button>
                    </div>
                </li>
            `;
        }).join('') + `
            <li class="cart-total">
                <span>Total: ৳${totalPrice.toLocaleString()}</span>
            </li>
        `;
    }

    // [Rest of the methods remain the same: applyFilters, sortProducts, updateDisplay, 
    // setupEventListeners, saveCart, updateCartCount, etc.]
    
    applyFilters() {
        let filtered = [...this.products];
        filtered = filtered.filter(product => {
            const price = parseFloat(product.price) || 0;
            return price <= this.currentFilters.priceRange;
        });
        if (this.currentFilters.search) {
            filtered = filtered.filter(product =>
                (product.name && product.name.toLowerCase().includes(this.currentFilters.search)) ||
                (product.description && product.description.toLowerCase().includes(this.currentFilters.search))
            );
        }
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
        }
    }

    updateDisplay() {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) return;

        if (this.filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="no-products-message">
                    <i class="fas fa-search" style="font-size: 4rem; color: #ccc;"></i>
                    <h3>No Products Found</h3>
                </div>`;
            return;
        }

        productGrid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
        this.setupProductCardListeners();
    }

    setupEventListeners() {
        this.setupCartListeners();
        const priceRange = document.getElementById('priceRange');
        const maxPriceDisplay = document.getElementById('maxPrice');
        if (priceRange && maxPriceDisplay) {
            priceRange.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                maxPriceDisplay.textContent = `৳${value.toLocaleString()}`;
                this.currentFilters.priceRange = value;
                this.debounce(() => this.applyFilters(), 300)();
            });
        }
    }

    setupCartListeners() {
        const cartIcon = document.querySelector('.cart-icon');
        const cartDropdown = document.querySelector('.cart-dropdown');
        if (cartIcon && cartDropdown) {
            cartIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                cartDropdown.classList.toggle('active');
                this.updateCartSummary();
            });
            document.addEventListener('click', (e) => {
                if (!cartDropdown.contains(e.target) && !cartIcon.contains(e.target)) {
                    cartDropdown.classList.remove('active');
                }
            });
        }
    }

    saveCart() {
        try {
            localStorage.setItem('cartState', JSON.stringify(this.cart));
            this.updateCartCount();
            this.updateCartSummary();
        } catch (error) {
            this.error('Failed to save cart:', error);
        }
    }

    updateCartCount() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            const totalItems = this.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            cartCountElement.textContent = totalItems;
        }
    }

    setupProductCardListeners() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.viewProductDetails(card.dataset.productId);
                }
            });
        });
    }

    viewProductDetails(productId) {
        window.location.href = `Details.html?id=${productId}`;
    }

    quickView(productId) {
        const product = this.products.find(p => String(p.id) === String(productId));
        if (!product) return;
        // Implement quick view modal here
    }

    showLoading(show) {
        const loading = document.querySelector('.loading');
        const productGrid = document.getElementById('productGrid');
        if (loading && productGrid) {
            loading.style.display = show ? 'flex' : 'none';
            productGrid.style.display = show ? 'none' : 'grid';
        }
    }

    showError(message) {
        const productGrid = document.getElementById('productGrid');
        if (productGrid) {
            productGrid.innerHTML = `<div class="error-message"><h3>Error</h3><p>${message}</p></div>`;
        }
    }

    showNotification(message) {
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

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    updateStats() {
        const productCount = document.getElementById('productCount');
        if (productCount) {
            productCount.textContent = `${this.filteredProducts.length} products found`;
        }
    }

    updateBreadcrumb() {
        const breadcrumbList = document.querySelector('.breadcrumb-list');
        if (!breadcrumbList) return;
        breadcrumbList.innerHTML = '<li><a href="Product.html">Home</a></li>';
    }

    handleURLParameters() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        if (category) {
            this.currentFilters.category = category;
            this.loadProducts(category);
        }
    }
}

// === Quick View Modal Enhancement ===
// Add this CSS to your stylesheet for better variant display
const variantStyles = `
<style>
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
</style>
`;

// Inject styles if not already present
if (!document.getElementById('variant-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'variant-styles';
    styleEl.innerHTML = variantStyles;
    document.head.appendChild(styleEl);
}