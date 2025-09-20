import './style.css'
import { db } from './firebase-config';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, where, limit, startAfter, endBefore } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {
  const productForm = document.getElementById('product-form');
  const productsList = document.getElementById('products-list');
  const productNameInput = document.getElementById('product-name');
  const productPriceInput = document.getElementById('product-price');
  const productDescriptionInput = document.getElementById('product-description');
  const submitBtn = document.getElementById('submit-btn');
  // const cancelEditBtn = document.getElementById('cancel-edit-btn'); // Removed
  const sortBySelect = document.getElementById('sort-by');
  const filterNameInput = document.getElementById('filter-name');

  const prevPageBtn = document.getElementById('prev-page-btn');
  const nextPageBtn = document.getElementById('next-page-btn');
  // const currentPageSpan = document.getElementById('current-page'); // Removed

  const prevPageLi = document.getElementById('prev-page-li');
  const nextPageLi = document.getElementById('next-page-li');
  const currentPageLi = document.getElementById('current-page-li');
  const currentPageLink = document.getElementById('current-page');

  const productModal = new bootstrap.Modal(document.getElementById('productModal'));
  const productModalLabel = document.getElementById('productModalLabel');
  const openProductModalBtn = document.getElementById('open-product-modal-btn');

  // const viewProductModalElement = document.getElementById('viewProductModal'); // Removed
  // const viewProductModal = new bootstrap.Modal(viewProductModalElement); // Removed
  // const viewProductDetails = document.getElementById('view-product-details'); // Removed

  let isEditMode = false;
  let editingProductId = null;

  const PAGE_SIZE = 5; // Number of items per page
  let lastVisible = null; // Last document of the current page
  let firstVisible = null; // First document of the current page
  let currentPage = 1;

  let unsubscribeFromProducts = null; // To store the unsubscribe function

  // Function to reset form and exit edit mode
  const resetFormAndExitEditMode = () => {
    productForm.reset();
    submitBtn.textContent = '新增產品';
    productModalLabel.textContent = '新增/編輯產品'; // Reset modal title
    // cancelEditBtn.style.display = 'none'; // Removed
    isEditMode = false;
    editingProductId = null;
    productModal.hide(); // Close the modal
  };

  // Function to get the Firestore query based on sorting and filtering options
  const getProductsQuery = (direction = null) => {
    const [sortByField, sortOrder] = sortBySelect.value.split('_');
    let q = query(collection(db, "products"), orderBy(sortByField, sortOrder));

    const filterName = filterNameInput.value.trim();
    if (filterName) {
      q = query(q, where("name", ">=", filterName), where("name", "<=", filterName + '\uf8ff'));
    }

    if (direction === 'next' && lastVisible) {
      q = query(q, startAfter(lastVisible));
    } else if (direction === 'prev' && firstVisible) {
      q = query(q, endBefore(firstVisible));
    }

    return query(q, limit(PAGE_SIZE));
  };

  // Add Product / Update Product (Create/Update)
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = productNameInput.value;
    const price = parseFloat(productPriceInput.value);
    const description = productDescriptionInput.value;

    console.log('Submitting product data:', { name, price, description, isEditMode, editingProductId });

    if (isEditMode && editingProductId) {
      // Update existing product
      const productRef = doc(db, "products", editingProductId);
      try {
        await updateDoc(productRef, {
          name,
          price,
          description,
        });
        console.log('產品更新成功！', editingProductId);
        alert('產品更新成功！');
        resetFormAndExitEditMode();
      } catch (e) {
        console.error("更新文件時發生錯誤: ", e);
        alert('更新產品時發生錯誤。');
      }
    } else {
      // Add new product
      try {
        const docRef = await addDoc(collection(db, "products"), {
          name,
          price,
          description,
          createdAt: serverTimestamp()
        });
        console.log('產品新增成功，ID: ', docRef.id);
        productForm.reset();
        alert('產品新增成功！');
        resetFormAndExitEditMode(); // Close modal after adding
      } catch (e) {
        console.error("新增文件時發生錯誤: ", e);
        alert('新增產品時發生錯誤。');
      }
    }
  });

  // Open modal for adding new product
  openProductModalBtn.addEventListener('click', () => {
    resetFormAndExitEditMode(); // Reset form and mode
    submitBtn.textContent = '新增產品';
    productModalLabel.textContent = '新增產品';
    // Modal is opened by data-bs-toggle attributes, no need to manually call show()
  });

  // Render products function
  const renderProducts = (direction = null) => {
    console.log('renderProducts called. Direction:', direction, 'Current Page:', currentPage);
    if (unsubscribeFromProducts) {
      unsubscribeFromProducts(); // Unsubscribe from previous listener
      console.log('Unsubscribed from previous listener.');
    }

    const q = getProductsQuery(direction);
    console.log('Firestore query generated:', q);

    unsubscribeFromProducts = onSnapshot(q, (snapshot) => {
      console.log('onSnapshot callback triggered.');
      productsList.innerHTML = ''; // Clear existing list
      if (!snapshot.empty) {
        console.log('Snapshot is not empty. Number of documents:', snapshot.docs.length);
        firstVisible = snapshot.docs[0];
        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        snapshot.forEach((doc) => {
          const product = doc.data();
          const productId = doc.id;
          console.log('Rendering product:', { id: productId, ...product });
          const productRow = document.createElement('tr');
          // productRow.className = 'col'; // Removed as we are using table rows now
          
          // Truncate description for table display
          const shortDescription = product.description.length > 50 
                                ? product.description.substring(0, 47) + '...'
                                : product.description;

          productRow.innerHTML = `
            <td><a href="detail.html?id=${productId}" class="text-primary fw-bold">${product.name}</a></td>
            <td>$${product.price}</td>
            <td>${shortDescription}</td>
            <td>
              <button class="btn btn-warning btn-sm me-1 edit-btn" data-id="${productId}" data-bs-toggle="modal" data-bs-target="#productModal">編輯</button>
              <button class="btn btn-danger btn-sm delete-btn" data-id="${productId}">刪除</button>
            </td>
          `;
          productsList.appendChild(productRow);
        });

        // Update pagination buttons state
        // prevPageBtn.disabled = currentPage === 1;
        // nextPageBtn.disabled = snapshot.docs.length < PAGE_SIZE;

        if (currentPage === 1) {
          prevPageLi.classList.add('disabled');
        } else {
          prevPageLi.classList.remove('disabled');
        }

        if (snapshot.docs.length < PAGE_SIZE) {
          nextPageLi.classList.add('disabled');
        } else {
          nextPageLi.classList.remove('disabled');
        }

      } else {
        firstVisible = null;
        lastVisible = null;
        prevPageLi.classList.add('disabled');
        nextPageLi.classList.add('disabled');
      }

      currentPageLink.textContent = currentPage; // Update text for current page link
      // currentPageSpan.textContent = currentPage; // Removed

      // Remove event listeners to view buttons as title is now the clickable element
      // document.querySelectorAll('.view-btn').forEach(button => {
      //   button.addEventListener('click', (e) => {
      //     const id = e.target.dataset.id;
      //     const productToView = snapshot.docs.find(doc => doc.id === id).data();

      //     viewProductDetails.innerHTML = `
      //       <h5>名稱: ${productToView.name}</h5>
      //       <p><strong>價格:</strong> $${productToView.price}</p>
      //       <p><strong>描述:</strong> ${productToView.description}</p>
      //       <p><strong>新增時間:</strong> ${productToView.createdAt ? new Date(productToView.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
      //     `;
      //     // Modal is opened by data-bs-toggle attributes, no need to manually call show()
      //   });
      // });

      // Attach event listeners to edit buttons
      document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const productToEdit = snapshot.docs.find(doc => doc.id === id).data();
          
          productNameInput.value = productToEdit.name;
          productPriceInput.value = productToEdit.price;
          productDescriptionInput.value = productToEdit.description;
          
          submitBtn.textContent = '更新產品';
          productModalLabel.textContent = '編輯產品'; // Update modal title
          // cancelEditBtn.style.display = 'inline-block'; // Removed
          isEditMode = true;
          editingProductId = id;
          // Modal is opened by data-bs-toggle attributes, no need to manually call show()
        });
      });

      // Attach event listeners to delete buttons
      document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('確定要刪除此產品嗎？')) {
            try {
              await deleteDoc(doc(db, "products", id));
              console.log('產品刪除成功！', id);
              alert('產品刪除成功！');
            } catch (e) {
              console.error("刪除文件時發生錯誤: ", e);
              alert('刪除產品時發生錯誤。');
            }
          }
        });
      });
    });
  };

  // Initial render of products
  console.log('初始渲染產品...');
  renderProducts();

  // Listen for sort order changes
  sortBySelect.addEventListener('change', () => {
    currentPage = 1;
    lastVisible = null;
    firstVisible = null;
    renderProducts();
  });

  // Listen for filter input changes
  filterNameInput.addEventListener('input', () => {
    console.log('篩選輸入變更。值:', filterNameInput.value);
    currentPage = 1;
    lastVisible = null;
    firstVisible = null;
    renderProducts();
  });

  // Pagination button event listeners
  prevPageBtn.addEventListener('click', () => {
    console.log('點擊上一頁按鈕。目前頁面:', currentPage);
    if (currentPage > 1) {
      currentPage--;
      renderProducts('prev');
    }
  });

  nextPageBtn.addEventListener('click', () => {
    console.log('點擊下一頁按鈕。目前頁面:', currentPage);
    // To robustly check for next page, we would fetch PAGE_SIZE + 1 documents.
    // For now, we assume if current snapshot has PAGE_SIZE documents, there might be a next page.
    // The check `snapshot.docs.length < PAGE_SIZE` in renderProducts will disable if no more documents.
    // So, we just proceed to increment page and render. The disabled state will be set correctly.
    currentPage++;
    renderProducts('next');
  });

  // Handle modal close event to reset form
  document.getElementById('productModal').addEventListener('hidden.bs.modal', () => {
    resetFormAndExitEditMode();
  });

  // Handle view product modal close event // Removed
  // viewProductModalElement.addEventListener('hidden.bs.modal', () => {
  //   viewProductDetails.innerHTML = ''; // Clear details when modal closes
  // });

  // Attach event listener to product titles for viewing details // Removed as direct link is used now
  // productsList.addEventListener('click', (e) => {
  //   if (e.target.classList.contains('product-title-link')) {
  //     const id = e.target.dataset.id;
  //     const productToView = snapshot.docs.find(doc => doc.id === id).data();

  //     viewProductDetails.innerHTML = `
  //       <h5>名稱: ${productToView.name}</h5>
  //       <p><strong>價格:</strong> $${productToView.price}</p>
  //       <p><strong>描述:</strong> ${productToView.description}</p>
  //       <p><strong>新增時間:</strong> ${productToView.createdAt ? new Date(productToView.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
  //     `;
  //     viewProductModal.show(); // Manually show modal since it's not a data-bs-toggle button
  //   }
  // });
});
