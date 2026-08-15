let cart = JSON.parse(localStorage.getItem("cart")) || [];


// ===============================
// SAVE CART
// ===============================
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}


// ===============================
// REMOVE PRODUCT
// ===============================
function removeFromCart(id) {

    id = String(id);

    cart = cart.filter(item => String(item.id) !== id);

    saveCart();
    updateCartCount();

    if (typeof loadCart === "function") {
        loadCart();
    }
}


// ===============================
// INCREASE QUANTITY
// ===============================
function increaseQty(id) {

    id = String(id);

    let item = cart.find(
        product => String(product.id) === id
    );

    if (item) {

        item.quantity =
            Number(item.quantity) + 1;

        saveCart();
        updateCartCount();

        if (typeof loadCart === "function") {
            loadCart();
        }

    }
}


// ===============================
// DECREASE QUANTITY
// ===============================
function decreaseQty(id) {

    id = String(id);

    let item = cart.find(
        product => String(product.id) === id
    );

    if (!item) {
        return;
    }

    if (Number(item.quantity) > 1) {

        item.quantity =
            Number(item.quantity) - 1;

    } else {

        cart = cart.filter(
            product => String(product.id) !== id
        );

    }

    saveCart();
    updateCartCount();

    if (typeof loadCart === "function") {
        loadCart();
    }
}


// ===============================
// CLEAR CART
// ===============================
function clearCart() {

    cart = [];

    saveCart();
    updateCartCount();

    if (typeof loadCart === "function") {
        loadCart();
    }

    alert("🛒 Cart Cleared Successfully!");
}


// ===============================
// CART COUNT
// ===============================
function updateCartCount() {

    let cartData =
        JSON.parse(localStorage.getItem("cart")) || [];

    let totalItems = 0;

    cartData.forEach(item => {

        totalItems +=
            Number(item.quantity) || 0;

    });

    let cartCount =
        document.getElementById("cartCount");

    if (cartCount) {

        cartCount.innerText =
            totalItems;

    }
}


// ===============================
// INITIALIZE
// ===============================
updateCartCount();