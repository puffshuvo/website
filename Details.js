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
        alert('Error: Product ID not found. Please try again.');
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `api/single_product/${productId}`, true);
    xhr.onreadystatechange = () => {
        console.log('XHR readyState:', xhr.readyState, 'status:', xhr.status);
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    console.log('Parsed JSON:', data);
                    productData = data.id == productId ? data : null;

                    if (!productData) {
                        console.error(`Product with ID ${productId} not found in Details.json`);
                        document.getElementById('productTitle').textContent = 'Product Not Found';
                        document.getElementById('productDescription').textContent = 'This product is not available.';
                        alert('Error: Product not found.');
                        return;
                    }

                    // Normalize data structure
                    normalizeProductData();

                    // Populate product details
                    document.getElementById('productTitle').textContent = productData.name;
                    document.getElementById('productPrice').textContent = `৳${productData.price.toFixed(2)} ${productData.currency || 'BDT'}`;
                    document.getElementById('productDescription').textContent = productData.description || 'No description available.';
                    document.getElementById('recommendationText').textContent = productData.recomended_text || 'This product is recommended for its quality and suitability for construction projects.';

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
                                console.log('Adding spec:', spec.key, spec.value);
                                const li = document.createElement('li');
                                li.textContent = `${spec.key}: ${spec.value}`;
                                specsList.appendChild(li);
                                hasOtherSpecs = true;
                            }
                        });
                    }
                    if (!hasOtherSpecs) {
                        console.log('No non-filter specifications found');
                        specsList.innerHTML = '<li>No additional specifications available</li>';
                    }

                    // Populate similar products
                    const similarGrid = document.querySelector('.similar-grid');
                    if (!similarGrid) {
                        console.error('Similar products grid not found in the DOM');
                        return;
                    }
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

                    // Populate filter circles and set defaults
                    populateFilterCircles();

                    // Update price, stock, and images based on default selections
                    updatePrice();
                    updateStockStatus();
                    updateImages();

                    // Update breadcrumb
                    updateBreadcrumb();
                } catch (e) {
                    console.error('Error parsing Details.json:', e);
                    console.log('Raw response:', xhr.responseText);
                    document.getElementById('productTitle').textContent = 'Error Loading Product';
                    alert('Error loading product data. Please try again.');
                }
            } else {
                console.error('Error fetching Details.json:', xhr.statusText);
                console.log('Raw response:', xhr.responseText);
                document.getElementById('productTitle').textContent = 'Error Loading Product';
                alert('Error loading product data. Please try again.');
            }
        }
    };
    xhr.onerror = () => {
        console.error('Network error while fetching Details.json');
        console.log('Raw response (if any):', xhr.responseText);
        document.getElementById('productTitle').textContent = 'Error Loading Product';
        alert('Error loading product data. Please try again.');
    };
    xhr.send();
}

function normalizeProductData() {
    // Ensure color_images exists
    if (!productData.color_images || productData.color_images.length === 0) {
        productData.color_images = [{
            color: 'Default',
            images: ['Image/placeholder.png']
        }];
    }

    // Ensure stock_combinations exists
    if (!productData.stock_combinations || productData.stock_combinations.length === 0) {
        productData.stock_combinations = [{
            color: productData.color_images[0].color,
            size: 'Standard',
            thickness: 'Standard',
            stock: 100
        }];
    }

    // Extract unique colors, sizes, and thicknesses from stock_combinations
    const colors = [...new Set(productData.stock_combinations.map(c => c.color))];
    const sizes = [...new Set(productData.stock_combinations.map(c => c.size))];
    const thicknesses = [...new Set(productData.stock_combinations.map(c => c.thickness))];

    // Ensure specifications array exists
    if (!productData.specifications) {
        productData.specifications = [];
    }

    // Add color specifications if not present
    const hasColorSpecs = productData.specifications.some(s => s.key === 'Color');
    if (!hasColorSpecs) {
        colors.forEach((color, index) => {
            productData.specifications.push({
                key: 'Color',
                value: color,
                colorCode: getColorCode(color),
                price: index === 0 ? 0 : 0
            });
        });
    }

    // Add size specifications if not present
    const hasSizeSpecs = productData.specifications.some(s => s.key === 'Size');
    if (!hasSizeSpecs) {
        sizes.forEach((size, index) => {
            productData.specifications.push({
                key: 'Size',
                value: size,
                price: index === 0 ? 0 : 0
            });
        });
    }

    // Add thickness specifications if not present
    const hasThicknessSpecs = productData.specifications.some(s => s.key === 'Thickness');
    if (!hasThicknessSpecs) {
        thicknesses.forEach((thickness, index) => {
            productData.specifications.push({
                key: 'Thickness',
                value: thickness,
                price: index === 0 ? 0 : 0
            });
        });
    }
}

function getColorCode(colorName) {
    const colorMap = {
        'Red': '#FF0000',
        'Blue': '#0000FF',
        'Green': '#00FF00',
        'Yellow': '#FFFF00',
        'Black': '#000000',
        'White': '#FFFFFF',
        'Gray': '#808080',
        'Grey': '#808080',
        'Default': '#CCCCCC'
    };
    return colorMap[colorName] || '#' + Math.floor(Math.random()*16777215).toString(16);
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
                circle.className = `filter-circle color-circle${spec.price === 0 && !defaultColor ? ' active' : ''}`;
                circle.dataset.value = spec.value;
                circle.style.backgroundColor = spec.colorCode || spec.value.toLowerCase();
                circle.innerHTML = `<span class="price-tooltip">${spec.price >= 0 ? '+' : '-'}৳${Math.abs(spec.price).toFixed(2)}</span>`;
                circle.onclick = () => selectFilter('color', spec.value);
                colorCircles.appendChild(circle);
                if (!defaultColor && spec.price === 0) defaultColor = spec.value;
            } else if (spec.key === 'Size') {
                const circle = document.createElement('div');
                circle.className = `filter-circle${spec.price === 0 && !defaultSize ? ' active' : ''}`;
                circle.dataset.value = spec.value;
                circle.textContent = spec.value;
                circle.innerHTML += `<span class="price-tooltip">${spec.price >= 0 ? '+' : '-'}৳${Math.abs(spec.price).toFixed(2)}</span>`;
                circle.onclick = () => selectFilter('size', spec.value);
                sizeCircles.appendChild(circle);
                if (!defaultSize && spec.price === 0) defaultSize = spec.value;
            } else if (spec.key === 'Thickness') {
                const circle = document.createElement('div');
                circle.className = `filter-circle${spec.price === 0 && !defaultThickness ? ' active' : ''}`;
                circle.dataset.value = spec.value;
                circle.textContent = spec.value;
                circle.innerHTML += `<span class="price-tooltip">${spec.price >= 0 ? '+' : '-'}৳${Math.abs(spec.price).toFixed(2)}</span>`;
                circle.onclick = () => selectFilter('thickness', spec.value);
                thicknessCircles.appendChild(circle);
                if (!defaultThickness && spec.price === 0) defaultThickness = spec.value;
            }
        });
    }

    // If no defaults found, use first available options
    if (!defaultColor && colorCircles.children.length > 0) {
        defaultColor = colorCircles.children[0].dataset.value;
        colorCircles.children[0].classList.add('active');
    }
    if (!defaultSize && sizeCircles.children.length > 0) {
        defaultSize = sizeCircles.children[0].dataset.value;
        sizeCircles.children[0].classList.add('active');
    }
    if (!defaultThickness && thicknessCircles.children.length > 0) {
        defaultThickness = thicknessCircles.children[0].dataset.value;
        thicknessCircles.children[0].classList.add('active');
    }

    // Set default selections
    selectedOptions.color = defaultColor;
    selectedOptions.size = defaultSize;
    selectedOptions.thickness = defaultThickness;

    // Hide filter groups if they have no options
    if (colorCircles.children.length === 0) {
        colorCircles.parentElement.style.display = 'none';
    }
    if (sizeCircles.children.length === 0) {
        sizeCircles.parentElement.style.display = 'none';
    }
    if (thicknessCircles.children.length === 0) {
        thicknessCircles.parentElement.style.display = 'none';
    }
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

    // Calculate total price from specifications
    if (productData.specifications) {
        productData.specifications.forEach(spec => {
            if ((spec.key === 'Color' && spec.value === selectedOptions.color) ||
                (spec.key === 'Size' && spec.value === selectedOptions.size) ||
                (spec.key === 'Thickness' && spec.value === selectedOptions.thickness)) {
                totalPrice += spec.price;
            }
        });
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

    // Find stock for the selected combination
    let stock = 0;
    if (productData.stock_combinations) {
        const selectedCombo = productData.stock_combinations.find(combo =>
            combo.color === selectedOptions.color &&
            combo.size === selectedOptions.size &&
            combo.thickness === selectedOptions.thickness
        );

        if (selectedCombo) {
            stock = selectedCombo.stock;
        }
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

    // Find images for the selected color
    const colorImageData = productData.color_images.find(item => item.color === selectedOptions.color);
    const colorImages = colorImageData ? colorImageData.images : (productData.color_images[0] ? productData.color_images[0].images : ['Image/placeholder.png']);
    
    currentImageIndex = 0;
    mainImage.src = colorImages[0] || 'Image/placeholder.png';

    // Populate image dots only if there are multiple images
    if (colorImages.length > 1) {
        colorImages.forEach((img, index) => {
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
    const colorImageData = productData.color_images.find(item => item.color === selectedOptions.color);
    const colorImages = colorImageData ? colorImageData.images : (productData.color_images[0] ? productData.color_images[0].images : ['Image/placeholder.png']);
    
    if (mainImage && colorImages[index]) {
        mainImage.src = colorImages[index] || 'Image/placeholder.png';
    }
    
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function increaseQuantity() {
    const selectedCombo = productData.stock_combinations.find(combo =>
        combo.color === selectedOptions.color &&
        combo.size === selectedOptions.size &&
        combo.thickness === selectedOptions.thickness
    );
    const stock = selectedCombo ? selectedCombo.stock : 0;

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
        alert('Please select all available options.');
        return;
    }

    const selectedCombo = productData.stock_combinations.find(combo =>
        combo.color === selectedOptions.color &&
        combo.size === selectedOptions.size &&
        combo.thickness === selectedOptions.thickness
    );
    const stock = selectedCombo ? selectedCombo.stock : 0;

    if (currentQuantity > stock) {
        alert(`Cannot add to cart. Only ${stock} units available for this combination.`);
        return;
    }

    let totalPrice = productData.price;
    let totalDiscount = productData.discount || 0;
    if (productData.specifications) {
        productData.specifications.forEach(spec => {
            if ((spec.key === 'Color' && spec.value === selectedOptions.color) ||
                (spec.key === 'Size' && spec.value === selectedOptions.size) ||
                (spec.key === 'Thickness' && spec.value === selectedOptions.thickness)) {
                totalPrice += spec.price;
            }
        });
    }

    const colorImageData = productData.color_images.find(item => item.color === selectedOptions.color);
    const productImage = colorImageData ? colorImageData.images[0] : (productData.color_images[0] ? productData.color_images[0].images[0] : 'Image/placeholder.png');

    const cartItem = {
        id: productData.id,
        name: productData.name,
        price: totalPrice - totalDiscount,
        originalPrice: totalPrice,
        quantity: currentQuantity,
        image: productImage,
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

    const similarProduct = productData.similar_products.find(product => product.id === productId);
    if (!similarProduct) {
        alert('Error: Similar product not found.');
        return;
    }

    const cartItem = {
        id: similarProduct.id,
        name: similarProduct.name,
        price: similarProduct.price - (similarProduct.discount || 0),
        originalPrice: similarProduct.price,
        quantity: 1,
        image: similarProduct.image || 'Image/placeholder.png',
        category: productData.category,
        subcategory: productData.subcategory,
        subsubcategory: productData.subsubcategory,
        selectedOptions: {}
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