const { jsPDF } = window.jspdf;

// Initialize cartItems from localStorage
let cartItems = [];
function loadInitialCart() {
  try {
    const savedCart = localStorage.getItem('cartState');
    console.log('Loaded cartState from localStorage:', savedCart); // Debug: Raw data
    if (savedCart) {
      cartItems = JSON.parse(savedCart);
      // Validate prices
      cartItems.forEach((item, index) => {
        if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
          console.error(`Invalid price for item ${item.name} at index ${index}: ${item.price}`);
          item.price = 0; // Fallback to 0, but log error
        } else {
          console.log(`Loaded price for ${item.name}: ${item.price} Tk`); // Debug: Confirm price
        }
      });
    } else {
      cartItems = [];
      console.log('No cartState found; cart is empty');
    }
  } catch (e) {
    console.error("Error loading cart state:", e);
    cartItems = [];
  }
  console.log('cartItems after initialization:', cartItems); // Debug: Final state
}

let currentItemType = 'default'; // Track current item type (not affecting price)

// Generate dynamic receipt number in format ARCHM/MMYYYY/NNNN
function generateReceiptNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Get month (1-12, padded)
  const year = now.getFullYear(); // Get full year
  const timestamp = Date.now();
  const receiptNo = String(timestamp).slice(-4).padStart(4, '0');
  return `ARCHM/${month}${year}/${receiptNo}`;
}

function changeQuantity(index, change) {
  if (index >= 0 && index < cartItems.length) {
    cartItems[index].quantity = Math.max(1, cartItems[index].quantity + change);
    console.log(`Updated quantity for ${cartItems[index].name}: ${cartItems[index].quantity}`); // Debug
    updateCartDisplay();
    saveCartState();
  }
}

function updateCartDisplay() {
  let totalAmount = 0;

  cartItems.forEach((item, index) => {
    const qtyDisplay = document.getElementById(`qty-${index}`);
    const priceDisplay = document.getElementById(`price-${index}`);

    if (qtyDisplay && priceDisplay) {
      qtyDisplay.textContent = item.quantity;
      const itemTotal = (item.price || 0) * item.quantity;
      priceDisplay.textContent = `${itemTotal.toFixed(2)} Tk`; // Display exact price
      totalAmount += itemTotal;
      console.log(`Displaying ${item.name}: ${item.price} Tk x ${item.quantity} = ${itemTotal.toFixed(2)} Tk`); // Debug
    } else {
      console.warn(`Element not found for item at index ${index}`); // Debug
    }
  });

  const totalElement = document.getElementById("receipt-total")?.querySelector("span:last-child");
  if (totalElement) {
    totalElement.textContent = `${totalAmount.toFixed(2)} Tk`;
    console.log(`Total amount: ${totalAmount.toFixed(2)} Tk`); // Debug
  } else {
    console.warn("Total element not found");
  }
}

function saveCartState() {
  try {
    localStorage.setItem('cartState', JSON.stringify(cartItems));
    console.log('Saved cartState to localStorage:', cartItems); // Debug
  } catch (e) {
    console.error("Error saving cart state:", e);
  }
}

function loadCartState() {
  loadInitialCart(); // Reuse initialization logic
}

function clearCart() {
  cartItems = [];
  currentItemType = 'default';
  localStorage.removeItem('cartState');
  localStorage.removeItem('currentItemType');
  localStorage.removeItem('cartStateForCompare');
  updateCartDisplay();
  populateReceipt(cartItems, 0);
  console.log('Cart cleared:', cartItems); // Debug
}

function downloadPDF() {
  // Require form data and payment before allowing download
  const name = document.getElementById("input-name")?.value.trim() || "";
  const phone = document.getElementById("input-phone")?.value.trim() || "";
  const address = document.getElementById("input-address")?.value.trim() || "";
  const paymentSelected = document.querySelector('input[name="payment"]:checked');

  if (!name || !phone || !address) {
    alert("Please fill Name, Phone and Delivery Address before downloading the receipt.");
    return;
  }
  if (!paymentSelected) {
    alert("Please select a payment method before downloading the receipt.");
    return;
  }

  if (cartItems.length === 0) {
    alert("Cannot download PDF: Cart is empty.");
    return;
  }

  const element = document.getElementById("receipt");
  const downloadBtn = document.querySelector(".download-btn");
  const items = document.querySelectorAll("#receipt-items li");
  const qtyButtons = document.querySelectorAll(".qty-btn, .delete-btn");
  const clearCartBtn = document.querySelector('.clear-cart-btn');

  // Hide quantity control buttons (plus, minus, delete) and add PDF-specific class
  qtyButtons.forEach(button => {
    button.style.display = "none";
  });
  items.forEach(item => {
    item.classList.add("pdf-quantity-only");
  });

  // hide clear cart button while generating PDF (optional)
  if (clearCartBtn) clearCartBtn.style.display = "none";

  // Add copyright line
  let copyrightDiv = document.getElementById("copyright-line");
  if (!copyrightDiv) {
    copyrightDiv = document.createElement("div");
    copyrightDiv.id = "copyright-line";
    copyrightDiv.style.textAlign = "center";
    copyrightDiv.style.fontSize = "12px";
    copyrightDiv.style.color = "#666";
    copyrightDiv.style.marginTop = "20px";
    copyrightDiv.textContent = "Receipt downloaded from Archimart BD © 2025";
    element.appendChild(copyrightDiv);
  }

  downloadBtn.style.display = "none";

  const a4Width = 210;
  const a4Height = 297;

  html2canvas(element, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const imgProps = pdf.getImageProperties(imgData);
    const canvasAspectRatio = imgProps.width / imgProps.height;
    const a4AspectRatio = a4Width / a4Height;

    let imgWidth, imgHeight;
    if (canvasAspectRatio > a4AspectRatio) {
      imgWidth = a4Width;
      imgHeight = a4Width / canvasAspectRatio;
    } else {
      imgHeight = a4Height;
      imgWidth = a4Height * canvasAspectRatio;
    }

    const xOffset = (a4Width - imgWidth) / 2;
    const yOffset = (a4Height - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
    pdf.save("archimart-receipt.pdf");

    // Restore visibility of buttons, remove PDF-specific class, and show download button
    qtyButtons.forEach(button => {
      button.style.display = "flex";
    });
    items.forEach(item => {
      item.classList.remove("pdf-quantity-only");
    });
    downloadBtn.style.display = "block";
    // Ensure Clear Cart button is visible after download
    if (clearCartBtn) clearCartBtn.style.display = "block";
  }).catch(error => {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
    // Restore visibility even on error
    qtyButtons.forEach(button => {
      button.style.display = "flex";
    });
    items.forEach(item => {
      item.classList.remove("pdf-quantity-only");
    });
    downloadBtn.style.display = "block";
    // Ensure Clear Cart button is visible after failure as well
    if (clearCartBtn) clearCartBtn.style.display = "block";
  });
}

function updatePayableTo() {
  const nameInput = document.getElementById("input-name")?.value.trim() || "";
  const phoneInput = document.getElementById("input-phone")?.value.trim() || "";
  const addressInput = document.getElementById("input-address")?.value.trim() || "";
  const paymentSelected = document.querySelector('input[name="payment"]:checked');

  // Determine payment label text (prefer the label text if available)
  let paymentText = "Not selected";
  let paymentValue = "";
  if (paymentSelected) {
    paymentValue = paymentSelected.value || "";
    const lbl = document.querySelector(`label[for="${paymentSelected.id}"]`);
    paymentText = lbl ? lbl.textContent.trim() : (paymentSelected.value || "Selected");
  }

  document.getElementById("payable-name").textContent = nameInput || "Your Name";
  document.getElementById("payable-phone").textContent = phoneInput || "Your Phone";
  document.getElementById("payable-address").textContent = addressInput || "Your Address";
  const payablePaymentEl = document.getElementById("payable-payment");
  if (payablePaymentEl) payablePaymentEl.textContent = paymentText;

  try {
    localStorage.setItem("cartFormData", JSON.stringify({
      name: nameInput,
      phone: phoneInput,
      address: addressInput,
      payment: paymentValue
    }));
  } catch (e) {
    console.error("Error saving form data to localStorage:", e);
  }
}

function deleteCartItem(index) {
  if (index >= 0 && index < cartItems.length) {
    console.log(`Removing item: ${cartItems[index].name}`); // Debug
    cartItems.splice(index, 1);
    saveCartState();
    updateCartDisplay();
    populateReceipt(cartItems, cartItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0));
  }
}

function populateReceipt(items, total) {
  const itemsList = document.getElementById("receipt-items");
  const totalElement = document.getElementById("receipt-total")?.querySelector("span:last-child");
  const dateElement = document.getElementById("receipt-date");
  const receiptHeader = document.querySelector(".receipt-header span:first-child");
  const confirmBtn = document.querySelector(".confirm-btn");
  const downloadBtn = document.querySelector(".download-btn");

  // Update receipt header with dynamic number
  receiptHeader.textContent = generateReceiptNumber();
  dateElement.textContent = `Date - ${new Date().toLocaleDateString()}`;

  if (items.length === 0) {
    itemsList.innerHTML = '<li style="text-align: center;">Your cart is empty</li>';
    totalElement.textContent = "0 Tk";
    confirmBtn.disabled = true;
    downloadBtn.disabled = true;
    return;
  } else {
    confirmBtn.disabled = false;
    downloadBtn.disabled = false;
  }

  itemsList.innerHTML = "";
  items.forEach((item, index) => {
    const itemTotal = (item.price || 0) * item.quantity;
    console.log(`Rendering ${item.name}: ${item.price} Tk x ${item.quantity} = ${itemTotal.toFixed(2)} Tk`); // Debug
    itemsList.innerHTML += `
      <li>
        <div class="item-details">
          <span>${index + 1}. ${item.name}</span>
          <div class="quantity-controls">
            <button class="qty-btn" onclick="changeQuantity(${index}, -1)">−</button>
            <span class="qty-display" id="qty-${index}">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
            <button class="delete-btn" onclick="deleteCartItem(${index})" title="Remove item">🗑️</button>
          </div>
        </div>
        <span class="item-price" id="price-${index}">${itemTotal.toFixed(2)} Tk</span>
      </li>
    `;
  });

  cartItems = items;
  totalElement.textContent = `${total.toFixed(2)} Tk`;
  updatePayableTo();
}





function changeAlt(option) {
  if (cartItems.length === 0 || window.location.search.includes("combined=true")) {
    alert("Cannot change alternate option: Cart is empty or combined selection is active.");
    return;
  }

  // Collect product ids from cartItems (assume each item has an id property)
  const productIds = cartItems.map(item => item.id).filter(Boolean).join(",");
  if (!productIds) {
    alert("No product IDs found in cart items.");
    return;
  }

  // Call the get_similar_product URL (GET request)
  const url = `https://archimartbd.com/api/similar-products/?product_id=${encodeURIComponent(productIds)}&option=${encodeURIComponent(option)}`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch similar product");
      return response.json();
    })
    .then(data => {
      // data is an array of products with possible alternate
      cartItems = cartItems.map(item => {
        // Find matching product in response (by id or product_id)
        const found = data.find(d => (d.product_id == item.id || d.product_id == item.product_id));
        if (found && found.alternate) {
          // Only update name and price, keep original id and quantity
          return {
            ...item,
            name: found.alternate.name,
            price: found.alternate.price,
            // keep original id and quantity
          };
        }
        return item;
      });
      updateCartDisplay();
      populateReceipt(cartItems, cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0));
      // Do NOT save to localStorage after fetching alternate data
    })
    .catch(error => {
      console.error(error);
    });

  currentItemType = option;


  const highBtn = document.querySelector(".alt-btnl.high");
  const lowBtn = document.querySelector(".alt-btn.low");
  
  if (option === "high") {
    highBtn.textContent = "Selected Higher Price Option";
    lowBtn.textContent = "Alternate option with lower price";
  } else if (option === "low") { 
    highBtn.textContent = "Alternate option with higher price";
    lowBtn.textContent = "Selected Lower Price Option";
  } else {
    highBtn.textContent = "Alternate option with higher price";
    lowBtn.textContent = "Alternate option with lower price";
  }

  const compareHighBtn = document.querySelector(".compare-btn.high");
  const compareLowBtn = document.querySelector(".compare-btn.low");
  compareHighBtn.style.display = option === "high" ? "block" : "none";
  compareLowBtn.style.display = option === "low" ? "block" : "none";

}


function goToCompare(option) {
  if (cartItems.length === 0) {
    alert("Cannot compare: Cart is empty.");
    return;
  }
  try {
    localStorage.setItem('cartStateForCompare', JSON.stringify(cartItems));
  } catch (e) {
    console.error("Error saving cart state for compare:", e);
  }
  // add query param to Compare.html
  window.location.href = `Compare.html?option=${encodeURIComponent(option)}`;
}

function continueShopping() {
  window.location.href = "index.html";
}

document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const isCombined = urlParams.get('combined') === 'true';

  try {
    const formData = JSON.parse(localStorage.getItem('cartFormData')) || {};
    document.getElementById("input-name").value = formData.name || "";
    document.getElementById("input-phone").value = formData.phone || "";
    document.getElementById("input-address").value = formData.address || "";
    // Restore payment selection if saved
    if (formData.payment) {
      const savedRadio = document.querySelector(`input[name="payment"][value="${formData.payment}"]`);
      if (savedRadio) savedRadio.checked = true;
    }
  } catch (e) {
    console.error("Error loading form data from localStorage:", e);
  }

  // Load cart items
  loadInitialCart();

  if (isCombined) {
    try {
      const combinedSelection = JSON.parse(localStorage.getItem('combinedSelection'));
      if (combinedSelection && combinedSelection.items) {
        const itemsWithQuantities = combinedSelection.items.map(item => ({
          ...item,
          quantity: item.quantity || 1
        }));
        console.log('Loaded combined selection:', itemsWithQuantities); // Debug
        populateReceipt(itemsWithQuantities, combinedSelection.totalAmount);

        document.querySelector(".alt-btnl.high").disabled = true;
        document.querySelector(".alt-btn.low").disabled = true;
        document.querySelector(".compare-btn.high").style.display = "none";
        document.querySelector(".compare-btn.low").style.display = "none";
      } else {
        const total = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
        populateReceipt(cartItems, total);
      }
    } catch (e) {
      console.error('Error loading combined selection:', e);
      alert('Failed to load combined selection. Showing current cart.');
      const total = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
      populateReceipt(cartItems, total);
    }
  } else {
    const total = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    console.log('Initial total:', total); // Debug
    populateReceipt(cartItems, total);
  }

  // Update button states
  const highBtn = document.querySelector(".alt-btnl.high");
  const lowBtn = document.querySelector(".alt-btn.low");
  const compareHighBtn = document.querySelector(".compare-btn.high");
  const compareLowBtn = document.querySelector(".compare-btn.low");

  if (cartItems.length === 0) {
    highBtn.disabled = true;
    lowBtn.disabled = true;
    compareHighBtn.style.display = "none";
    compareLowBtn.style.display = "none";
  } else if (currentItemType === "high") {
    highBtn.textContent = "Selected Higher Price Option";
    lowBtn.textContent = "Alternate option with lower price";
    compareHighBtn.style.display = "block";
    compareLowBtn.style.display = "none";
  } else if (currentItemType === "low") {
    highBtn.textContent = "Alternate option with higher price";
    lowBtn.textContent = "Selected Lower Price Option";
    compareHighBtn.style.display = "none";
    compareLowBtn.style.display = "block";
  } else {
    highBtn.textContent = "Alternate option with higher price";
    lowBtn.textContent = "Alternate option with lower price";
    compareHighBtn.style.display = "none";
    compareLowBtn.style.display = "none";
  }

  // Add Clear Cart button
  const receiptSection = document.getElementById("receipt");
  const clearCartBtn = document.createElement("button");
  clearCartBtn.textContent = "Clear Cart";
  clearCartBtn.className = "btn clear-cart-btn";
  clearCartBtn.style.marginTop = "10px";
  clearCartBtn.onclick = clearCart;
  receiptSection.appendChild(clearCartBtn);

  document.getElementById("input-name")?.addEventListener('input', updatePayableTo);
  document.getElementById("input-phone")?.addEventListener('input', updatePayableTo);
  document.getElementById("input-address")?.addEventListener('input', updatePayableTo);

  // Ensure payment radio changes update payable-to immediately
  const paymentRadios = document.querySelectorAll('input[name="payment"]');
  paymentRadios.forEach(r => r.addEventListener('change', updatePayableTo));

  // call once to set payable payment text from restored state
  updatePayableTo();

  document.querySelector('.confirm-btn').addEventListener('click', function (e) {
    if (cartItems.length === 0) {
      alert("Cannot confirm order: Cart is empty.");
      return;
    }

    const inputs = document.querySelectorAll('input[required]');
    const paymentSelected = document.querySelector('input[name="payment"]:checked');

    let allValid = true;
    inputs.forEach(input => {
      if (!input.value.trim()) {
        input.style.borderColor = '#ff4444';
        allValid = false;
      } else {
        input.style.borderColor = '#ddd';
      }
    });

    if (!paymentSelected) {
      alert('Please select a payment method');
      allValid = false;
    }

    if (allValid) {
      alert('Order confirmed! You will receive a confirmation shortly.');
      localStorage.removeItem('combinedSelection');
      localStorage.removeItem('cartFormData');
      localStorage.removeItem('cartState');
      localStorage.removeItem('cartStateForCompare');

      document.getElementById("input-name").value = "";
      document.getElementById("input-phone").value = "";
      document.getElementById("input-address").value = "";

      clearCart();
      const total = 0;
      populateReceipt(cartItems, total);
      updatePayableTo();
    }
  });
});

