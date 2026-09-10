// ============================================
// WISHLIST.JS - FINAL WORKING VERSION
// ============================================

function getUser() {
    try {
        let userData = localStorage.getItem('user');
        if (userData) {
            return JSON.parse(userData);
        }
        userData = localStorage.getItem('currentUser');
        if (userData) {
            const user = JSON.parse(userData);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.removeItem('currentUser');
            return user;
        }
        return null;
    } catch (e) {
        console.error('Get User Error:', e);
        return null;
    }
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'error' ? '#dc3545' : type === 'info' ? '#17a2b8' : '#28a745'};
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        z-index: 9999;
        font-weight: 600;
        animation: slideIn 0.5s ease;
        max-width: 400px;
        font-size: 14px;
        font-family: 'Poppins', sans-serif;
    `;
    
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

async function addToWishlist(id, name, price, image, category) {
    const user = getUser();
    
    if (!user) {
        showToast('Please login first ❤️', 'error');
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
        return;
    }

    const userId = user.id || user._id;

    try {
        console.log('🔍 Adding to wishlist:', { userId, productId: id, name });

        const checkResponse = await fetch(`http://localhost:5000/api/wishlist/${userId}`);
        const wishlist = await checkResponse.json();
        
        const exists = wishlist.some(item => 
            String(item.productId) === String(id)
        );
        
        if (exists) {
            showToast('❤️ Already in Wishlist!', 'info');
            return;
        }

        const response = await fetch("http://localhost:5000/api/wishlist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: String(userId),
                productId: String(id),
                name: name || 'Product',
                price: Number(price) || 0,
                image: image || 'https://via.placeholder.com/300?text=No+Image',
                category: category || 'Dessert'
            })
        });

        const data = await response.json();
        console.log("📦 Wishlist Response:", data);

        if (data.success) {
            showToast('❤️ Added to Wishlist!');
            await updateWishlistCount();
            
            if (window.location.pathname.includes('wishlist.html')) {
                setTimeout(() => window.location.reload(true), 500);
            }
        } else {
            showToast(data.message || 'Failed to add to wishlist', 'error');
        }

    } catch (error) {
        console.error("❌ Wishlist Error:", error);
        showToast('Server connection failed. Please try again.', 'error');
    }
}

// ============================================
// REMOVE FROM WISHLIST (HARD REFRESH)
// ============================================

async function removeFromWishlist(entryId) {
    console.log('🔍 REMOVE FUNCTION CALLED');
    console.log('📌 Entry ID:', entryId);
    
    const user = getUser();
    
    if (!user) {
        showToast('Please login first', 'error');
        return;
    }

    if (!entryId) {
        showToast('Invalid ID', 'error');
        return;
    }

    const userId = user.id || user._id;

    try {
        // Get current wishlist with cache busting
        const response = await fetch(`http://localhost:5000/api/wishlist/${userId}?_=${Date.now()}`);
        const wishlist = await response.json();
        
        // Find the item by _id
        const item = wishlist.find(item => String(item._id) === String(entryId));
        
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }

        console.log('✅ Found item:', item.name);
        const productIdToDelete = item.productId;

        // Delete using productId
        const deleteResponse = await fetch(`http://localhost:5000/api/wishlist/${userId}/${productIdToDelete}`, {
            method: "DELETE"
        });

        const deleteData = await deleteResponse.json();
        console.log('📦 Delete Response:', deleteData);

        if (deleteResponse.ok && deleteData.success) {
            showToast(`✅ ${item.name} removed from Wishlist`);
            
            await updateWishlistCount();
            
            // HARD REFRESH - Force reload from server with cache busting
            setTimeout(() => {
                window.location.replace(window.location.href.split('?')[0] + '?_=' + Date.now());
            }, 400);
            
        } else {
            showToast(deleteData.message || 'Failed to remove', 'error');
        }

    } catch (error) {
        console.error('❌ Remove Error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function moveToCart(entryId) {
    console.log('🔍 Move to Cart called with entry ID:', entryId);
    
    const user = getUser();
    
    if (!user) {
        showToast('Please login first', 'error');
        return;
    }

    const userId = user.id || user._id;

    try {
        const response = await fetch(`http://localhost:5000/api/wishlist/${userId}`);
        const wishlist = await response.json();
        
        const item = wishlist.find(item => String(item._id) === String(entryId));
        
        if (!item) {
            showToast('Item not found in wishlist', 'error');
            return;
        }

        console.log('✅ Found item to move:', item.name);

        const cartResponse = await fetch('http://localhost:5000/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: String(userId),
                productId: String(item.productId),
                name: item.name,
                price: Number(item.price),
                image: item.image,
                category: item.category || 'Dessert',
                quantity: 1
            })
        });

        const cartResult = await cartResponse.json();

        if (cartResult.success) {
            await fetch(`http://localhost:5000/api/wishlist/${userId}/${item.productId}`, {
                method: "DELETE"
            });

            showToast(`🛒 ${item.name} moved to Cart!`);
            await updateWishlistCount();
            
            if (window.location.pathname.includes('wishlist.html')) {
                setTimeout(() => {
                    window.location.replace(window.location.href.split('?')[0] + '?_=' + Date.now());
                }, 500);
            }
        } else {
            showToast(cartResult.message || 'Failed to move to cart', 'error');
        }
    } catch (error) {
        console.error('❌ Move to Cart Error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function updateWishlistCount() {
    const user = getUser();
    const badges = document.querySelectorAll('.badge-count, #wishlistCount, .wishlist-badge');

    if (!user) {
        badges.forEach(badge => badge.innerText = "0");
        return;
    }

    const userId = user.id || user._id;
    if (!userId) {
        badges.forEach(badge => badge.innerText = "0");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/wishlist/${userId}?_=${Date.now()}`);
        const result = await response.json();
        
        let count = 0;
        if (Array.isArray(result)) {
            count = result.length;
        }
        
        badges.forEach(badge => {
            badge.innerText = count;
        });

    } catch (error) {
        console.error("❌ Wishlist Count Error:", error);
        badges.forEach(badge => badge.innerText = "0");
    }
}

async function loadWishlist() {
    const user = getUser();
    const container = document.getElementById("wishlistContainer");
    const emptyBox = document.getElementById("emptyWishlist");

    if (!container) {
        console.log('ℹ️ Not on wishlist page');
        return;
    }

    if (!user) {
        container.innerHTML = "";
        if (emptyBox) {
            emptyBox.style.display = "block";
            emptyBox.innerHTML = `
                <i class="fa-regular fa-heart"></i>
                <h3>Please Login First</h3>
                <p>Login to see your wishlist ❤️</p>
                <a href="login.html" class="btn btn-outline-danger">Login Now</a>
            `;
        }
        return;
    }

    try {
        const userId = user.id || user._id;
        console.log('🔍 Fetching wishlist for user:', userId);

        const response = await fetch(`http://localhost:5000/api/wishlist/${userId}?_=${Date.now()}`);
        const wishlist = await response.json();
        console.log(`✅ Loaded ${wishlist.length} wishlist items`);

        container.innerHTML = "";

        if (!wishlist || wishlist.length === 0) {
            if (emptyBox) {
                emptyBox.style.display = "block";
                emptyBox.innerHTML = `
                    <i class="fa-regular fa-heart"></i>
                    <h3>Your Wishlist is Empty</h3>
                    <p>Add your favorite items and save them for later ❤️</p>
                    <a href="/" class="btn btn-danger">🏠 Start Shopping</a>
                `;
            }
            return;
        }

        if (emptyBox) emptyBox.style.display = "none";

        wishlist.forEach((item) => {
            const entryId = item._id;
            
            container.innerHTML += `
                <div class="col-md-4 col-sm-6">
                    <div class="wish-card">
                        <img src="${item.image || 'https://via.placeholder.com/300?text=No+Image'}" 
                             alt="${item.name}" 
                             loading="lazy"
                             onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
                        <div class="wish-content">
                            <span class="category-tag">${item.category || 'Dessert'}</span>
                            <h5>${item.name || 'Product'}</h5>
                            <div class="price">₹${Number(item.price).toFixed(0)}</div>
                            <button class="btn-move-cart" onclick="moveToCart('${entryId}')">
                                🛒 Move To Cart
                            </button>
                            <button class="btn-remove" onclick="removeFromWishlist('${entryId}')">
                                ❌ Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("❌ Wishlist Error:", error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-danger">⚠️ Failed to load wishlist</p>
                <button onclick="loadWishlist()" class="btn btn-danger">🔄 Retry</button>
            </div>
        `;
    }
}

(function addToastStyles() {
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .toast-message {
                animation: slideIn 0.5s ease !important;
            }
        `;
        document.head.appendChild(style);
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    console.log('❤️ Wishlist.js loaded');
    console.log('📌 User:', getUser() ? 'Logged In' : 'Guest');
    
    updateWishlistCount();
    
    if (window.location.pathname.includes('wishlist.html')) {
        loadWishlist();
    }
});

window.addEventListener('load', function() {
    updateWishlistCount();
});

console.log('✅ Wishlist.js loaded successfully!');