let currentQuantity = 1;
let currentImageIndex = 0;
let productData = null;
let selectedOptions = {
    color: '',
    size: '',
    thickness: ''
};

function getCategoryDisplayName(category) {
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

function updateBreadcrumb() {
    const breadcrumbList = document.getElementById('breadcrumbList');
    if (!breadcrumbList || !productData) return;

    const breadcrumbs = ['<li><a href="index.html">Home</a></li>'];

    if (productData.category) {
        const categoryName = getCategoryDisplayName(productData.category);
        breadcrumbs.push(`<li><a href="Construction.html?category=${encodeURIComponent(productData.category)}">${categoryName}</a></li>`);
    }

    if (productData.subcategory) {
        const subcategoryName = getCategoryDisplayName(productData.subcategory);
        breadcrumbs.push(`<li><a href="Construction.html?category=${encodeURIComponent(productData.category)}&subcategory=${encodeURIComponent(productData.subcategory)}">${subcategoryName}</a></li>`);
    }

    if (productData.subsubcategory) {
        const subsubcategoryName = getCategoryDisplayName(productData.subsubcategory);
        breadcrumbs.push(`<li><a href="Construction.html?category=${encodeURIComponent(productData.category)}&subcategory=${encodeURIComponent(productData.subcategory)}&subsubcategory=${encodeURIComponent(productData.subsubcategory)}">${subsubcategoryName}</a></li>`);
    }

    breadcrumbs.push(`<li class="current">${productData.name}</li>`);

    breadcrumbList.innerHTML = breadcrumbs.join('');
}

function loadProductData() {
    const urlParams = new URLSearchParams(window.location.search);
    let productId = urlParams.get('id') || '1';
    console.log('Product ID from URL:', productId);

    if (!productId) {
        console.error('No product ID found in URL');
        document.getElementById('productTitle').textContent = 'Error: Product Not Found';
        document.getElementById('productDescription').textContent = 'Please go back and select a product.';
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `api/single_product/${productId}`, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    productData = JSON.parse(xhr.responseText);
                    console.log('Loaded product data:', productData);

                    if (!productData || productData.error) {
                        console.error('Product not found');
                        document.getElementById('productTitle').textContent = 'Product Not Found';
                        document.getElementById('productDescription').textContent = 'This product is not available.';
                        return;
                    }

                    // Populate product details
                    document.getElementById('productTitle').textContent = productData.name || 'Unknown Product';
                    document.getElementById('productPrice').textContent = `৳${(productData.price || 0).toFixed(2)} ${productData.currency || 'BDT'}`;
                    document.getElementById('productDescription').textContent = productData.description || 'No description available.';

                    const recommendationText = productData.recomended_text || productData.recomended_title || 'This product is recommended for its quality and suitability for construction projects.';
                    document.getElementById('recommendationText').textContent = recommendationText;

                    // Populate specifications
                    populateSpecifications();

                    // Populate similar products
                    populateSimilarProducts();

                    // Populate filter circles
                    populateFilterCircles();

                    // Set default images
                    updateImages();

                    // Update price and stock
                    updatePrice();
                    updateStockStatus();

                    // Update breadcrumb
                    updateBreadcrumb();
                    // Enable Add to Cart button after product loads
                    const addToCartBtn = document.getElementById('addToCartBtn');
                    if (addToCartBtn) {
                        addToCartBtn.onclick = () => {
                            const product = {
                                id: productData.id,
                                name: productData.name,
                                price: parseFloat(productData.price || 0),
                                image: productData.image || 'Image/placeholder.png',
                                quantity: parseInt(document.getElementById('quantity').textContent) || 1,
                            };

                            // Call your existing addToCart function
                            addToCart(product);

                            alert(`${product.name} added to cart!`);
                        };
                    }

                } catch (e) {
                    console.error('Error parsing JSON:', e);
                    document.getElementById('productTitle').textContent = 'Error Loading Product';
                }
            } else {
                console.error('Error fetching product data:', xhr.statusText);
                document.getElementById('productTitle').textContent = 'Error Loading Product';
            }
        }
    };
    xhr.onerror = () => {
        console.error('Network error while fetching product data');
        document.getElementById('productTitle').textContent = 'Error Loading Product';
    };
    xhr.send();
}

function populateSpecifications() {
    const specsList = document.getElementById('specifications');
    if (!specsList) return;

    specsList.innerHTML = '';

    // Case 1: specifications = array of objects
    if (productData.specifications && Array.isArray(productData.specifications) && productData.specifications.length > 0) {
        productData.specifications.forEach(spec => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${spec.key || 'Property'}:</strong> ${spec.value || 'N/A'}`;
            specsList.appendChild(li);
        });
        return;
    }

    // Case 2: specifications = string with line breaks
    if (typeof productData.specifications === 'string' && productData.specifications.trim() !== '') {
        const lines = productData.specifications
            .split(/\r?\n/) // split by newline
            .filter(line => line.trim() !== '');

        lines.forEach(line => {
            const [key, ...rest] = line.split(':');
            const value = rest.join(':').trim();
            const li = document.createElement('li');
            if (key) {
                li.innerHTML = `<strong>${key.trim()}:</strong> ${value}`;
            } else {
                li.textContent = line.trim();
            }
            specsList.appendChild(li);
        });
        return;
    }

    // Fallback
    specsList.innerHTML = '<li>No specifications available</li>';
}


function populateSimilarProducts() {
    const similarGrid = document.querySelector('.similar-grid');
    if (!similarGrid) return;

    similarGrid.innerHTML = '';

    if (productData.similar_products && productData.similar_products.length > 0) {
        productData.similar_products.forEach(product => {
            const similarItem = document.createElement('a');
            similarItem.className = 'similar-item';
            similarItem.href = `Details.html?id=${product.id}`;

            const productImage = product.images && product.images.length > 0 ? product.images[0] : 'Image/placeholder.png';
            const discount = product.discount || 0;
            const priceContent = discount > 0
                ? `<div class="price strikethrough">৳${product.price.toFixed(2)}</div><div class="discount-price">৳${(product.price - discount).toFixed(2)} ${product.currency || 'BDT'}</div>`
                : `<div class="price">৳${product.price.toFixed(2)} ${product.currency || 'BDT'}</div>`;

            similarItem.innerHTML = `
                <div class="similar-image">
                    <img src="${productImage}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%;">
                </div>
                <h4>${product.name}</h4>
                ${priceContent}
                <button class="add-btn" onclick="addToCartSimilar(${product.id}); event.preventDefault();">Add to Cart</button>
            `;
            similarGrid.appendChild(similarItem);
        });
    } else {
        similarGrid.innerHTML = '<p>No similar products available.</p>';
    }
}

// Dynamic color conversion function
function getColorCode(colorName) {
    if (!colorName) return '#CCCCCC'; // fallback color

    const tempDiv = document.createElement('div');
    tempDiv.style.color = colorName;
    document.body.appendChild(tempDiv);

    const computedColor = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    const rgb = computedColor.match(/\d+/g);
    if (!rgb || rgb.length < 3) return '#CCCCCC';

    return '#' + rgb.slice(0, 3).map(val => parseInt(val).toString(16).padStart(2, '0')).join('');
}

// Populate filter circles
function populateFilterCircles() {
    const colorCircles = document.getElementById('colorCircles');
    const sizeCircles = document.getElementById('sizeCircles');
    const thicknessCircles = document.getElementById('thicknessCircles');

    if (!colorCircles || !sizeCircles || !thicknessCircles) {
        console.error('Filter circle containers not found');
        return;
    }

    colorCircles.innerHTML = '';
    sizeCircles.innerHTML = '';
    thicknessCircles.innerHTML = '';

    // --- Colors ---
    if (productData.colors && productData.colors.length > 0) {
        productData.colors.forEach((colorItem, index) => {
            const circle = document.createElement('div');
            circle.className = `filter-circle color-circle${index === 0 ? ' active' : ''}`;
            circle.dataset.value = colorItem.color;
            // Use dynamic color conversion
            circle.style.backgroundColor = getColorCode(colorItem.color);
            circle.innerHTML = `<span class="price-tooltip">${colorItem.price >= 0 ? '+' : ''}৳${colorItem.price.toFixed(2)}</span>`;
            circle.onclick = () => selectFilter('color', colorItem.color);
            colorCircles.appendChild(circle);
        });
        selectedOptions.color = productData.colors[0].color;
        colorCircles.parentElement.style.display = 'block';
    } else {
        colorCircles.parentElement.style.display = 'none';
        selectedOptions.color = '';
    }

    // --- Sizes ---
    if (productData.sizes && productData.sizes.length > 0) {
        productData.sizes.forEach((sizeItem, index) => {
            const circle = document.createElement('div');
            circle.className = `filter-circle${index === 0 ? ' active' : ''}`;
            circle.dataset.value = sizeItem.size;
            circle.textContent = sizeItem.size;
            circle.innerHTML += `<span class="price-tooltip">${sizeItem.price >= 0 ? '+' : ''}৳${sizeItem.price.toFixed(2)}</span>`;
            circle.onclick = () => selectFilter('size', sizeItem.size);
            sizeCircles.appendChild(circle);
        });
        selectedOptions.size = productData.sizes[0].size;
        sizeCircles.parentElement.style.display = 'block';
    } else {
        sizeCircles.parentElement.style.display = 'none';
        selectedOptions.size = '';
    }

    // --- Thickness ---
    if (productData.thicknesses && productData.thicknesses.length > 0) {
        productData.thicknesses.forEach((thicknessItem, index) => {
            const circle = document.createElement('div');
            circle.className = `filter-circle${index === 0 ? ' active' : ''}`;
            circle.dataset.value = thicknessItem.thickness;
            circle.textContent = thicknessItem.thickness;
            circle.innerHTML += `<span class="price-tooltip">${thicknessItem.price >= 0 ? '+' : ''}৳${thicknessItem.price.toFixed(2)}</span>`;
            circle.onclick = () => selectFilter('thickness', thicknessItem.thickness);
            thicknessCircles.appendChild(circle);
        });
        selectedOptions.thickness = productData.thicknesses[0].thickness;
        thicknessCircles.parentElement.style.display = 'block';
    } else {
        thicknessCircles.parentElement.style.display = 'none';
        selectedOptions.thickness = '';
    }
}


function selectFilter(type, value) {
    selectedOptions[type] = value;

    // Update active state for circles
    const circles = document.querySelectorAll(`#${type}Circles .filter-circle`);
    circles.forEach(circle => {
        circle.classList.toggle('active', circle.dataset.value === value);
    });

    // Update images based on selection
    updateImages();

    // Update price and stock
    updatePrice();
    updateStockStatus();
}

function getCurrentImages() {
    let images = [];

    // Priority: Color > Size > Thickness > Default Product Images

    // Check color images
    if (selectedOptions.color && productData.colors) {
        const colorItem = productData.colors.find(c => c.color === selectedOptions.color);
        if (colorItem && colorItem.images && colorItem.images.length > 0) {
            images = colorItem.images;
        }
    }

    // If no color images, check size images
    if (images.length === 0 && selectedOptions.size && productData.sizes) {
        const sizeItem = productData.sizes.find(s => s.size === selectedOptions.size);
        if (sizeItem && sizeItem.images && sizeItem.images.length > 0) {
            images = sizeItem.images;
        }
    }

    // If no size images, check thickness images
    if (images.length === 0 && selectedOptions.thickness && productData.thicknesses) {
        const thicknessItem = productData.thicknesses.find(t => t.thickness === selectedOptions.thickness);
        if (thicknessItem && thicknessItem.images && thicknessItem.images.length > 0) {
            images = thicknessItem.images;
        }
    }

    // If still no images, use default product images
    if (images.length === 0 && productData.images && productData.images.length > 0) {
        images = productData.images;
    }

    // Final fallback
    if (images.length === 0) {
        images = ['Image/placeholder.png'];
    }

    return images;
}

function updateImages() {
    const mainImage = document.getElementById('mainImage');
    const imageDots = document.getElementById('imageDots');

    if (!mainImage || !imageDots) {
        console.error('Image elements not found');
        return;
    }

    const images = getCurrentImages();

    currentImageIndex = 0;
    mainImage.src = images[0];

    // Clear and repopulate dots
    imageDots.innerHTML = '';

    if (images.length > 1) {
        images.forEach((img, index) => {
            const dot = document.createElement('div');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.onclick = () => changeImage(index);
            imageDots.appendChild(dot);
        });
    }
}

function changeImage(index) {
    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    const images = getCurrentImages();

    if (mainImage && images[index]) {
        mainImage.src = images[index];
    }

    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function updatePrice() {
    if (!productData) return;

    let totalPrice = productData.price || 0;
    let totalDiscount = productData.discount || 0;

    // Add color price
    if (selectedOptions.color && productData.colors) {
        const colorItem = productData.colors.find(c => c.color === selectedOptions.color);
        if (colorItem) totalPrice += colorItem.price;
    }

    // Add size price
    if (selectedOptions.size && productData.sizes) {
        const sizeItem = productData.sizes.find(s => s.size === selectedOptions.size);
        if (sizeItem) totalPrice += sizeItem.price;
    }

    // Add thickness price
    if (selectedOptions.thickness && productData.thicknesses) {
        const thicknessItem = productData.thicknesses.find(t => t.thickness === selectedOptions.thickness);
        if (thicknessItem) totalPrice += thicknessItem.price;
    }

    const productPriceEl = document.getElementById('productPrice');
    const productDiscountPriceEl = document.getElementById('productDiscountPrice');

    if (totalDiscount > 0) {
        productPriceEl.classList.add('strikethrough');
        productPriceEl.textContent = `৳${totalPrice.toFixed(2)} ${productData.currency || 'BDT'}`;
        productDiscountPriceEl.textContent = `৳${(totalPrice - totalDiscount).toFixed(2)} ${productData.currency || 'BDT'}`;
    } else {
        productPriceEl.classList.remove('strikethrough');
        productPriceEl.textContent = `৳${totalPrice.toFixed(2)} ${productData.currency || 'BDT'}`;
        productDiscountPriceEl.textContent = '';
    }
}

function updateStockStatus() {
    if (!productData) return;

    const addToCartBtn = document.querySelector('.btn-add-cart');
    const buyNowBtn = document.querySelector('.btn-buy-now');

    let stockDisplay = document.getElementById('stockDisplay');
    if (!stockDisplay) {
        stockDisplay = document.createElement('div');
        stockDisplay.id = 'stockDisplay';
        stockDisplay.style.marginTop = '10px';
        stockDisplay.style.fontSize = '14px';
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) actionButtons.appendChild(stockDisplay);
    }

    let totalStock = 0;

    // Calculate total stock based on selections
    if (selectedOptions.color && productData.colors) {
        const colorItem = productData.colors.find(c => c.color === selectedOptions.color);
        if (colorItem) totalStock += colorItem.stock || 0;
    }

    if (selectedOptions.size && productData.sizes) {
        const sizeItem = productData.sizes.find(s => s.size === selectedOptions.size);
        if (sizeItem) totalStock += sizeItem.stock || 0;
    }

    if (selectedOptions.thickness && productData.thicknesses) {
        const thicknessItem = productData.thicknesses.find(t => t.thickness === selectedOptions.thickness);
        if (thicknessItem) totalStock += thicknessItem.stock || 0;
    }

    // If no filters exist, assume unlimited stock
    if (!productData.colors?.length && !productData.sizes?.length && !productData.thicknesses?.length) {
        totalStock = 999;
    }

    if (totalStock > 0) {
        stockDisplay.textContent = `In Stock: ${totalStock} units`;
        stockDisplay.style.color = '#28a745';
        if (addToCartBtn) {
            addToCartBtn.disabled = false;
            addToCartBtn.style.opacity = '1';
            addToCartBtn.style.cursor = 'pointer';
        }
        if (buyNowBtn) {
            buyNowBtn.disabled = false;
            buyNowBtn.style.opacity = '1';
            buyNowBtn.style.cursor = 'pointer';
        }
    } else {
        stockDisplay.textContent = 'Out of Stock';
        stockDisplay.style.color = '#dc3545';
        if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.style.opacity = '0.5';
            addToCartBtn.style.cursor = 'not-allowed';
        }
        if (buyNowBtn) {
            buyNowBtn.disabled = true;
            buyNowBtn.style.opacity = '0.5';
            buyNowBtn.style.cursor = 'not-allowed';
        }
    }
}

function getMaxStock() {
    let maxStock = 999; // Default unlimited stock
    let hasVariants = false;

    if (selectedOptions.color && productData.colors) {
        const colorItem = productData.colors.find(c => c.color === selectedOptions.color);
        if (colorItem && colorItem.stock !== undefined) {
            maxStock = Math.min(maxStock, colorItem.stock);
            hasVariants = true;
        }
    }

    if (selectedOptions.size && productData.sizes) {
        const sizeItem = productData.sizes.find(s => s.size === selectedOptions.size);
        if (sizeItem && sizeItem.stock !== undefined) {
            maxStock = Math.min(maxStock, sizeItem.stock);
            hasVariants = true;
        }
    }

    if (selectedOptions.thickness && productData.thicknesses) {
        const thicknessItem = productData.thicknesses.find(t => t.thickness === selectedOptions.thickness);
        if (thicknessItem && thicknessItem.stock !== undefined) {
            maxStock = Math.min(maxStock, thicknessItem.stock);
            hasVariants = true;
        }
    }

    // If no variants are defined, keep unlimited stock
    return hasVariants ? maxStock : 999;
}


function increaseQuantity() {
    const maxStock = getMaxStock();

    if (currentQuantity < maxStock) {
        currentQuantity++;
        document.getElementById('quantity').textContent = currentQuantity;
    } else {
        alert(`Cannot increase quantity. Only ${maxStock} units available.`);
    }
}

function decreaseQuantity() {
    if (currentQuantity > 1) {
        currentQuantity--;
        document.getElementById('quantity').textContent = currentQuantity;
    }
}

function addToCart() {
    if (!productData) {
        alert('Error: Product data not loaded. Please try again.');
        return;
    }

    const maxStock = getMaxStock();
    if (maxStock === 0) {
        alert('This product is out of stock.');
        return;
    }

    if (currentQuantity > maxStock) {
        alert(`Cannot add to cart. Only ${maxStock} units available.`);
        return;
    }

    let totalPrice = productData.price || 0;
    let totalDiscount = productData.discount || 0;

    if (selectedOptions.color && productData.colors) {
        const colorItem = productData.colors.find(c => c.color === selectedOptions.color);
        if (colorItem && colorItem.price > 0) {
            totalPrice = colorItem.price; // Use variant price directly, not add to base
        }
    }

    if (selectedOptions.size && productData.sizes) {
        const sizeItem = productData.sizes.find(s => s.size === selectedOptions.size);
        if (sizeItem && sizeItem.price > 0) {
            totalPrice = sizeItem.price; // Use variant price directly
        }
    }

    if (selectedOptions.thickness && productData.thicknesses) {
        const thicknessItem = productData.thicknesses.find(t => t.thickness === selectedOptions.thickness);
        if (thicknessItem && thicknessItem.price > 0) {
            totalPrice = thicknessItem.price; // Use variant price directly
        }
    }

    const images = getCurrentImages();

    // Create unique cart ID for variant combinations
    const cartId = `${productData.id}_${selectedOptions.color || 'none'}_${selectedOptions.size || 'none'}_${selectedOptions.thickness || 'none'}`;

    const cartItem = {
        id: productData.id,
        cartId: cartId,
        name: productData.name,
        price: totalPrice - totalDiscount,
        originalPrice: totalPrice,
        quantity: currentQuantity,
        image: images[0],
        category: productData.category,
        subcategory: productData.subcategory,
        subsubcategory: productData.subsubcategory,
        selectedOptions: { ...selectedOptions },
        maxStock: maxStock
    };

    let cart = [];
    try {
        const savedCart = localStorage.getItem('cartState');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (e) {
        console.error('Error loading cart from localStorage:', e);
    }

    // Check if exact variant already exists in cart
    const existingItemIndex = cart.findIndex(item => item.cartId === cartId);

    if (existingItemIndex !== -1) {
        // Update quantity of existing item
        const newQuantity = cart[existingItemIndex].quantity + currentQuantity;
        if (newQuantity > maxStock) {
            alert(`Cannot add ${currentQuantity} more. Maximum stock is ${maxStock}. You already have ${cart[existingItemIndex].quantity} in cart.`);
            return;
        }
        cart[existingItemIndex].quantity = newQuantity;
    } else {
        // Add new item
        cart.push(cartItem);
    }

    try {
        localStorage.setItem('cartState', JSON.stringify(cart));

        // Build variant description for alert
        let variantText = '';
        if (selectedOptions.color) variantText += ` (Color: ${selectedOptions.color})`;
        if (selectedOptions.size) variantText += ` (Size: ${selectedOptions.size})`;
        if (selectedOptions.thickness) variantText += ` (Thickness: ${selectedOptions.thickness})`;

        alert(`Added ${currentQuantity} ${productData.name}${variantText} to cart at ৳${(totalPrice - totalDiscount).toFixed(2)} ${productData.currency || 'BDT'} each!`);

        // Update cart count in navbar if function exists
        if (window.gallery && typeof window.gallery.updateCartCount === 'function') {
            window.gallery.updateCartCount();
        } else {
            updateCartCountManually();
        }
    } catch (e) {
        console.error('Error saving cart to localStorage:', e);
        alert('Failed to add to cart. Please try again.');
    }
}

// Helper function to manually update cart count
function updateCartCountManually() {
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        try {
            const cart = JSON.parse(localStorage.getItem('cartState') || '[]');
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            cartCountElement.textContent = totalItems;
        } catch (e) {
            console.error('Error updating cart count:', e);
        }
    }
}

function addToCartSimilar(productId) {
    // For similar products, redirect to their detail page
    window.location.href = `Details.html?id=${productId}`;
}

function buyNow() {
    addToCart();
    setTimeout(() => {
        window.location.href = 'cart.html';
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProductData();
    updateCartCountManually();
});


