function addToWishlist(name, price, image){

    let wishlist =
    JSON.parse(localStorage.getItem("wishlist")) || [];

    let exists =
    wishlist.find(item => item.name === name);

    if(exists){

        alert("Already in Wishlist ❤️");
        return;
    }

    wishlist.push({
        name:name,
        price:price,
        image:image
    });

    localStorage.setItem(
        "wishlist",
        JSON.stringify(wishlist)
    );

    alert("Added to Wishlist ❤️");
}
// Wishlist Count Update
let countEl = document.getElementById("wishlistCount");

if(countEl){
    countEl.innerText = wishlist.length;
}