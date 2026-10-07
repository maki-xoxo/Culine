import { supabase, supabaseConfigured } from './supabase-client.js';

const loginPanel = document.getElementById('adminLoginPanel');
const adminPanel = document.getElementById('adminPanel');
const setupNotice = document.getElementById('setupNotice');
const loginForm = document.getElementById('adminLoginForm');
const loginMessage = document.getElementById('adminLoginMessage');
const status = document.getElementById('adminStatus');
const tableBody = document.getElementById('inventoryRows');
const addForm = document.getElementById('addProductForm');
const detailsDialog = document.getElementById('productDetailsDialog');
const detailsForm = document.getElementById('productDetailsForm');
let productById = new Map();

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle('is-error', isError);
}

function showAdmin() {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,vendor,price,unit,stock_quantity,availability,is_featured,barcode,health_info,growing_location,market_location,dish_ideas')
    .order('name');

  if (error) {
    setMessage(status, 'Could not load inventory: ' + error.message, true);
    return;
  }

  productById = new Map((data || []).map(product => [String(product.id), product]));
  tableBody.replaceChildren();
  (data || []).forEach(product => {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = product.name;
    const vendor = document.createElement('td');
    vendor.textContent = product.vendor;
    const price = document.createElement('td');
    price.textContent = '$' + Number(product.price).toFixed(2) + ' / ' + product.unit;

    const barcodeCell = document.createElement('td');
    const barcodeInput = document.createElement('input');
    barcodeInput.type = 'text';
    barcodeInput.inputMode = 'numeric';
    barcodeInput.value = product.barcode || '';
    barcodeInput.placeholder = 'UPC / EAN';
    barcodeInput.setAttribute('aria-label', 'Barcode for ' + product.name);
    barcodeInput.dataset.field = 'barcode';
    barcodeCell.appendChild(barcodeInput);

    const stockCell = document.createElement('td');
    const stockInput = document.createElement('input');
    stockInput.type = 'number';
    stockInput.min = '0';
    stockInput.step = '1';
    stockInput.value = product.stock_quantity;
    stockInput.setAttribute('aria-label', 'Stock quantity for ' + product.name);
    stockInput.dataset.field = 'stock';
    stockCell.appendChild(stockInput);

    const availabilityCell = document.createElement('td');
    const availability = document.createElement('select');
    availability.setAttribute('aria-label', 'Availability for ' + product.name);
    availability.dataset.field = 'availability';
    [['available', 'Available'], ['unavailable', 'Unavailable']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      availability.appendChild(option);
    });
    availability.value = product.availability;
    availabilityCell.appendChild(availability);

    const featuredCell = document.createElement('td');
    const featured = document.createElement('input');
    featured.type = 'checkbox';
    featured.checked = product.is_featured;
    featured.setAttribute('aria-label', 'Feature ' + product.name);
    featured.dataset.field = 'featured';
    featuredCell.appendChild(featured);

    const actionCell = document.createElement('td');
    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'admin-secondary-btn';
    details.textContent = 'Details';
    details.dataset.detailsId = product.id;
    actionCell.appendChild(details);
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'admin-save-btn';
    save.textContent = 'Save';
    save.dataset.saveId = product.id;
    actionCell.appendChild(save);

    row.append(name, vendor, price, barcodeCell, stockCell, availabilityCell, featuredCell, actionCell);
    tableBody.appendChild(row);
  });
  setMessage(status, 'Inventory is up to date.');
}

async function verifyAdmin() {
  const { data, error } = await supabase.rpc('is_inventory_admin');
  if (error || data !== true) {
    await supabase.auth.signOut();
    loginPanel.hidden = false;
    adminPanel.hidden = true;
    setMessage(loginMessage, 'This account is not authorized for inventory management.', true);
    return false;
  }
  showAdmin();
  await loadProducts();
  supabase
    .channel('admin-inventory-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
    .subscribe();
  return true;
}

if (!supabaseConfigured) {
  setupNotice.hidden = false;
  loginForm.querySelectorAll('input,button').forEach(control => { control.disabled = true; });
} else {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    setMessage(loginMessage, 'Signing in…');
    const form = new FormData(loginForm);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get('email'),
      password: form.get('password')
    });
    if (error) {
      setMessage(loginMessage, 'Sign in failed. Check your credentials.', true);
      return;
    }
    await verifyAdmin();
  });

  document.getElementById('adminLogout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  tableBody.addEventListener('click', async event => {
    const detailsButton = event.target.closest('[data-details-id]');
    if (detailsButton) {
      const product = productById.get(detailsButton.dataset.detailsId);
      if (!product) return;
      detailsForm.elements.namedItem('id').value = product.id;
      detailsForm.elements.health_info.value = product.health_info || '';
      detailsForm.elements.growing_location.value = product.growing_location || '';
      detailsForm.elements.market_location.value = product.market_location || '';
      detailsForm.elements.dish_ideas.value = product.dish_ideas || '';
      detailsDialog.showModal();
      return;
    }
    const button = event.target.closest('[data-save-id]');
    if (!button) return;
    const row = button.closest('tr');
    const stockQuantity = Number(row.querySelector('[data-field="stock"]').value);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setMessage(status, 'Stock must be a whole number of zero or more.', true);
      return;
    }
    button.disabled = true;
    const { error } = await supabase.from('products').update({
      stock_quantity: stockQuantity,
      availability: row.querySelector('[data-field="availability"]').value,
      is_featured: row.querySelector('[data-field="featured"]').checked,
      barcode: row.querySelector('[data-field="barcode"]').value.trim() || null
    }).eq('id', button.dataset.saveId);
    button.disabled = false;
    if (error) {
      setMessage(status, 'Could not save changes: ' + error.message, true);
    } else {
      setMessage(status, 'Stock updated. Customers will see the change live.');
    }
  });

  document.getElementById('closeProductDetails').addEventListener('click', () => detailsDialog.close());
  detailsDialog.addEventListener('click', event => { if (event.target === detailsDialog) detailsDialog.close(); });
  detailsForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = new FormData(detailsForm);
    const { error } = await supabase.from('products').update({
      health_info: String(values.get('health_info')).trim(),
      growing_location: String(values.get('growing_location')).trim(),
      market_location: String(values.get('market_location')).trim(),
      dish_ideas: String(values.get('dish_ideas')).trim()
    }).eq('id', values.get('id'));
    if (error) {
      setMessage(status, 'Could not save produce details: ' + error.message, true);
      return;
    }
    detailsDialog.close();
    setMessage(status, 'Produce details saved. Customers can see them after a barcode match.');
    await loadProducts();
  });

  addForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(addForm);
    const stockQuantity = Number(form.get('stock_quantity'));
    const price = Number(form.get('price'));
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || !Number.isFinite(price) || price < 0) {
      setMessage(status, 'Enter a valid price and a whole stock quantity of zero or more.', true);
      return;
    }
    const { error } = await supabase.from('products').insert({
      name: String(form.get('name')).trim(),
      vendor: String(form.get('vendor')).trim(),
      price,
      unit: String(form.get('unit')).trim(),
      stock_quantity: stockQuantity,
      availability: form.get('availability'),
      is_featured: form.get('is_featured') === 'on',
      barcode: String(form.get('barcode') || '').trim() || null,
      health_info: String(form.get('health_info') || '').trim(),
      growing_location: String(form.get('growing_location') || '').trim(),
      market_location: String(form.get('market_location') || '').trim(),
      dish_ideas: String(form.get('dish_ideas') || '').trim()
    });
    if (error) {
      setMessage(status, 'Could not add product: ' + error.message, true);
    } else {
      addForm.reset();
      setMessage(status, 'Product added to the live market.');
      await loadProducts();
    }
  });

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) verifyAdmin();
  });
}
