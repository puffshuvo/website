let currentQuantity = 1;
let currentImageIndex = 0;
let productData = null;

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
    xhr.open('GET', 'https://archimartbd.com/product.json', true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                //     let response = JSON.parse(xhr.responseText);
                // let data = response.results || [];
                    let data = JSON.parse(xhr.responseText);
                    let products = data.results || [];

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
                    document.getElementById('productPrice').textContent = `৳${productData.price.toFixed(2)} ${productData.currency || 'BDT'}`;
                    document.getElementById('productDescription').textContent = productData.description || 'No description available.';
                    document.getElementById('recommendationText').textContent = productData.recommendation || 'This product is recommended for its quality and suitability for construction projects.';

                    // Populate main image and dots
                    const mainImage = document.getElementById('mainImage');
                    const imageDots = document.getElementById('imageDots');
                    imageDots.innerHTML = '';
                    if (productData.images && productData.images.length > 0) {
                        mainImage.src = productData.images[0] || 'Image/placeholder.png';
                        productData.images.forEach((img, index) => {
                            const dot = document.createElement('div');
                            dot.className = `dot ${index === 0 ? 'active' : ''}`;
                            dot.onclick = () => changeImage(index);
                            imageDots.appendChild(dot);
                        });
                    } else {
                        mainImage.src = 'Image/placeholder.png';
                        const dot = document.createElement('div');
                        dot.className = 'dot active';
                        dot.onclick = () => changeImage(0);
                        imageDots.appendChild(dot);
                    }

                    // Populate specifications
                    const specsList = document.getElementById('specifications');
                    specsList.innerHTML = '';
                    if (productData.specifications && Object.keys(productData.specifications).length > 0) {
                        for (const [key, value] of Object.entries(productData.specifications)) {
                            const li = document.createElement('li');
                            li.textContent = `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`;
                            specsList.appendChild(li);
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
                                <p class="price">৳${p.price.toFixed(2)} ${p.currency || 'BDT'}</p>
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

function changeImage(index) {
    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    if (mainImage && productData && productData.images && productData.images[index]) {
        mainImage.src = productData.images[index] || 'Image/placeholder.png';
    }
    
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
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

    const cartItem = {
        id: productData.id,
        name: productData.name,
        price: productData.price,
        quantity: currentQuantity,
        image: productData.images && productData.images[0] ? productData.images[0] : 'Image/placeholder.png',
        category: productData.category,
        subcategory: productData.subcategory,
        subsubcategory: productData.subsubcategory
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

    const existingItem = cart.find(item => item.id === productData.id);
    if (existingItem) {
        alert('This product is already in your cart!');
        return;
    }

    cart.push(cartItem);

    try {
        localStorage.setItem('cartState', JSON.stringify(cart));
        alert(`Added ${currentQuantity} ${productData.name}(s) to cart at ৳${productData.price.toFixed(2)} ${productData.currency || 'BDT'} each!`);
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

                const cartItem = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    image: product.images && product.images[0] ? product.images[0] : 'Image/placeholder.png',
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

                if (cart.find(item => item.id == productId)) {
                    alert('This product is already in your cart!');
                    return;
                }

                cart.push(cartItem);

                try {
                    localStorage.setItem('cartState', JSON.stringify(cart));
                    alert(`Added ${cartItem.name} to cart at ৳${cartItem.price.toFixed(2)} ${product.currency || 'BDT'}!`);
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