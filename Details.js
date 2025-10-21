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

async function loadProductData() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || '1'; // fallback to id=1
    console.log('Product ID from URL:', productId);

    if (!productId) {
        console.error('No product ID found in URL');
        const titleEl = document.getElementById('productTitle');
        const descEl = document.getElementById('productDescription');
        if (titleEl) titleEl.textContent = 'Error: Product Not Found';
        if (descEl) descEl.textContent = 'Please go back and select a product.';
        alert('Error: Product ID not found. Please try again.');
        return;
    }

    const apiUrl = `/api/single_product/${encodeURIComponent(productId)}`;
    console.log('Fetching product from API:', apiUrl);

    try {
        const res = await fetch(apiUrl, { credentials: 'same-origin' });
        // If the server responded with HTTP 200, log the requested message
        if (res.status === 200) {
            console.log('fix this');
        }
        if (!res.ok) {
            console.error('Error fetching product API:', res.status, res.statusText);
            const titleEl = document.getElementById('productTitle');
            if (titleEl) titleEl.textContent = 'Error Loading Product';
            alert('Error loading product data. Please try again.');
            return;
        }

        const data = await res.json();
        console.log('Received API response:', data);

        // Support APIs that wrap payload (e.g. { data: {...} }) or return object directly
        let payload = data && data.data ? data.data : data;

        // If payload is an array, try to find by id
        if (Array.isArray(payload)) {
            payload = payload.find(item => String(item.id) === String(productId)) || null;
        }

    productData = payload && String(payload.id) === String(productId) ? payload : null;

        if (!productData) {
            console.error(`Product with ID ${productId} not found in API response`);
            const titleEl = document.getElementById('productTitle');
            const descEl = document.getElementById('productDescription');
            if (titleEl) titleEl.textContent = 'Product Not Found';
            if (descEl) descEl.textContent = 'This product is not available.';
            alert('Error: Product not found.');
            return;
        }

         // Normalize payload: ensure arrays exist and map alternate API field names
        // This prevents runtime errors when API returns different field names (e.g. `images`, `stock_combination`).
        if (productData) {
            // specifications
            productData.specifications = Array.isArray(productData.specifications) ? productData.specifications : [];

            // color_images: prefer existing, else map from top-level `images` if present
            productData.color_images = Array.isArray(productData.color_images) ? productData.color_images : [];
            if (productData.color_images.length === 0 && Array.isArray(productData.images) && productData.images.length > 0) {
                // create a default color_images entry so the image UI still works
                productData.color_images = [{ color: 'Default', images: productData.images }];
            }

            // stock_combinations: support `stock_combinations` or `stock_combination`
            if (!Array.isArray(productData.stock_combinations)) {
                if (Array.isArray(productData.stock_combination)) {
                    productData.stock_combinations = productData.stock_combination;
                } else {
                    productData.stock_combinations = [];
                }
            }

            // similar products
            productData.similar_products = Array.isArray(productData.similar_products) ? productData.similar_products : [];

            // Smart default selection: pick from first available stock combination or color_images
            if (!selectedOptions.color) {
                if (productData.stock_combinations.length > 0) {
                    const firstStock = productData.stock_combinations[0];
                    selectedOptions.color = firstStock.color || '';
                    selectedOptions.size = firstStock.size || '';
                    selectedOptions.thickness = firstStock.thickness || '';
                } else if (productData.color_images.length > 0) {
                    selectedOptions.color = productData.color_images[0].color || 'Default';
                }
            }
        }

        // Populate product details
        const titleEl = document.getElementById('productTitle');
        const priceEl = document.getElementById('productPrice');
        const descEl = document.getElementById('productDescription');
        const recEl = document.getElementById('recommendationText');

        if (titleEl) titleEl.textContent = productData.name;
        if (priceEl) priceEl.textContent = `৳${(productData.price || 0).toFixed(2)} ${productData.currency || 'BDT'}`;
        if (descEl) descEl.textContent = productData.description || 'No description available.';
        if (recEl) recEl.textContent = productData.recomended_text || 'This product is recommended for its quality and suitability for construction projects.';

        // Populate specifications
        const specsList = document.getElementById('specifications');
        if (!specsList) {
            console.error('Element with ID "specifications" not found in the DOM');
            alert('Error: Specifications list element not found in the page.');
            return;
        }
        specsList.innerHTML = '';
        let hasOtherSpecs = false;
        console.log('Specifications data:', productData.specifications);
        if (productData.specifications && productData.specifications.length > 0) {
            productData.specifications.forEach(spec => {
                if (spec.key !== 'Color' && spec.key !== 'Size' && spec.key !== 'Thickness') {
                    const li = document.createElement('li');
                    li.textContent = `${spec.key}: ${spec.value}`;
                    specsList.appendChild(li);
                    hasOtherSpecs = true;
                }
            });
        }
        if (!hasOtherSpecs) {
            specsList.innerHTML = '<li>No additional specifications available</li>';
        }

        // Populate similar products
        const similarGrid = document.querySelector('.similar-grid');
        if (!similarGrid) {
            console.error('Similar products grid not found in the DOM');
        } else {
            similarGrid.innerHTML = '';
            console.log('Similar products data:', productData.similar_products);
            if (productData.similar_products && productData.similar_products.length > 0) {
                productData.similar_products.forEach(product => {
                    const similarItem = document.createElement('a');
                    similarItem.className = 'similar-item';
                    similarItem.href = `Details.html?id=${product.id}`;
                    const priceContent = product.discount > 0 
                        ? `<div class="price strikethrough">৳${product.price.toFixed(2)}</div><div class="discount-price">৳${(product.price - product.discount).toFixed(2)} ${productData.currency || 'BDT'}</div>`
                        : `<div class="price">৳${product.price.toFixed(2)} ${productData.currency || 'BDT'}</div>`;
                    similarItem.innerHTML = `
                        <div class="similar-image">
                            <img src="${product.image || 'Image/placeholder.png'}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%;">
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

        // Populate filter circles and set defaults
        populateFilterCircles();

        // Update price, stock, and images based on default selections
        updatePrice();
        updateStockStatus();
        updateImages();

        // Update breadcrumb
        updateBreadcrumb();
    } catch (e) {
        console.error('Error loading product from API:', e);
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = 'Error Loading Product';
        alert('Error loading product data. Please try again.');
    }
}

function populateFilterCircles() {
    const colorCircles = document.getElementById('colorCircles');
    const sizeCircles = document.getElementById('sizeCircles');
    const thicknessCircles = document.getElementById('thicknessCircles');

    if (!colorCircles || !sizeCircles || !thicknessCircles) {
        console.error('Filter circle containers not found:', { colorCircles, sizeCircles, thicknessCircles });
        alert('Error: Filter circle containers not found in the page.');
        return;
    }

    // Clear existing circles
    colorCircles.innerHTML = '';
    sizeCircles.innerHTML = '';
    thicknessCircles.innerHTML = '';

    // Track default selections
    let defaultColor = '';
    let defaultSize = '';
    let defaultThickness = '';

    // Populate filter circles from specifications
    if (productData.specifications && productData.specifications.length > 0) {
        productData.specifications.forEach((spec, index) => {
            if (spec.key === 'Color') {
                const circle = document.createElement('div');
                circle.className = `filter-circle color-circle${spec.price === 0 ? ' active' : ''}`;
                circle.dataset.value = spec.value;
                circle.style.backgroundColor = spec.colorCode || spec.value.toLowerCase();
                circle.innerHTML = `<span class="price-tooltip">${spec.price >= 0 ? '+' : '-'}৳${Math.abs(spec.price).toFixed(2)}</span>`;
                circle.onclick = () => selectFilter('color', spec.value);
                colorCircles.appendChild(circle);
                if (spec.price === 0) defaultColor = spec.value;
            } else if (spec.key === 'Size') {
                const circle = document.createElement('div');
                circle.className = `filter-circle${spec.price === 0 ? ' active' : ''}`;
                circle.dataset.value = spec.value;
                circle.textContent = spec.value;
                circle.innerHTML += `<span class="price-tooltip">${spec.price >= 0 ? '+' : '-'}৳${Math.abs(spec.price).toFixed(2)}</span>`;
                circle.onclick = () => selectFilter('size', spec.value);
                sizeCircles.appendChild(circle);
                if (spec.price === 0) defaultSize = spec.value;
            } else if (spec.key === 'Thickness') {
                const circle = document.createElement('div');
                circle.className = `filter-circle${spec.price === 0 ? ' active' : ''}`;
                circle.dataset.value = spec.value;
                circle.textContent = spec.value;
                circle.innerHTML += `<span class="price-tooltip">${spec.price >= 0 ? '+' : '-'}৳${Math.abs(spec.price).toFixed(2)}</span>`;
                circle.onclick = () => selectFilter('thickness', spec.value);
                thicknessCircles.appendChild(circle);
                if (spec.price === 0) defaultThickness = spec.value;
            }
        });
    }

    // Set default selections
    selectedOptions.color = defaultColor;
    selectedOptions.size = defaultSize;
    selectedOptions.thickness = defaultThickness;
}

function selectFilter(type, value) {
    selectedOptions[type] = value;

    // Update active state for circles
    const circles = document.querySelectorAll(`#${type}Circles .filter-circle`);
    circles.forEach(circle => {
        circle.classList.toggle('active', circle.dataset.value === value);
    });

    // Update price, stock, and images
    updatePrice();
    updateStockStatus();
    if (type === 'color') updateImages();
}

function updatePrice() {
    if (!productData) return;

    let totalPrice = productData.price;
    let totalDiscount = productData.discount || 0;

    // Calculate total price from specifications (guard against undefined)
    const specifications = Array.isArray(productData.specifications) ? productData.specifications : [];
    specifications.forEach(spec => {
        if ((spec.key === 'Color' && spec.value === selectedOptions.color) ||
            (spec.key === 'Size' && spec.value === selectedOptions.size) ||
            (spec.key === 'Thickness' && spec.value === selectedOptions.thickness)) {
            totalPrice += spec.price;
        }
    });

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
    const stockDisplay = document.createElement('div');
    stockDisplay.id = 'stockDisplay';
    stockDisplay.style.marginTop = '10px';
    stockDisplay.style.color = '#333';
    stockDisplay.style.fontSize = '14px';

    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) {
        console.error('Action buttons container not found');
        return;
    }
    const existingStockDisplay = document.getElementById('stockDisplay');
    if (existingStockDisplay) existingStockDisplay.remove();
    actionButtons.appendChild(stockDisplay);

    // Find stock for the selected combination (guard against undefined stock_combinations)
    let stock = 0;
    const stockCombinations = Array.isArray(productData.stock_combinations) ? productData.stock_combinations : [];
    if (stockCombinations.length === 0) {
        console.warn('No stock_combinations available for product', productData && productData.id);
    }
    const selectedCombo = stockCombinations.find(combo =>
        combo && combo.color === selectedOptions.color &&
        combo && combo.size === selectedOptions.size &&
        combo && combo.thickness === selectedOptions.thickness
    );

    if (selectedCombo) {
        stock = selectedCombo.stock || 0;
    }

    if (stock > 0) {
        stockDisplay.textContent = `In Stock: ${stock} units`;
        stockDisplay.style.color = '#28a745';
        addToCartBtn.disabled = false;
        buyNowBtn.disabled = false;
        addToCartBtn.style.opacity = '1';
        buyNowBtn.style.opacity = '1';
        addToCartBtn.style.cursor = 'pointer';
        buyNowBtn.style.cursor = 'pointer';
    } else {
        stockDisplay.textContent = 'Out of Stock';
        stockDisplay.style.color = '#dc3545';
        addToCartBtn.disabled = true;
        buyNowBtn.disabled = true;
        addToCartBtn.style.opacity = '0.5';
        buyNowBtn.style.opacity = '0.5';
        addToCartBtn.style.cursor = 'not-allowed';
        buyNowBtn.style.cursor = 'not-allowed';
    }
}

function updateImages() {
    if (!productData || !selectedOptions.color) return;

    const mainImage = document.getElementById('mainImage');
    const imageDots = document.getElementById('imageDots');
    if (!mainImage || !imageDots) {
        console.error('Image elements not found:', { mainImage, imageDots });
        return;
    }

    imageDots.innerHTML = '';

    // Find images for the selected color (guard against undefined color_images)
    const colorImagesArr = Array.isArray(productData.color_images) ? productData.color_images : [];
    const colorImages = (colorImagesArr.find(item => item && item.color === selectedOptions.color) || {}).images || ['Image/placeholder.png'];
    currentImageIndex = 0; // Reset to first image
    mainImage.src = colorImages[0] || 'Image/placeholder.png';

    // Populate image dots
    colorImages.forEach((img, index) => {
        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => changeImage(index);
        imageDots.appendChild(dot);
    });
}

function changeImage(index) {
    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    const colorImagesArr = Array.isArray(productData.color_images) ? productData.color_images : [];
    const colorImages = (colorImagesArr.find(item => item && item.color === selectedOptions.color) || {}).images || ['Image/placeholder.png'];
    if (mainImage && colorImages[index]) {
        mainImage.src = colorImages[index] || 'Image/placeholder.png';
    }
    
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function increaseQuantity() {
    const stockCombinations = Array.isArray(productData.stock_combinations) ? productData.stock_combinations : [];
    const selectedCombo = stockCombinations.find(combo =>
        combo && combo.color === selectedOptions.color &&
        combo && combo.size === selectedOptions.size &&
        combo && combo.thickness === selectedOptions.thickness
    );
    const stock = selectedCombo ? (selectedCombo.stock || 0) : 0;

    if (currentQuantity < stock) {
        currentQuantity++;
        document.getElementById('quantity').textContent = currentQuantity;
    } else {
        alert(`Cannot increase quantity. Only ${stock} units available.`);
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

    if (!selectedOptions.color || !selectedOptions.size || !selectedOptions.thickness) {
        alert('Please select a color, size, and thickness.');
        return;
    }

    const stockCombinations = Array.isArray(productData.stock_combinations) ? productData.stock_combinations : [];
    const selectedCombo = stockCombinations.find(combo =>
        combo && combo.color === selectedOptions.color &&
        combo && combo.size === selectedOptions.size &&
        combo && combo.thickness === selectedOptions.thickness
    );
    const stock = selectedCombo ? (selectedCombo.stock || 0) : 0;

    if (currentQuantity > stock) {
        alert(`Cannot add to cart. Only ${stock} units available for this combination.`);
        return;
    }

    let totalPrice = productData.price;
    let totalDiscount = productData.discount || 0;
    productData.specifications.forEach(spec => {
        if ((spec.key === 'Color' && spec.value === selectedOptions.color) ||
            (spec.key === 'Size' && spec.value === selectedOptions.size) ||
            (spec.key === 'Thickness' && spec.value === selectedOptions.thickness)) {
            totalPrice += spec.price;
        }
    });

    const cartItem = {
        id: productData.id,
        name: productData.name,
        price: totalPrice - totalDiscount,
        originalPrice: totalPrice,
        quantity: currentQuantity,
        image: (() => {
            const colorImagesArr = Array.isArray(productData.color_images) ? productData.color_images : [];
            return (colorImagesArr.find(item => item && item.color === selectedOptions.color) || {}).images?.[0] || 'Image/placeholder.png';
        })(),
        category: productData.category,
        subcategory: productData.subcategory,
        subsubcategory: productData.subsubcategory,
        selectedOptions: { ...selectedOptions }
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

    const existingItem = cart.find(item => 
        item.id === productData.id &&
        item.selectedOptions.color === selectedOptions.color &&
        item.selectedOptions.size === selectedOptions.size &&
        item.selectedOptions.thickness === selectedOptions.thickness
    );
    if (existingItem) {
        alert('This product with the selected options is already in your cart!');
        return;
    }

    cart.push(cartItem);

    try {
        localStorage.setItem('cartState', JSON.stringify(cart));
        alert(`Added ${currentQuantity} ${productData.name}(s) to cart at ৳${(totalPrice - totalDiscount).toFixed(2)} ${productData.currency || 'BDT'} each!`);
    } catch (e) {
        console.error('Error saving cart to localStorage:', e);
        alert('Failed to add to cart. Please try again.');
    }
}

function addToCartSimilar(productId) {
    if (!productData) {
        alert('Error: Product data not loaded. Please try again.');
        return;
    }
    const similarProductsArr = Array.isArray(productData.similar_products) ? productData.similar_products : [];
    const similarProduct = similarProductsArr.find(product => product && product.id === productId);
    if (!similarProduct) {
        alert('Error: Similar product not found.');
        return;
    }

    // For simplicity, assume similar product has no configurable options
    const cartItem = {
        id: similarProduct.id,
        name: similarProduct.name,
        price: similarProduct.price - (similarProduct.discount || 0),
        originalPrice: similarProduct.price,
        quantity: 1, // Default quantity
        image: similarProduct.image || 'Image/placeholder.png',
        category: productData.category,
        subcategory: productData.subcategory,
        subsubcategory: productData.subsubcategory,
        selectedOptions: {} // No options for similar products
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

    const existingItem = cart.find(item => item.id === similarProduct.id && !item.selectedOptions.color);
    if (existingItem) {
        alert('This product is already in your cart!');
        return;
    }

    cart.push(cartItem);

    try {
        localStorage.setItem('cartState', JSON.stringify(cart));
        alert(`Added 1 ${similarProduct.name} to cart at ৳${(similarProduct.price - (similarProduct.discount || 0)).toFixed(2)} ${productData.currency || 'BDT'}!`);
    } catch (e) {
        console.error('Error saving cart to localStorage:', e);
        alert('Failed to add to cart. Please try again.');
    }
}

function buyNow() {
    addToCart();
    setTimeout(() => {
        window.location.href = 'cart.html';
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProductData();

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
        if (logo) logo.style.transform = `translateX(${progress * maxTranslate}px)`;
        if (navLinksWrapper) navLinksWrapper.style.transform = `translateX(${progress * maxLinkTranslate}px)`;
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