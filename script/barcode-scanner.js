const dialog = document.getElementById('scanDialog');
const status = document.getElementById('scanStatus');
const video = document.getElementById('barcodeVideo');
const barcodeEntry = document.getElementById('barcodeEntry');
const resultPanel = document.getElementById('scanProductResult');
const scanTrigger = document.getElementById('scanTrigger');
let scannerControls = null;
let scanning = false;

async function updateScannerAvailability() {
  if (!window.isSecureContext || !navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
    scanTrigger.hidden = true;
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    scanTrigger.hidden = !devices.some(device => device.kind === 'videoinput');
  } catch {
    scanTrigger.hidden = true;
  }
}

updateScannerAvailability();
navigator.mediaDevices?.addEventListener?.('devicechange', updateScannerAvailability);

function stopCamera() {
  scanning = false;
  if (scannerControls) {
    scannerControls.stop();
    scannerControls = null;
  }
  video.srcObject?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  video.hidden = true;
}

function addDetail(parent, label, value, fallback) {
  const block = document.createElement('div');
  const heading = document.createElement('h4');
  heading.textContent = label;
  const text = document.createElement('p');
  text.textContent = value || fallback;
  block.append(heading, text);
  parent.appendChild(block);
}

function showProduct(product, code) {
  resultPanel.replaceChildren();
  resultPanel.hidden = false;
  const heading = document.createElement('h3');
  heading.textContent = product.name;
  const vendor = document.createElement('p');
  vendor.className = 'scan-product-vendor';
  vendor.textContent = `${product.vendor || 'Local market'} · $${Number(product.price).toFixed(2)} / ${product.unit}`;
  resultPanel.append(heading, vendor);
  addDetail(resultPanel, 'Nutrition', product.health_info, 'Nutrition information has not been added yet.');
  addDetail(resultPanel, 'Grown or made', product.growing_location, 'Origin details have not been added yet.');
  addDetail(resultPanel, 'Where to find it', product.market_location, product.vendor || 'Ask the market team for the current stall location.');
  addDetail(resultPanel, 'Cooking ideas', product.dish_ideas, 'Recipe ideas have not been added yet.');
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'scan-add-btn';
  addButton.dataset.scanAddId = product.id;
  addButton.textContent = product.availability === 'unavailable' || Number(product.stock_quantity) <= 0 ? 'Currently unavailable' : 'Add to cart';
  addButton.disabled = product.availability === 'unavailable' || Number(product.stock_quantity) <= 0;
  resultPanel.appendChild(addButton);
  status.textContent = `Matched barcode ${code}.`;
}

function lookupBarcode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!code) {
    status.textContent = 'Enter or scan a barcode first.';
    return;
  }
  if (window.culineInventoryError) {
    status.textContent = 'Culine could not load the live product list. Check the connection and barcode database setup.';
    return;
  }
  if (!Array.isArray(window.culineProducts)) {
    status.textContent = 'The live product list is still loading. Try again in a moment.';
    return;
  }
  const products = window.culineProducts;
  const product = products.find(item => String(item.barcode || '').trim().toUpperCase() === code);
  barcodeEntry.value = code;
  if (product) {
    showProduct(product, code);
  } else {
    resultPanel.replaceChildren();
    resultPanel.hidden = false;
    const heading = document.createElement('h3');
    heading.textContent = 'No matching market item yet';
    const message = document.createElement('p');
    message.textContent = `Barcode ${code} is not linked to a Culine product. Ask an admin to add it in the inventory dashboard.`;
    resultPanel.append(heading, message);
    status.textContent = 'Barcode scanned. No match was found.';
  }
}

async function startCamera() {
  if (scanning) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Camera scanning needs a secure connection (HTTPS). Enter the barcode below instead.';
    return;
  }
  scanning = true;
  status.textContent = 'Starting camera…';
  video.hidden = false;
  try {
    const { BrowserMultiFormatReader } = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
    const reader = new BrowserMultiFormatReader();
    const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
    if (!cameras.length) {
      stopCamera();
      scanTrigger.hidden = true;
      status.textContent = 'No camera or webcam is available on this device.';
      return;
    }
    const backCamera = cameras.find(camera => /back|rear|environment/i.test(camera.label));
    const cameraId = backCamera?.deviceId || cameras[0].deviceId;
    scannerControls = await reader.decodeFromVideoDevice(cameraId, video, (result, error) => {
      if (result) {
        const code = result.getText();
        stopCamera();
        lookupBarcode(code);
      } else if (error && error.name !== 'NotFoundException' && error.name !== 'ChecksumException' && error.name !== 'FormatException') {
        status.textContent = 'Could not read that barcode. Try better lighting or enter it below.';
      }
    });
    if (scanning) status.textContent = 'Point your camera at the product barcode.';
  } catch (error) {
    stopCamera();
    if (error?.name === 'NotFoundError' || error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
      scanTrigger.hidden = true;
    }
    status.textContent = 'Camera could not start. Check camera permission or enter the barcode below.';
  }
}

scanTrigger.addEventListener('click', () => {
  resultPanel.hidden = true;
  resultPanel.replaceChildren();
  barcodeEntry.value = '';
  status.textContent = 'Use your camera or enter a barcode.';
  dialog.showModal();
  startCamera();
});

document.getElementById('barcodeLookup').addEventListener('click', () => lookupBarcode(barcodeEntry.value));
barcodeEntry.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    lookupBarcode(barcodeEntry.value);
  }
});

dialog.addEventListener('click', event => {
  const addButton = event.target.closest('[data-scan-add-id]');
  if (addButton) {
    const product = (window.culineProducts || []).find(item => String(item.id) === addButton.dataset.scanAddId);
    if (product && window.addProductToCart?.(product)) {
      addButton.textContent = 'Added to cart';
      addButton.disabled = true;
    }
    return;
  }
  if (event.target === dialog || event.target.closest('[data-close-scan]')) {
    stopCamera();
    dialog.close();
  }
});

dialog.addEventListener('close', stopCamera);
