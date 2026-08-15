async function addToWishlist(id, name, price, image, category) {

    const currentUser =
        JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        alert("Please login first ❤️");
        window.location.href = "login.html";
        return;
    }

    const userId =
        currentUser._id || currentUser.id;

    try {

        const response = await fetch(
            "http://localhost:5000/api/wishlist",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: userId,
                    productId: id,
                    name: name,
                    price: price,
                    image: image,
                    category: category
                })
            }
        );

        const data = await response.json();

        if (data.success) {

            alert("❤️ Added to Wishlist");

        } else {

            alert(data.message || "Wishlist failed");

        }

    } catch (error) {

        console.error("Wishlist Error:", error);

        alert("Server connection failed");

    }
}