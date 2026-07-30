let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save Cart
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Remove Product
function removeFromCart(id) {

    cart = cart.filter(item => item.id != id);

    saveCart();

    updateCartCount();

    loadCart();
}

// Increase Quantity
function increaseQty(id) {

    let item = cart.find(product => product.id == id);

    if (item) {
        item.quantity++;
    }

    saveCart();

    updateCartCount();


    loadCart();
}

// Decrease Quantity
function decreaseQty(id) {

    let item = cart.find(product => product.id == id);

    if (item) {

        if (item.quantity > 1) {
            item.quantity--;
        } else {
            removeFromCart(id);
            return;
        }

    }

    saveCart();

    updateCartCount();

    
    loadCart();
}

function updateCartCount() {

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    let totalItems = 0;

    cart.forEach(item => {
        totalItems += item.quantity;
    });

    let cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.innerText = totalItems;
    }

}