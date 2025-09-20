import { db } from './firebase-config';
import { doc, getDoc } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', async () => {
  const productDetailContainer = document.getElementById('product-detail-container');
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (productId) {
    try {
      const productDocRef = doc(db, "products", productId);
      const productDocSnap = await getDoc(productDocRef);

      if (productDocSnap.exists()) {
        const product = productDocSnap.data();
        productDetailContainer.innerHTML = `
          <h2 class="card-title">${product.name}</h2>
          <p class="card-text"><strong>價格:</strong> $${product.price}</p>
          <p class="card-text"><strong>描述:</strong> ${product.description}</p>
          <p class="card-text"><small class="text-muted"><strong>新增時間:</strong> ${product.createdAt ? new Date(product.createdAt.toDate()).toLocaleString() : 'N/A'}</small></p>
        `;
      } else {
        productDetailContainer.innerHTML = `<p class="text-danger">找不到此產品。</p>`;
      }
    } catch (error) {
      console.error("獲取產品詳情時發生錯誤: ", error);
      productDetailContainer.innerHTML = `<p class="text-danger">載入產品詳情時發生錯誤。</p>`;
    }
  } else {
    productDetailContainer.innerHTML = `<p class="text-danger">缺少產品 ID。</p>`;
  }
});
