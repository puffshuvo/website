let currentQuantity = 1;
let currentImageIndex = 0;
let productData = null;
let selectedSizes = [];
let selectedColors = [];
let currentPrice = 0;

// Fetch product data from products.json
function loadProductData() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        console.error('No product ID found in URL');
        document.getElementById('productTitle').textContent = 'Error: Product Not Found';
        document.getElementById('productDescription').textContent = 'Please go back and select a product.';
        alert('Error: Product ID not found. Please try again.');
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'products.json', true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const products = JSON.parse(xhr.responseText);
                    productData = products.find(p => p.id == productId);
                    if (!productData) {
                        console.error(`Product with ID ${productId} not found`);
                        document.getElementById('productTitle').textContent = 'Product Not Found';
                        document.getElementById('productDescription').textContent = 'This product is not available.';
                        alert('Error: Product not found.');
                        return;
                    }

                    // Populate product details
                    document.getElementById('productTitle').textContent = productData.name;
                    currentPrice = productData.variants[0].price; // Default to first variant
                    document.getElementById('productPrice').textContent = `৳${currentPrice.toFixed(2)} ${productData.currency || 'BDT'}`;
                    document.getElementById('productDescription').textContent = productData.description || 'No description available.';
                    document.getElementById('recommendationText').textContent = productData.recommendation || 'This product is recommended for its quality and suitability.';

                    // Populate main image and dots
                    const mainImage = document.getElementById('mainImage');
                    const imageDots = document.getElementById('imageDots');
                    imageDots.innerHTML = '';
                    const imageKey = productData.variants[0].color || 'default';
                    if (productData.images && productData.images[imageKey] && productData.images[imageKey].length > 0) {
                        mainImage.src = productData.images[imageKey][0] || 'Image/placeholder.png';
                        productData.images[imageKey].forEach((img, index) => {
                            const dot = document.createElement('div');
                            dot.className = `dot ${index === 0 ? 'active' : ''}`;
                            dot.onclick = () => changeImage(index, imageKey);
                            imageDots.appendChild(dot);
                        });
                    } else {
                        mainImage.src = productData.images && productData.images.default ? productData.images.default[0] : 'Image/placeholder.png';
                        const dot = document.createElement('div');
                        dot.className = 'dot active';
                        dot.onclick = () => changeImage(0, 'default');
                        imageDots.appendChild(dot);
                    }

                    // Populate variant selectors
                    populateVariants();

                    // Populate specifications
                    const specsList = document.getElementById('specifications');
                    specsList.innerHTML = '';
                    if (productData.specifications && Object.keys(productData.specifications).length > 0) {
                        for (const [key, value] of Object.entries(productData.specifications)) {
                            const li = document.createElement('li');
                            li.textContent = `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`;
                            specsList.appendChild(li);
                        }
                        const sizes = [...new Set(productData.variants.map(v => v.size).filter(s => s))];
                        const colors = [...new Set(productData.variants.map(v => v.color).filter(c => c))];
                        if (sizes.length > 1) {
                            const sizeLi = document.createElement('li');
                            sizeLi.textContent = `Available Sizes: ${sizes.join(', ')}`;
                            specsList.appendChild(sizeLi);
                        }
                        if (colors.length > 1) {
                            const colorLi = document.createElement('li');
                            colorLi.textContent = `Available Colors: ${colors.join(', ')}`;
                            specsList.appendChild(colorLi);
                        }
                    } else {
                        specsList.innerHTML = '<li>No specifications available</li>';
                    }

                    // Populate similar products
                    const similarGrid = document.getElementById('similarGrid');
                    similarGrid.innerHTML = '';
                    const similarProducts = products.filter(p => p.id != productId && p.subsubcategory === productData.subsubcategory).slice(0, 3);
                    if (similarProducts.length === 0) {
                        similarGrid.innerHTML = '<p>No similar products found.</p>';
                    } else {
                        similarProducts.forEach(p => {
                            const item = document.createElement('a');
                            item.href = `details.html?id=${p.id}`;
                            item.className = 'similar-item';
                            item.innerHTML = `
                                <div class="similar-image">
                                    <div class="chair-icon"></div>
                                </div>
                                <h4>${p.name}</h4>
                                <p class="price">৳${p.variants[0].price.toFixed(2)} ${p.currency || 'BDT'} (starting)</p>
                                <button class="add-btn" onclick="event.preventDefault(); addToCartSimilar('${p.id}')">Add to cart</button>
                            `;
                            similarGrid.appendChild(item);
                        });
                    }
                } catch (e) {
                    console.error('Error parsing products.json:', e);
                    document.getElementById('productTitle').textContent = 'Error Loading Product';
                    alert('Error loading product data. Please try again.');
                }
            } else {
                console.error('Error fetching products.json:', xhr.statusText);
                document.getElementById('productTitle').textContent = 'Error Loading Product';
                alert('Error loading product data. Please try again.');
            }
        }
    };
    xhr.onerror = () => {
        console.error('Network error while fetching products.json');
        document.getElementById('productTitle').textContent = 'Error Loading Product';
        alert('Error loading product data. Please try again.');
    };
    xhr.send();
}

function populateVariants() {
    if (!productData.variants || productData.variants.length === 0) {
        return;
    }

    const sizes = [...new Set(productData.variants.map(v => v.size).filter(s => s))];
    const colors = [...new Set(productData.variants.map(v => v.color).filter(c => c))];

    const sizeSelector = document.getElementById('sizeSelector');
    const colorSelector = document.getElementById('colorSelector');
    const sizeOptions = document.getElementById('sizeOptions');
    const colorOptions = document.getElementById('colorOptions');

    // Show/hide size selector
    if (sizes.length > 1) {
        sizeSelector.style.display = 'block';
        sizes.forEach(size => {
            const div = document.createElement('div');
            div.className = 'size-option';
            div.textContent = size;
            div.onclick = () => toggleSizeSelection(size, div);
            sizeOptions.appendChild(div);
        });
        selectedSizes.push(sizes[0]);
        sizeOptions.children[0].classList.add('selected');
    } else {
        selectedSizes.push(sizes[0] || null);
    }

    // Show/hide color selector
    if (colors.length > 1) {
        colorSelector.style.display = 'block';
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-option';
            // Use color from variant if provided, else default
            const variant = productData.variants.find(v => v.color === color);
            div.style.backgroundColor = variant.hexColor || '#000000';
            div.onclick = () => toggleColorSelection(color, div);
            colorOptions.appendChild(div);
        });
        selectedColors.push(colors[0]);
        colorOptions.children[0].classList.add('selected');
        updateImage(colors[0]);
    } else {
        selectedColors.push(colors[0] || null);
        updateImage(colors[0] || 'default');
    }

    updatePrice();
}

function toggleSizeSelection(size, element) {
    if (selectedSizes.includes(size)) {
        selectedSizes = selectedSizes.filter(s => s !== size);
        element.classList.remove('selected');
    } else {
        selectedSizes.push(size);
        element.classList.add('selected');
    }
    updatePrice();
}

function toggleColorSelection(color, element) {
    if (selectedColors.includes(color)) {
        selectedColors = selectedColors.filter(c => c !== color);
        element.classList.remove('selected');
    } else {
        selectedColors.push(color);
        element.classList.add('selected');
        updateImage(color);
    }
    updatePrice();
}

function updateImage(color) {
    const mainImage = document.getElementById('mainImage');
    const imageDots = document.getElementById('imageDots');
    imageDots.innerHTML = '';
    const imageKey = color || 'default';
    if (productData.images && productData.images[imageKey] && productData.images[imageKey].length > 0) {
        mainImage.src = productData.images[imageKey][0] || 'Image/placeholder.png';
        productData.images[imageKey].forEach((img, index) => {
            const dot = document.createElement('div');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.onclick = () => changeImage(index, imageKey);
            imageDots.appendChild(dot);
        });
    } else {
        mainImage.src = productData.images && productData.images.default ? productData.images.default[0] : 'Image/placeholder.png';
        const dot = document.createElement('div');
        dot.className = 'dot active';
        dot.onclick = () => changeImage(0, 'default');
        imageDots.appendChild(dot);
    }
}

function changeImage(index, imageKey) {
    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    if (mainImage && productData && productData.images && productData.images[imageKey] && productData.images[imageKey][index]) {
        mainImage.src = productData.images[imageKey][index] || 'Image/placeholder.png';
    } else {
        mainImage.src = productData.images && productData.images.default ? productData.images.default[index] || 'Image/placeholder.png' : 'Image/placeholder.png';
    }
    
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function updatePrice() {
    const variants = productData.variants.filter(v => 
        (!selectedSizes.length || selectedSizes.includes(v.size)) && 
        (!selectedColors.length || selectedColors.includes(v.color))
    );

    if (variants.length === 0) {
        document.getElementById('productPrice').textContent = 'Select variant';
        currentPrice = 0;
        return;
    }

    const prices = variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    currentPrice = minPrice; // For display purposes
    document.getElementById('productPrice').textContent = minPrice === maxPrice 
        ? `৳${minPrice.toFixed(2)} ${productData.currency || 'BDT'}`
        : `৳${minPrice.toFixed(2)} - ৳${maxPrice.toFixed(2)} ${productData.currency || 'BDT'}`;
}

function increaseQuantity() {
    currentQuantity++;
    document.getElementById('quantity').textContent = currentQuantity;
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

    const variants = productData.variants.filter(v => 
        (!selectedSizes.length || selectedSizes.includes(v.size)) && 
        (!selectedColors.length || selectedColors.includes(v.color))
    );

    if (variants.length === 0) {
        alert('Please select at least one valid variant.');
        return;
    }

    let cart = [];
    try {
        const savedCart = localStorage.getItem('cartState');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (e) {
        console.error('Error loading cart from localStorage:', e);
    }

    let addedItems = [];
    variants.forEach(variant => {
        const cartItem = {
            id: productData.id,
            name: productData.name,
            price: variant.price,
            quantity: currentQuantity,
            size: variant.size || null,
            color: variant.color || null,
            image: productData.images && productData.images[variant.color || 'default'] && productData.images[variant.color || 'default'][0] 
                ? productData.images[variant.color || 'default'][0] 
                : 'Image/placeholder.png',
            category: productData.category,
            subcategory: productData.subcategory,
            subsubcategory: productData.subsubcategory
        };

        const existingItem = cart.find(item => 
            item.id === productData.id && 
            item.size === variant.size && 
            item.color === variant.color
        );
        if (existingItem) {
            alert(`This product variant (${variant.size || 'No size'}, ${variant.color || 'No color'}) is already in your cart!`);
            return;
        }

        cart.push(cartItem);
        addedItems.push(`${currentQuantity} ${productData.name} (${variant.size || 'No size'}, ${variant.color || 'No color'}) at ৳${variant.price.toFixed(2)} ${productData.currency || 'BDT'}`);
    });

    if (addedItems.length === 0) {
        alert('No valid variants selected.');
        return;
    }

    try {
        localStorage.setItem('cartState', JSON.stringify(cart));
        alert(`Added to cart:\n${addedItems.join('\n')}`);
    } catch (e) {
        console.error('Error saving cart to localStorage:', e);
        alert('Failed to add to cart. Please try again.');
    }
}

function addToCartSimilar(productId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'products.json', true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            try {
                const products = JSON.parse(xhr.responseText);
                const product = products.find(p => p.id == productId);
                if (!product) {
                    alert('Error: Similar product not found.');
                    return;
                }

                const defaultVariant = product.variants[0];
                const cartItem = {
                    id: product.id,
                    name: product.name,
                    price: defaultVariant.price,
                    quantity: 1,
                    size: defaultVariant.size || null,
                    color: defaultVariant.color || null,
                    image: product.images && product.images[defaultVariant.color || 'default'] && product.images[defaultVariant.color || 'default'][0] 
                        ? product.images[defaultVariant.color || 'default'][0] 
                        : 'Image/placeholder.png',
                    category: product.category,
                    subcategory: product.subcategory,
                    subsubcategory: product.subsubcategory
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

                if (cart.find(item => item.id == productId && item.size === defaultVariant.size && item.color === defaultVariant.color)) {
                    alert('This product variant is already in your cart!');
                    return;
                }

                cart.push(cartItem);

                try {
                    localStorage.setItem('cartState', JSON.stringify(cart));
                    alert(`Added ${cartItem.name} [${defaultVariant.size || 'No size'}, ${defaultVariant.color || 'No color'}] to cart at ৳${cartItem.price.toFixed(2)} ${product.currency || 'BDT'}!`);
                } catch (e) {
                    console.error('Error saving cart to localStorage:', e);
                    alert('Failed to add to cart. Please try again.');
                }
            } catch (e) {
                console.error('Error parsing products.json:', e);
                alert('Error adding similar product to cart.');
            }
        }
    };
    xhr.send();
}

function buyNow() {
    addToCart();
    setTimeout(() => {
        window.location.href = 'cart.html';
    }, 500);
}

// Navigation code
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