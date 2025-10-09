document.addEventListener('DOMContentLoaded', () => {
    console.info('DOM fully loaded, initializing navigation scripts...');
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

    console.log('Navigation elements selected:', {
        navbar: !!navbar,
        logo: !!logo,
        navLinksWrapper: !!navLinksWrapper,
        hamburger: !!hamburger,
        navLinksCount: navLinks.length
    });

    function debounce(func, wait) {
        console.log(`Creating debounced function with wait time: ${wait}ms`);
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                console.log('Debounced function executed');
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function updateScrollAnimation() {
        const scrollY = window.scrollY;
        console.log(`Scroll position: ${scrollY}px`);
        const progress = Math.min(scrollY / scrollThreshold, 1);
        console.log(`Scroll progress: ${progress}`);
        logo.style.transform = `translateX(${progress * maxTranslate}px)`;
        navLinksWrapper.style.transform = `translateX(${progress * maxLinkTranslate}px)`;
        if (scrollY > classToggleThreshold + 10 && !isScrolled) {
            console.log('Adding scrolled class to navbar');
            navbar.classList.add('scrolled');
            isScrolled = true;
        } else if (scrollY < classToggleThreshold - 10 && isScrolled) {
            console.log('Removing scrolled class from navbar');
            navbar.classList.remove('scrolled');
            isScrolled = false;
        }
    }

    const debouncedScroll = debounce(() => {
        console.log('Triggering scroll animation update');
        requestAnimationFrame(updateScrollAnimation);
    }, 10);

    window.addEventListener('scroll', debouncedScroll);
    console.log('Scroll event listener added');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            console.log('Hamburger menu clicked, toggling nav links');
            navLinksWrapper.classList.toggle('active');
        });
        console.log('Hamburger menu event listener added');
    } else {
        console.warn('Hamburger menu element not found');
    }

    navLinks.forEach((link, index) => {
        link.addEventListener('click', () => {
            console.log(`Navigation link ${index + 1} clicked: ${link.textContent}`);
            navLinksWrapper.classList.remove('active');
        });
    });
    console.log(`Added click listeners to ${navLinks.length} navigation links`);

    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) {
            console.log('Clicked outside navbar, closing nav links');
            navLinksWrapper.classList.remove('active');
        }
    });
    console.log('Document click listener added for closing nav links');
});

class ProductGallery {
    constructor() {
        console.info('Initializing ProductGallery...');
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            category: 'all',
            maxPrice: 100000,
            search: '',
            specifications: {}
        };
        this.currentSort = 'name';
        this.currentSubSubCategory = null;

        console.log('Initial filter state:', this.currentFilters);
        console.log('Initial sort state:', this.currentSort);

        // Specification definitions for different sub-subcategories
        this.specificationDefinitions = {
            'Tiles': {
                'Size': ['12x12', '24x24', '12x24', '18x18', '36x36'],
                'Material': ['Ceramic', 'Porcelain', 'Natural Stone', 'Marble', 'Granite'],
                'Finish': ['Glossy', 'Matte', 'Textured', 'Polished'],
                'Thickness': ['8mm', '10mm', '12mm', '15mm', '20mm']
            },
            'Wood': {
                'Type': ['Oak', 'Pine', 'Mahogany', 'Teak', 'Maple', 'Birch'],
                'Thickness': ['12mm', '15mm', '18mm', '20mm', '25mm'],
                'Grade': ['Premium', 'Standard', 'Economy'],
                'Treatment': ['Treated', 'Untreated', 'Pressure Treated']
            },
            'cement': {
                'Grade': ['OPC 43', 'OPC 53', 'PPC', 'PSC'],
                'Brand': ['Lafarge', 'ACC', 'UltraTech', 'Ambuja', 'Shree'],
                'Pack Size': ['25kg', '50kg'],
                'Setting Time': ['Initial', 'Final', 'Quick Set']
            },
            'Cable': {
                'Type': ['PVC', 'XLPE', 'Armoured', 'Flexible'],
                'Core': ['Single Core', '2 Core', '3 Core', '4 Core'],
                'Size': ['1.5 sq mm', '2.5 sq mm', '4 sq mm', '6 sq mm', '10 sq mm'],
                'Voltage': ['1100V', '3300V', '11KV']
            },
            'Lock': {
                'Type': ['Mortise', 'Cylindrical', 'Deadbolt', 'Smart Lock'],
                'Material': ['Brass', 'Stainless Steel', 'Iron', 'Zinc Alloy'],
                'Security Level': ['Standard', 'High Security', 'Maximum Security'],
                'Finish': ['Chrome', 'Brass', 'Black', 'Satin']
            },
            'Sand': {
                'Type': ['River Sand', 'Sea Sand', 'Pit Sand', 'Fine Sand'],
                'Grade': ['Coarse', 'Medium', 'Fine'],
                'Color': ['White', 'Yellow', 'Red', 'Brown'],
                'Mesh Size': ['20-30', '30-50', '50-70', '70-100']
            },
            'Brick': {
                'Type': ['Red Brick', 'Fly Ash Brick', 'Concrete Brick', 'Clay Brick'],
                'Size': ['Standard', 'Modular', 'King Size', 'Queen Size'],
                'Grade': ['First Class', 'Second Class', 'Third Class'],
                'Strength': ['3.5 MPa', '7 MPa', '10 MPa', '15 MPa']
            },
            'Mirror': {
                'Type': ['Plain Mirror', 'Tinted Mirror', 'Antique Mirror', 'Safety Mirror'],
                'Thickness': ['3mm', '4mm', '5mm', '6mm'],
                'Size': ['2x3 ft', '3x4 ft', '4x6 ft', 'Custom'],
                'Edge': ['Polished', 'Beveled', 'Straight']
            }
        };
        console.log('Specification definitions loaded:', Object.keys(this.specificationDefinitions));

        // Category hierarchy for sidebar and breadcrumbs
        this.categoryHierarchy = {
            'Construction': {
                'Civil Work': ['cement', 'Sand', 'Brick', 'Reinforcement'],
                'interior': ['Tiles', 'Wood', 'FAccessories', 'DAccessories', 'MHardware', 'Lock', 'Mirror'],
                'Paint': ['Waterproofing', 'Interior', 'Exterior', 'Enamel', 'WoodCoating'],
                'electronics': ['MK', 'Universal', 'Gang', 'PVCConduit', 'Cable', 'FanBox', 'LightBox', 'PVCBand', 'Holder', 'OtherEssentialItems'],
                'Sanitary': ['Fittings', 'Fixture', 'Pump']
            }
        };
        console.log('Category hierarchy initialized:', Object.keys(this.categoryHierarchy.Construction));

        // Category mapping
        this.categoryMapping = {
            'Civil Work': { level: 'sub', field: 'subcategory', value: 'Cement' },
            'cement': { level: 'subsub', field: 'subsubcategory', value: 'Portland' }
        };
        console.log('Category mappings loaded:', Object.keys(this.categoryMapping));

        this.breadcrumbElement = document.querySelector('.breadcrumb-list');
        console.log('Breadcrumb element selected:', !!this.breadcrumbElement);

        this.init();
    }

    init() {
        console.info('Starting ProductGallery initialization...');
        this.loadProductsFromJSON();
        this.bindEvents();
        this.addKeyboardNavigation();
        this.updateBreadcrumb();
        const urlParams = new URLSearchParams(window.location.search);
        const initialCategory = urlParams.get('category');
        const initialSearch = urlParams.get('search');
        console.log('URL parameters:', { initialCategory, initialSearch });

        if (initialCategory) {
            console.log(`Setting initial category from URL: ${initialCategory}`);
            this.currentFilters.category = initialCategory;
            const isSubSubCategory = this.isSubSubCategory(initialCategory);
            console.log(`Is ${initialCategory} a sub-subcategory? ${isSubSubCategory}`);
            if (isSubSubCategory) {
                console.log(`Showing specification filter for: ${initialCategory}`);
                this.currentSubSubCategory = initialCategory;
                this.showSpecificationFilter(initialCategory);
            }
            document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
            const targetItem = document.querySelector(`.category-item[data-category="${initialCategory}"]`);
            if (targetItem) {
                console.log(`Activating category item: ${initialCategory}`);
                targetItem.classList.add('active');
            } else {
                console.warn(`Category item not found for: ${initialCategory}`);
            }
            this.loadProductsFromJSON(initialCategory);
        }
        if (initialSearch) {
            console.log(`Setting initial search term: ${initialSearch}`);
            this.currentFilters.search = initialSearch.toLowerCase();
            document.getElementById('searchInput').value = initialSearch;
            this.filterProducts();
        }
        console.info('ProductGallery initialization complete');
    }

    isSubSubCategory(category) {
        const isSubSub = Object.values(this.categoryHierarchy.Construction)
            .some(subCats => subCats.includes(category));
        console.log(`Checking if ${category} is a sub-subcategory: ${isSubSub}`);
        return isSubSub;
    }

    getCategoryMapping(selectedCategory) {
        const mapping = this.categoryMapping[selectedCategory] || {
            level: this.categoryHierarchy[selectedCategory] ? 'main' :
                   Object.keys(this.categoryHierarchy.Construction).includes(selectedCategory) ? 'sub' :
                   this.isSubSubCategory(selectedCategory) ? 'subsub' : 'unknown',
            field: this.categoryHierarchy[selectedCategory] ? 'category' :
                   Object.keys(this.categoryHierarchy.Construction).includes(selectedCategory) ? 'subcategory' :
                   'subsubcategory',
            value: selectedCategory
        };
        console.log(`Category mapping for ${selectedCategory}:`, mapping);
        return mapping;
    }

    loadProductsFromJSON(selectedCategory = null) {
        console.info(`Loading products${selectedCategory ? ` for category: ${selectedCategory}` : ''}...`);
        this.showLoading(true);
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://archimartbd.com/product.json', true);
        console.log('Initiating XHR request to load products');
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('XHR request successful, processing response...');
                    try {
                        let response = JSON.parse(xhr.responseText);
                        let data = response.results || [];
                        console.log(`Received ${data.length} products from JSON`);

                        if (selectedCategory && selectedCategory !== 'all') {
                            const mapping = this.getCategoryMapping(selectedCategory);
                            console.log(`Filtering products by ${mapping.field}=${mapping.value}`);
                            data = data.filter(product => {
                                const match = product[mapping.field] === mapping.value;
                                if (!match) {
                                    console.log(`Product ${product.name} filtered out: ${mapping.field}=${product[mapping.field]} does not match ${mapping.value}`);
                                }
                                return match;
                            });
                            console.log(`Filtered to ${data.length} products for category: ${selectedCategory}`);
                        }

                        this.products = data.map(product => ({
                            id: product.id,
                            name: product.name,
                            description: product.description,
                            category: product.category,
                            subcategory: product.subcategory,
                            subsubcategory: product.subsubcategory,
                            price: product.price,
                            currency: product.currency,
                            stock: product.stock,
                            specifications: product.specifications?.reduce((acc, spec) => {
                                acc[spec.key] = spec.value;
                                return acc;
                            }, {}) || {},
                            image: product.images && product.images.length > 0 
                                ? product.images[0]
                                : this.generateProductImage(product.subcategory || product.category)
                        }));
                        console.log(`Mapped ${this.products.length} products`);

                        this.filteredProducts = [...this.products];
                        console.log(`Initialized filtered products: ${this.filteredProducts.length}`);
                        this.renderProducts();
                        this.updateStats();
                        this.updateBreadcrumb();
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        document.getElementById('productCount').textContent = 'Error loading products';
                    }
                } else {
                    console.error('XHR request failed:', xhr.statusText);
                    document.getElementById('productCount').textContent = 'Error loading products';
                }
                this.showLoading(false);
                console.log('Loading complete, hiding loading indicator');
            }
        };
        xhr.onerror = () => {
            console.error('Network error while loading JSON');
            document.getElementById('productCount').textContent = 'Error loading products';
            this.showLoading(false);
        };
        xhr.send();
        console.log('XHR request sent');
    }

    generateProductImage(category) {
        console.log(`Generating placeholder image for category: ${category}`);
        const colors = ['#FFF3E3', '#E6D5B8', '#D8A48F', '#A68A64', '#736B60', '#4A4238'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        console.log(`Selected color for image: ${color}`);
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
                    </linearGradient>
                </defs>
                <rect width="200" height="200" fill="url(#grad)" rx="15"/>
                <text x="100" y="100" font-family="Arial, sans-serif" font-size="14" 
                      fill="white" text-anchor="middle" dominant-baseline="middle">
                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                </text>
                <circle cx="50" cy="50" r="15" fill="rgba(255,255,255,0.3)"/>
                <circle cx="150" cy="150" r="20" fill="rgba(255,255,255,0.2)"/>
            </svg>
        `)}`;
    }

    bindEvents() {
        console.info('Binding event listeners...');
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                console.log(`Category item clicked: ${e.target.dataset.category}`);
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                e.target.classList.add('active');
                const selectedCategory = e.target.dataset.category;
                this.currentFilters.category = selectedCategory;
                console.log(`Updated current category: ${selectedCategory}`);

                const isSubSubCategory = this.isSubSubCategory(selectedCategory);
                if (isSubSubCategory) {
                    console.log(`Showing specification filter for sub-subcategory: ${selectedCategory}`);
                    this.currentSubSubCategory = selectedCategory;
                    this.showSpecificationFilter(selectedCategory);
                } else {
                    console.log('Hiding specification filter');
                    this.currentSubSubCategory = null;
                    this.hideSpecificationFilter();
                }

                this.loadProductsFromJSON(selectedCategory);
                this.updateBreadcrumb();
            });
        });
        console.log('Category item click listeners bound');

        const priceRange = document.getElementById('priceRange');
        priceRange.addEventListener('input', (e) => {
            this.currentFilters.maxPrice = parseInt(e.target.value);
            console.log(`Price range updated: ${this.currentFilters.maxPrice}`);
            document.getElementById('maxPrice').textContent = `৳${e.target.value}`;
            this.filterProducts();
        });
        console.log('Price range input listener bound');

        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            console.log(`Search input changed: ${e.target.value}`);
            searchTimeout = setTimeout(() => {
                this.currentFilters.search = e.target.value.toLowerCase();
                console.log(`Applying search filter: ${this.currentFilters.search}`);
                this.filterProducts();
            }, 300);
        });
        console.log('Search input listener bound');

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            console.log(`Sort option changed: ${this.currentSort}`);
            this.sortProducts();
            this.renderProducts();
        });
        console.log('Sort select listener bound');
    }

    showSpecificationFilter(category) {
        console.info(`Showing specification filter for category: ${category}`);
        const specFilter = document.getElementById('specificationFilter');
        const specContent = document.getElementById('specificationContent');
        
        if (this.specificationDefinitions[category]) {
            console.log(`Found specification definitions for ${category}`);
            let html = '';
            const specs = this.specificationDefinitions[category];
            
            for (const [specType, options] of Object.entries(specs)) {
                console.log(`Generating filter for spec type: ${specType}`);
                html += `
                    <div class="spec-group">
                        <h4>${specType}</h4>
                        <div class="spec-options">
                `;
                
                options.forEach(option => {
                    const isChecked = this.currentFilters.specifications[specType]?.includes(option) ? 'checked' : '';
                    html += `
                        <label>
                            <input type="checkbox" value="${option}" data-spec-type="${specType}" ${isChecked}>
                            <span>${option}</span>
                        </label>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            specContent.innerHTML = html;
            console.log('Specification filter HTML generated');
            
            const specHeader = specFilter.querySelector('h3');
            if (!specHeader.querySelector('.spec-close-btn')) {
                console.log('Adding close button to specification filter');
                const closeBtn = document.createElement('button');
                closeBtn.className = 'spec-close-btn';
                closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                closeBtn.setAttribute('aria-label', 'Close specifications');
                closeBtn.onclick = () => this.hideSpecificationFilter();
                specHeader.appendChild(closeBtn);
            }
            
            specContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    console.log(`Specification checkbox changed: ${e.target.value} (${e.target.checked ? 'checked' : 'unchecked'})`);
                    this.handleSpecificationChange(e);
                });
            });
            console.log('Specification checkbox listeners bound');
            
            specFilter.classList.add('show');
            console.log('Specification filter shown');
            
            if (window.innerWidth <= 768) {
                console.log('Mobile view detected, scrolling to specification filter');
                setTimeout(() => {
                    specFilter.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 300);
            }
        } else {
            console.warn(`No specification definitions found for category: ${category}`);
        }
    }

    hideSpecificationFilter() {
        console.info('Hiding specification filter');
        const specFilter = document.getElementById('specificationFilter');
        specFilter.classList.remove('show');
        this.currentFilters.specifications = {};
        console.log('Cleared specification filters:', this.currentFilters.specifications);
        
        if (this.currentSubSubCategory) {
            console.log(`Resetting sub-subcategory: ${this.currentSubSubCategory}`);
            this.currentSubSubCategory = null;
            
            const activeSubSubCat = document.querySelector('.sub-subcategory.active');
            if (activeSubSubCat) {
                console.log('Removing active class from sub-subcategory');
                activeSubSubCat.classList.remove('active');
                
                const parentSubcat = document.querySelector('.subcategory.active') || 
                    document.querySelector('.category-item[data-category="Civil Work"]');
                if (parentSubcat) {
                    console.log(`Activating parent subcategory: ${parentSubcat.dataset.category}`);
                    parentSubcat.classList.add('active');
                    this.currentFilters.category = parentSubcat.dataset.category;
                }
            }
        }
        
        this.filterProducts();
        this.updateBreadcrumb();
    }

    addKeyboardNavigation() {
        console.log('Adding keyboard navigation listener');
        document.addEventListener('keydown', (e) => {
            const specFilter = document.getElementById('specificationFilter');
            if (e.key === 'Escape' && specFilter.classList.contains('show')) {
                console.log('Escape key pressed, hiding specification filter');
                this.hideSpecificationFilter();
            }
        });
    }

    handleSpecificationChange(event) {
        const specType = event.target.dataset.specType;
        const value = event.target.value;
        const isChecked = event.target.checked;
        console.log(`Handling specification change: ${specType} = ${value} (${isChecked ? 'checked' : 'unchecked'})`);

        if (!this.currentFilters.specifications[specType]) {
            console.log(`Initializing specification filter for ${specType}`);
            this.currentFilters.specifications[specType] = [];
        }

        if (isChecked) {
            if (!this.currentFilters.specifications[specType].includes(value)) {
                console.log(`Adding ${value} to ${specType} specifications`);
                this.currentFilters.specifications[specType].push(value);
            }
        } else {
            console.log(`Removing ${value} from ${specType} specifications`);
            this.currentFilters.specifications[specType] = this.currentFilters.specifications[specType].filter(v => v !== value);
            if (this.currentFilters.specifications[specType].length === 0) {
                console.log(`Removing empty ${specType} specification`);
                delete this.currentFilters.specifications[specType];
            }
        }

        console.log('Current specifications:', this.currentFilters.specifications);
        this.filterProducts();
    }

    clearSpecifications() {
        console.info('Clearing all specifications');
        this.currentFilters.specifications = {};
        
        const checkboxes = document.querySelectorAll('#specificationContent input[type="checkbox"]');
        console.log(`Found ${checkboxes.length} specification checkboxes to clear`);
        checkboxes.forEach((checkbox, index) => {
            setTimeout(() => {
                console.log(`Clearing checkbox ${index + 1}: ${checkbox.value}`);
                checkbox.checked = false;
                checkbox.closest('label').style.transform = 'scale(0.95)';
                setTimeout(() => {
                    checkbox.closest('label').style.transform = '';
                }, 100);
            }, index * 50);
        });
        
        const clearBtn = document.querySelector('.clear-specs');
        const originalText = clearBtn.innerHTML;
        console.log('Animating clear specifications button');
        clearBtn.innerHTML = '<i class="fas fa-check"></i> Cleared!';
        clearBtn.style.background = '#28a745';
        clearBtn.style.borderColor = '#28a745';
        clearBtn.style.color = 'white';
        
        setTimeout(() => {
            console.log('Resetting clear specifications button');
            clearBtn.innerHTML = originalText;
            clearBtn.style.background = '';
            clearBtn.style.borderColor = '';
            clearBtn.style.color = '';
        }, 1500);
        
        this.filterProducts();
    }

    filterProducts() {
        console.info('Filtering products...');
        this.showLoading(true);

        setTimeout(() => {
            const mapping = this.getCategoryMapping(this.currentFilters.category);
            console.log('Filter criteria:', this.currentFilters);
            this.filteredProducts = this.products.filter(product => {
                let categoryMatch = true;
                if (this.currentFilters.category !== 'all') {
                    categoryMatch = product[mapping.field] === mapping.value;
                    if (!categoryMatch) {
                        console.log(`Product ${product.name} filtered out: ${mapping.field}=${product[mapping.field]} does not match ${mapping.value}`);
                    }
                }

                const priceMatch = product.price <= this.currentFilters.maxPrice;
                console.log(`Product ${product.name} price match: ${priceMatch} (price: ${product.price}, max: ${this.currentFilters.maxPrice})`);

                const searchMatch = !this.currentFilters.search ||
                    product.name.toLowerCase().includes(this.currentFilters.search) ||
                    product.description.toLowerCase().includes(this.currentFilters.search) ||
                    product.category.toLowerCase().includes(this.currentFilters.search) ||
                    product.subcategory.toLowerCase().includes(this.currentFilters.search) ||
                    product.subsubcategory.toLowerCase().includes(this.currentFilters.search);
                console.log(`Product ${product.name} search match: ${searchMatch} (search: ${this.currentFilters.search})`);

                let specMatch = true;
                if (Object.keys(this.currentFilters.specifications).length > 0) {
                    for (const [specType, selectedValues] of Object.entries(this.currentFilters.specifications)) {
                        if (selectedValues.length > 0) {
                            const productSpecValue = product.specifications && product.specifications[specType];
                            if (!productSpecValue || !selectedValues.includes(productSpecValue)) {
                                specMatch = false;
                                console.log(`Product ${product.name} filtered out: ${specType}=${productSpecValue} not in ${selectedValues}`);
                                break;
                            }
                        }
                    }
                }

                const matchesAll = categoryMatch && priceMatch && searchMatch && specMatch;
                console.log(`Product ${product.name} matches all filters: ${matchesAll}`);
                return matchesAll;
            });

            console.log(`Filtered ${this.filteredProducts.length} products`);
            this.sortProducts();
            this.renderProducts();
            this.updateStats();
            this.updateBreadcrumb();
            this.showLoading(false);
            console.log('Filtering complete');
        }, 300);
    }

    sortProducts() {
        console.info(`Sorting products by: ${this.currentSort}`);
        this.filteredProducts.sort((a, b) => {
            switch (this.currentSort) {
                case 'price-low':
                    console.log('Sorting by price (low to high)');
                    return a.price - b.price;
                case 'price-high':
                    console.log('Sorting by price (high to low)');
                    return b.price - a.price;
                case 'category':
                    console.log('Sorting by category');
                    return a.category.localeCompare(b.category);
                default:
                    console.log('Sorting by name');
                    return a.name.localeCompare(b.name);
            }
        });
        console.log('Sorting complete');
    }

    renderProducts() {
        console.info('Rendering products...');
        const grid = document.getElementById('productGrid');
        const noResults = document.querySelector('.no-results');

        if (this.filteredProducts.length === 0) {
            console.log('No products to render, showing no results message');
            grid.innerHTML = '';
            grid.style.display = 'grid';
            noResults.style.display = 'block';
            return;
        }

        console.log(`Rendering ${this.filteredProducts.length} products`);
        grid.style.display = 'grid';
        noResults.style.display = 'none';

        grid.innerHTML = this.filteredProducts.map(product => {
            let specsHtml = '';
            if (product.specifications && Object.keys(product.specifications).length > 0) {
                specsHtml = `
                    <div class="product-specs">
                        ${Object.entries(product.specifications).map(([key, value]) => 
                            `<span class="spec-tag">${key}: ${value}</span>`
                        ).join('')}
                    </div>
                `;
            }

            return `
                <div class="product-card" data-id="${product.id}">
                    <a href="details.html?id=${product.id}" class="product-image">
                        <img src="${product.image}" alt="${product.name}">
                    </a>
                    <div class="product-info">
                        <h3 class="product-name">
                            <a href="details.html?id=${product.id}">${product.name}</a>
                        </h3>
                        <div class="product-category">${product.subcategory || product.category}</div>
                        ${specsHtml}
                        <div class="product-price">৳${product.price.toFixed(2)}</div>
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="gallery.addToCart(${product.id})">
                                Add to Cart
                            </button>
                            <a href="details.html?id=${product.id}" class="btn btn-secondary">
                                View Details
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            console.log('Applying slide-in animations to product cards');
            document.querySelectorAll('.product-card').forEach((card, index) => {
                card.style.animation = `slideInUp 0.6s ease forwards ${index * 0.1}s`;
            });
        }, 100);
        console.log('Product rendering complete');
    }

    updateStats() {
        console.info('Updating product stats...');
        const total = this.products.length;
        const filtered = this.filteredProducts.length;
        const activeFilters = [];

        if (this.currentFilters.category !== 'all') {
            activeFilters.push(`Category: ${this.currentFilters.category}`);
        }
        if (this.currentFilters.maxPrice < 100000) {
            activeFilters.push(`Max Price: ৳${this.currentFilters.maxPrice}`);
        }
        if (this.currentFilters.search) {
            activeFilters.push(`Search: "${this.currentFilters.search}"`);
        }
        if (Object.keys(this.currentFilters.specifications).length > 0) {
            const specCount = Object.values(this.currentFilters.specifications).reduce((acc, arr) => acc + arr.length, 0);
            activeFilters.push(`Specifications: ${specCount} selected`);
        }

        console.log('Stats:', { total, filtered, activeFilters });
        document.getElementById('productCount').textContent =
            `Showing ${filtered} of ${total} products`;

        document.getElementById('activeFilters').textContent =
            activeFilters.length > 0 ? `Filters: ${activeFilters.join(', ')}` : '';
        console.log('Stats updated');
    }

    showLoading(show) {
        console.log(`Toggling loading indicator: ${show}`);
        const loading = document.querySelector('.loading');
        document.getElementById('productGrid').style.display = show ? 'none' : 'grid';
        loading.style.display = show ? 'block' : 'none';
    }

    addToCart(productId) {
        console.info(`Adding product to cart: ID ${productId}`);
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }
        console.log('Product found:', product.name);

        let cart = [];
        try {
            const savedCart = localStorage.getItem('cartState');
            if (savedCart) {
                console.log('Loading existing cart from localStorage');
                cart = JSON.parse(savedCart);
            }
        } catch (e) {
            console.error('Error loading cart from localStorage:', e);
        }

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            console.log('Product already in cart:', product.name);
            alert('This product is already in your cart!');
            return;
        }

        console.log(`Adding new item to cart: ${product.name}`);
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
            category: product.category,
            subcategory: product.subcategory,
            subsubcategory: product.subsubcategory
        });

        try {
            console.log('Saving cart to localStorage');
            localStorage.setItem('cartState', JSON.stringify(cart));
            alert(`${product.name} added to cart!`);
        } catch (e) {
            console.error('Error saving cart to localStorage:', e);
            alert('Failed to add to cart. Please try again.');
        }

        const card = document.querySelector(`[data-id="${productId}"]`);
        if (card) {
            console.log('Animating product card');
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        }
    }

    updateBreadcrumb() {
        console.info('Updating breadcrumb...');
        if (!this.breadcrumbElement) {
            console.warn('Breadcrumb element not found');
            return;
        }

        const breadcrumb = ['<li><a href="index.html">Home</a></li>'];
        const categoryPath = this.getCategoryPath(this.currentFilters.category);
        console.log('Category path:', categoryPath);

        categoryPath.forEach((cat, index) => {
            const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1').trim();
            const href = this.getCategoryHref(cat);
            breadcrumb.push(`<li><a href="${href}" data-category="${cat}">${formattedCat}</a></li>`);
        });

        if (this.currentSubSubCategory) {
            const formattedSubSubCat = this.currentSubSubCategory.charAt(0).toUpperCase() + 
                this.currentSubSubCategory.slice(1).replace(/([A-Z])/g, ' $1').trim();
            breadcrumb.push(`<li class="current">${formattedSubSubCat}</li>`);
        } else if (this.currentFilters.category !== 'all') {
            const formattedCat = this.currentFilters.category.charAt(0).toUpperCase() + 
                this.currentFilters.category.slice(1).replace(/([A-Z])/g, ' $1').trim();
            breadcrumb.push(`<li class="current">${formattedCat}</li>`);
        }

        this.breadcrumbElement.innerHTML = breadcrumb.join('');
        console.log('Breadcrumb HTML updated:', breadcrumb.join(''));

        this.breadcrumbElement.querySelectorAll('a[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.dataset.category;
                console.log(`Breadcrumb link clicked: ${category}`);
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                const targetItem = document.querySelector(`.category-item[data-category="${category}"]`);
                if (targetItem) {
                    console.log(`Activating category item: ${category}`);
                    targetItem.classList.add('active');
                    this.currentFilters.category = category;
                    this.currentSubSubCategory = null;
                    this.hideSpecificationFilter();
                    this.loadProductsFromJSON(category);
                    this.updateBreadcrumb();
                }
            });
        });
        console.log('Breadcrumb click listeners bound');
    }

    getCategoryPath(category) {
        console.log(`Getting category path for: ${category}`);
        if (category === 'all') return [];

        const path = [];
        let currentCategory = category;

        for (const [mainCat, subCats] of Object.entries(this.categoryHierarchy)) {
            for (const [subCat, subSubCats] of Object.entries(subCats)) {
                if (subSubCats.includes(currentCategory)) {
                    path.unshift(currentCategory);
                    path.unshift(subCat);
                    path.unshift(mainCat);
                    console.log(`Category path found: ${path.join(' > ')}`);
                    return path;
                }
            }
            if (Object.keys(subCats).includes(currentCategory)) {
                path.unshift(currentCategory);
                path.unshift(mainCat);
                console.log(`Category path found: ${path.join(' > ')}`);
                return path;
            }
        }

        if (this.categoryHierarchy[currentCategory]) {
            path.unshift(currentCategory);
        }

        console.log(`Category path: ${path.join(' > ') || 'none'}`);
        return path;
    }

    getCategoryHref(category) {
        const href = `Construction.html?category=${encodeURIComponent(category)}`;
        console.log(`Generated href for category ${category}: ${href}`);
        return href;
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
console.log('Slide-in animation CSS added');

const gallery = new ProductGallery();
console.info('ProductGallery instance created');