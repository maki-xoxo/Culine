import { supabase, supabaseConfigured } from './supabase-client.js';

if (supabaseConfigured && localStorage.getItem('isLoggedIn') === 'true') {
  window.culineProducts = null;
  window.culineInventoryError = false;
  const grid = document.querySelector('.produce-grid');
  const heading = document.getElementById('marketHeading');
  const marketLink = document.getElementById('seeFullMarket');
  const status = document.getElementById('inventorySyncStatus');
  let products = [];
  let fullMarket = false;

  function createCard(product) {
    const card = document.createElement('article');
    card.className = 'produce-card';
    card.dataset.productId = product.id;
    card.dataset.price = product.price;
    card.dataset.unit = product.unit;
    card.dataset.stock = product.stock_quantity;
    card.dataset.availability = product.availability;
    card.dataset.barcode = product.barcode || '';
    card.dataset.healthInfo = product.health_info || '';
    card.dataset.growingLocation = product.growing_location || '';
    card.dataset.marketLocation = product.market_location || '';
    card.dataset.dishIdeas = product.dish_ideas || '';

    const visual = document.createElement('div');
    visual.className = 'produce-swatch';
    visual.style.backgroundColor = '#7FA06A';

    const body = document.createElement('div');
    body.className = 'produce-body';

    const title = document.createElement('h3');
    title.textContent = product.name;

    const vendor = document.createElement('p');
    vendor.className = 'produce-vendor';
    vendor.textContent = product.vendor;

    const stock = document.createElement('p');
    stock.className = 'stock-status';
    const unavailable = product.availability === 'unavailable';
    const outOfStock = Number(product.stock_quantity) <= 0;
    stock.textContent = unavailable
      ? 'Unavailable'
      : outOfStock
        ? 'Out of stock'
        : Number(product.stock_quantity) + ' in stock';
    if (unavailable || outOfStock) stock.classList.add('stock-status-empty');

    const row = document.createElement('div');
    row.className = 'produce-row';

    const price = document.createElement('span');
    price.className = 'produce-price';
    price.textContent = '$' + Number(product.price).toFixed(2) + ' / ' + product.unit;

    const add = document.createElement('button');
    add.className = 'add-btn';
    add.type = 'button';
    add.textContent = unavailable ? 'Unavailable' : outOfStock ? 'Out of stock' : 'Add';
    add.disabled = unavailable || outOfStock;

    row.append(price, add);
    body.append(title, vendor, stock, row);
    card.append(visual, body);
    return card;
  }

  function renderProducts() {
    const visibleProducts = fullMarket
      ? products
      : products.filter(product => product.is_featured);
    grid.replaceChildren(...visibleProducts.map(createCard));
    if (typeof window.applyProducePhotos === 'function') {
      window.applyProducePhotos();
    }
    heading.textContent = fullMarket
      ? 'Full market · ' + products.length + ' items'
      : 'Fresh today';
    marketLink.textContent = fullMarket ? 'Back to featured' : 'See full market';
    marketLink.setAttribute('aria-expanded', String(fullMarket));
    status.textContent = '';
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,vendor,price,unit,stock_quantity,availability,is_featured,barcode,health_info,growing_location,market_location,dish_ideas')
      .order('name');
    if (error) {
      window.culineInventoryError = true;
      status.textContent = 'Live inventory could not be reached. Showing the sample market.';
      console.error('Could not load inventory:', error.message);
      return;
    }
    products = data || [];
    window.culineProducts = products;
    window.culineInventoryError = false;
    renderProducts();
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('#seeFullMarket');
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fullMarket = !fullMarket;
    renderProducts();
  }, true);

  supabase
    .channel('customer-inventory-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
    .subscribe();

  loadProducts();
} else {
  window.culineProducts = [];
  window.culineInventoryError = true;
}

