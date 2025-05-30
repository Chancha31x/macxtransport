// frontend/checkout_script.js

// เพิ่ม URL ของ Backend API
const API_BASE_URL = 'http://localhost:3000/api';

let map;
let directionsService;
let directionsRenderer;
let orderDetails;

// จะถูกโหลดจาก Backend
let truckOptionsData = []; 
let additionalServices = {
    // ชื่อ key ตรงกับ service_key ใน DB และ id ใน HTML
    disassemble_small: { name: "ถอดประกอบสินค้า (เล็ก)", price: 0, selected: false },
    disassemble_large: { name: "ถอดประกอบสินค้า (ใหญ่)", price: 0, selected: false },
    product_protection: { name: "ป้องกันสินค้า", price: 0, selected: false },
    bubble_wrap: { name: "บับเบิ้ลกันกระแทก", price: 0, selected: false },
    porter_quantity: 0, 
    porter_price_per_person: 0 // จะถูกกำหนดเมื่อโหลดข้อมูลรถบรรทุก
};

// ฟังก์ชันสำหรับจัดรูปแบบตัวเลขให้มีเครื่องหมายคอมม่า
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount);
    }
    if (isNaN(amount)) {
        return 'N/A';
    }
    return amount.toLocaleString('en-US');
}

// ฟังก์ชันสำหรับคำนวณราคาค่าขนส่งตามประเภทรถและระยะทาง (ปรับปรุง)
// ฟังก์ชันนี้จะรับข้อมูล truckData ที่มี price_ranges และ starting_price อยู่แล้ว
function calculateTruckPriceDetails(truckData, distanceKm) {
    let startingPrice = parseFloat(truckData.starting_price);
    const pricePerKmRanges = truckData.price_ranges; // price_ranges มาจาก truckData แล้ว

    if (isNaN(distanceKm) || distanceKm <= 0) {
        return { total: startingPrice, tierCost: 0, serviceCost: 0, additionalCost: 0, startingPrice: startingPrice, calculatedBasePrice: startingPrice };
    }

    let tierRate = 0;
    let serviceCost = 0;
    let additionalCost = 0;
    
    let foundRange = null;
    for (const range of pricePerKmRanges) {
        if (distanceKm <= range.max || range.max === Infinity) {
            foundRange = range;
            break;
        }
    }

    if (!foundRange) {
        return { total: 0, tierCost: 0, serviceCost: 0, additionalCost: 0, startingPrice: 0, calculatedBasePrice: 0 };
    }

    tierRate = foundRange.rate;

    if (foundRange.applyToTotalKm && distanceKm >= 900) {
        tierCost = distanceKm * foundRange.rate;
        additionalCost = distanceKm * (foundRange.additionalPerKmCharge || 0);
        if (foundRange.overrideServiceCharge) {
            serviceCost = 0;
        }
    } else {
        tierCost = distanceKm * tierRate;
        const firstRange = pricePerKmRanges[0];
        if (firstRange && firstRange.serviceCharge && distanceKm > 0 && distanceKm <= 100) {
            serviceCost = firstRange.serviceCharge;
        }
    }

    let calculatedBasePrice = tierCost + serviceCost + additionalCost;

    return {
        total: calculatedBasePrice,
        tierCost: tierCost,
        serviceCost: serviceCost,
        additionalCost: additionalCost,
        startingPrice: startingPrice,
        calculatedBasePrice: calculatedBasePrice
    };
}


async function initCheckoutMap() {
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: { lat: 13.7563, lng: 100.5018 },
        zoom: 12
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        polylineOptions: {
            strokeColor: '#28a745',
            strokeOpacity: 0.8,
            strokeWeight: 4
        }
    });

    // โหลดข้อมูลทั้งหมดจาก Backend ก่อนที่จะดำเนินการต่อ
    await fetchAllDataAndLoadOrderDetails();
}

// ฟังก์ชันใหม่สำหรับโหลดข้อมูลทั้งหมดจาก Backend
async function fetchAllDataAndLoadOrderDetails() {
    try {
        // 1. ดึงข้อมูลรถบรรทุก
        const trucksResponse = await fetch(`${API_BASE_URL}/trucks`);
        const trucksData = await trucksResponse.json();
        if (trucksResponse.ok) {
            truckOptionsData = trucksData.trucks.map(truck => ({
                ...truck,
                price_ranges: JSON.parse(truck.price_ranges_json || '[]') // แปลง JSON string กลับเป็น Array
            }));
            console.log("Truck data loaded from backend for checkout:", truckOptionsData);
        } else {
            console.error("Failed to load truck data for checkout:", trucksData.error);
            alert("ไม่สามารถโหลดข้อมูลรถบรรทุกได้จาก Server");
            return; // หยุดการทำงานถ้าโหลดข้อมูลรถบรรทุกไม่ได้
        }

        // 2. ดึงข้อมูลบริการเพิ่มเติม
        const servicesResponse = await fetch(`${API_BASE_URL}/additional-services`);
        const servicesData = await servicesResponse.json();
        if (servicesResponse.ok) {
            for (const key in servicesData.services) {
                if (additionalServices.hasOwnProperty(key)) {
                    additionalServices[key].price = parseFloat(servicesData.services[key]);
                }
            }
            console.log("Additional services prices loaded from backend:", additionalServices);
        } else {
            console.error("Failed to load additional services prices:", servicesData.error);
            alert("ไม่สามารถโหลดราคาบริการเพิ่มเติมได้จาก Server");
            return; // หยุดการทำงานถ้าโหลดข้อมูลบริการไม่ได้
        }

        // 3. โหลด orderDetails จาก localStorage และอัปเดต UI
        loadOrderDetails();

    } catch (error) {
        console.error('Error fetching all data:', error);
        alert('ไม่สามารถเชื่อมต่อกับ Server หรือโหลดข้อมูลที่จำเป็นได้ กรุณาลองใหม่อีกครั้ง');
        window.location.href = 'index.html'; // กลับไปหน้าแรกหากเกิดข้อผิดพลาดร้ายแรง
    }
}

function loadOrderDetails() {
    const orderDetailsString = localStorage.getItem('orderDetails');
    if (orderDetailsString) {
        orderDetails = JSON.parse(orderDetailsString);

        // ค้นหาข้อมูล truck ที่สมบูรณ์จาก truckOptionsData ที่เพิ่งโหลดมา
        const currentTruckFromBackend = truckOptionsData.find(t => t.id === orderDetails.truck.id);
        if (currentTruckFromBackend) {
            // อัปเดต orderDetails.truck ให้เป็นข้อมูลจาก Backend เพื่อให้มี price_ranges และ starting_price ล่าสุด
            orderDetails.truck = currentTruckFromBackend;
            additionalServices.porter_price_per_person = parseFloat(currentTruckFromBackend.porter_price);
        } else {
            console.warn("Selected truck not found in backend data. Using localStorage data.");
            // หากไม่พบใน Backend ให้ใช้ข้อมูลจาก localStorage (ซึ่งอาจจะเก่า)
            additionalServices.porter_price_per_person = parseFloat(orderDetails.truck.porter_price || 0); // fallback
        }
        
        // อัปเดต UI ของราคาต่อคนทันทีที่โหลด
        document.getElementById('porter-price-per-person').innerText = `${formatCurrency(additionalServices.porter_price_per_person)} บาท/คน`;

        // ตั้งค่า porter_quantity ให้เป็น 0 และอัปเดตค่าใน input field ทันทีเมื่อโหลดหน้าใหม่เสมอ
        // (คุณสามารถเลือกที่จะจำค่านี้จาก localStorage ได้หากต้องการ)
        additionalServices.porter_quantity = 0;
        const porterQuantityInput = document.getElementById('porter_quantity');
        if (porterQuantityInput) {
            porterQuantityInput.value = additionalServices.porter_quantity;
        }

        // อัปเดต UI ของ checkbox บริการเพิ่มเติมด้วยราคาและสถานะที่ถูกต้อง
        // (ส่วนนี้ควรถูกปรับปรุงหากคุณต้องการให้สถานะของบริการเพิ่มเติมถูกส่งมาจากหน้าแรก)
        for (const key in additionalServices) {
            if (additionalServices.hasOwnProperty(key) && typeof additionalServices[key].selected === 'boolean') {
                const checkbox = document.getElementById(key);
                if (checkbox) {
                    checkbox.checked = false; // เริ่มต้นเป็น false ทุกครั้งที่โหลด
                    // อัปเดตข้อความราคาใน label ของ checkbox
                    const label = checkbox.nextElementSibling;
                    if (label) {
                        label.innerText = `${additionalServices[key].name} - ${formatCurrency(additionalServices[key].price)} บาท`;
                    }
                }
            }
        }
        
        displayOrderSummary(); // เรียกแสดงสรุปราคาครั้งแรก
        addAdditionalServicesEventListeners(); // เรียก Listener หลังจากโหลด orderDetails และกำหนดราคาคนยกของแล้ว
        populateTruckSelectionModal(); // โหลดตัวเลือกประเภทรถใน Modal
    } else {
        alert('ไม่พบข้อมูลการสั่งซื้อ กรุณากลับไปหน้าแรก');
        window.location.href = 'index.html';
    }
}

// ฟังก์ชันสำหรับเปิด Modal เลือกประเภทรถ
function openTruckSelectionModal() {
    const truckSelectionModal = new bootstrap.Modal(document.getElementById('truckSelectionModal'));
    truckSelectionModal.show();
}

// ฟังก์ชันสำหรับโหลดตัวเลือกประเภทรถลงใน Modal
function populateTruckSelectionModal() {
    const container = document.getElementById('truck-options-container');
    container.innerHTML = ''; // ล้างตัวเลือกเดิม

    truckOptionsData.forEach(truck => {
        const truckCard = document.createElement('div');
        truckCard.className = 'col-md-4 mb-3'; // ใช้ Grid ของ Bootstrap
        truckCard.innerHTML = `
            <div class="card truck-card ${orderDetails.truck.id === truck.id ? 'selected-truck-card' : ''}" data-truck-id="${truck.id}">
                <img src="${truck.image}" class="card-img-top" alt="${truck.name}">
                <div class="card-body">
                    <h5 class="card-title">${truck.name}</h5>
                    <p class="card-text">${truck.details}</p>
                    <button class="btn btn-primary btn-select-truck" data-truck-id="${truck.id}">เลือก</button>
                </div>
            </div>
        `;
        container.appendChild(truckCard);
    });

    // เพิ่ม Event Listener ให้กับปุ่ม "เลือก" ใน Modal
    document.querySelectorAll('.btn-select-truck').forEach(button => {
        button.addEventListener('click', (event) => {
            const selectedTruckId = parseInt(event.target.dataset.truckId);
            const selectedTruckData = truckOptionsData.find(t => t.id === selectedTruckId);
            if (selectedTruckData) {
                selectTruckFromModal(selectedTruckData);
                // ซ่อน Modal หลังจากเลือก
                const truckSelectionModal = bootstrap.Modal.getInstance(document.getElementById('truckSelectionModal'));
                truckSelectionModal.hide();
            }
        });
    });
}

// ฟังก์ชันสำหรับอัปเดตประเภทรถที่เลือกจาก Modal
function selectTruckFromModal(newTruckData) {
    // อัปเดต orderDetails ด้วยข้อมูลรถใหม่ (จาก Backend)
    orderDetails.truck = {
        id: newTruckData.id,
        name: newTruckData.name,
        details: newTruckData.details,
        image: newTruckData.image,
        starting_price: newTruckData.starting_price,
        porter_price: newTruckData.porter_price,
        price_ranges: newTruckData.price_ranges // ใช้ price_ranges ที่ถูกต้องจาก Backend
    };

    // อัปเดตราคาคนยกของตามประเภทรถใหม่
    additionalServices.porter_price_per_person = parseFloat(newTruckData.porter_price);

    // รีเซ็ตจำนวนคนยกของเป็น 0 เมื่อเปลี่ยนประเภทรถ
    additionalServices.porter_quantity = 0;
    document.getElementById('porter_quantity').value = 0;

    // รีเซ็ต checkbox ของบริการเพิ่มเติมทั้งหมด
    document.getElementById('disassemble_small').checked = false;
    document.getElementById('disassemble_large').checked = false;
    document.getElementById('product_protection').checked = false;
    document.getElementById('bubble_wrap').checked = false;

    additionalServices.disassemble_small.selected = false;
    additionalServices.disassemble_large.selected = false;
    additionalServices.product_protection.selected = false;
    additionalServices.bubble_wrap.selected = false;

    // อัปเดต UI และคำนวณราคาสรุปใหม่
    document.getElementById('porter-price-per-person').innerText = `${formatCurrency(additionalServices.porter_price_per_person)} บาท/คน`;
    displayOrderSummary(); // อัปเดตส่วนสรุปราคาและข้อมูลรถที่เลือก

    // (Optional) บันทึก orderDetails ที่อัปเดตแล้วลง localStorage หากต้องการให้คงอยู่หลังรีเฟรช
    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
}

// ฟังก์ชันเพิ่ม Event Listeners สำหรับบริการเพิ่มเติม
let eventListenersAdded = false; // Flag เพื่อติดตามว่า Event Listener ถูกผูกแล้วหรือยัง

function addAdditionalServicesEventListeners() {
    if (eventListenersAdded) {
        return; // ถ้าผูกแล้ว ไม่ต้องผูกซ้ำ
    }

    document.getElementById('disassemble_small').addEventListener('change', updateAdditionalServices);
    document.getElementById('disassemble_large').addEventListener('change', updateAdditionalServices);
    document.getElementById('product_protection').addEventListener('change', updateAdditionalServices);
    document.getElementById('bubble_wrap').addEventListener('change', updateAdditionalServices);

    // ผูก Event Listener กับปุ่ม + และ - ของคนยกของ
    const minusButton = document.querySelector('.input-group-prepend button');
    const plusButton = document.querySelector('.input-group-append button');
    const porterQuantityInput = document.getElementById('porter_quantity');

    if (minusButton) {
        minusButton.addEventListener('click', () => updatePorterQuantity(-1));
    }
    if (plusButton) {
        plusButton.addEventListener('click', () => updatePorterQuantity(1));
    }

    // อัปเดตเมื่อมีการเปลี่ยนแปลงจำนวนคนยกของผ่าน input (เผื่อมีคีย์บอร์ด)
    if (porterQuantityInput) {
        porterQuantityInput.addEventListener('change', (event) => {
            let newQuantity = parseInt(event.target.value);
            if (isNaN(newQuantity) || newQuantity < 0) {
                newQuantity = 0;
            }
            additionalServices.porter_quantity = newQuantity;
            event.target.value = newQuantity;
            updateSummaryPrices();
        });
    }

    eventListenersAdded = true;
}

// ฟังก์ชันสำหรับอัปเดตสถานะของบริการเพิ่มเติมและคำนวณราคาใหม่
function updateAdditionalServices(event) {
    const checkboxId = event.target.id;
    if (additionalServices[checkboxId] && typeof additionalServices[checkboxId].selected === 'boolean') {
        additionalServices[checkboxId].selected = event.target.checked;
        updateSummaryPrices();
    }
}

// ฟังก์ชันสำหรับอัปเดตจำนวนคนยกของ
function updatePorterQuantity(change) {
    const quantityInput = document.getElementById('porter_quantity');

    let currentQuantity = parseInt(quantityInput.value);

    if (isNaN(currentQuantity)) {
        currentQuantity = 0;
    }

    let newQuantity = currentQuantity + change;

    if (newQuantity < 0) {
        newQuantity = 0;
    }

    quantityInput.value = newQuantity;
    additionalServices.porter_quantity = newQuantity;

    updateSummaryPrices();
}


// ฟังก์ชันคำนวณราคารวมของบริการเพิ่มเติม และคืนค่าเป็น object ที่มีทั้งราคาและชื่อบริการ
function calculateAdditionalServicesTotalAndNames() {
    let total = 0;
    let serviceNames = [];

    // ตรวจสอบแต่ละบริการเพิ่มเติม
    for (const key in additionalServices) {
        if (additionalServices.hasOwnProperty(key)) {
            const service = additionalServices[key];
            if (service.selected && service.price) { // สำหรับ checkbox
                total += service.price;
                serviceNames.push(service.name);
            }
        }
    }

    // สำหรับคนยกของ (แยกจาก checkbox)
    if (additionalServices.porter_quantity > 0) {
        const porterCost = additionalServices.porter_quantity * additionalServices.porter_price_per_person;
        total += porterCost;
        serviceNames.push(`คนยกของ (${additionalServices.porter_quantity} คน)`);
    }
    return { total: total, names: serviceNames };
}

// ฟังก์ชันหลักที่ใช้ในการแสดงสรุปราคา (ถูกเรียกเมื่อโหลดหน้าและเมื่อมีการเปลี่ยนแปลงบริการเพิ่มเติม)
function displayOrderSummary() {
    if (orderDetails && orderDetails.truck) {
        // ใช้ orderDetails.truck.image โดยตรง
        document.getElementById('selected-truck-image').src = orderDetails.truck.image;
        document.getElementById('selected-truck-title').innerText = orderDetails.truck.name;
        document.getElementById('selected-truck-details').innerText = orderDetails.truck.details;

        const distanceKm = parseFloat(orderDetails.distance);
        document.getElementById('total-distance').innerText = `${distanceKm.toFixed(2)} กม.`;

        // ซ่อน element price-detail ที่มี id="selected-truck-name-summary" และ id="price-per-truck-summary"
        const truckPriceSummaryDiv = document.querySelector('.price-summary .price-detail #selected-truck-name-summary')?.closest('.price-detail');
        if (truckPriceSummaryDiv) {
            truckPriceSummaryDiv.style.display = 'none';
        }

        // เรียกฟังก์ชันอัปเดตราคาหลักหลังจากโหลดข้อมูลและตั้งค่า UI เริ่มต้น
        updateSummaryPrices(); 

        document.getElementById('pickup-address').innerText = orderDetails.pickupAddress;
        document.getElementById('dropoff-address').innerText = orderDetails.dropoffAddress;

        if (orderDetails.pickupCoordinates && orderDetails.dropoffCoordinates) {
            calculateAndDisplayRouteFromCoordinates(orderDetails.pickupCoordinates, orderDetails.dropoffCoordinates);
        }
    }
}
// ฟังก์ชันใหม่สำหรับคำนวณและอัปเดตราคาทั้งหมดในหน้าสรุปราคา
function updateSummaryPrices() {
    const distanceKm = parseFloat(orderDetails.distance);
    // ส่ง orderDetails.truck ที่ตอนนี้มี price_ranges และ starting_price ที่ถูกต้องไป
    const priceDetails = calculateTruckPriceDetails(orderDetails.truck, distanceKm); 

    let pricePerTruckBase = priceDetails.calculatedBasePrice; 
    let startingPriceMinimum = priceDetails.startingPrice; 

    let finalTruckPriceForCalculation = pricePerTruckBase; 

    // ตรวจสอบเงื่อนไขราคาเริ่มต้นขั้นต่ำ
    if (pricePerTruckBase < startingPriceMinimum && startingPriceMinimum > 0) {
        finalTruckPriceForCalculation = startingPriceMinimum; 
        document.getElementById('starting-price-display').innerText = `${formatCurrency(startingPriceMinimum)} บาท`;
        document.getElementById('starting-price-row').style.display = 'flex';
    } else {
        document.getElementById('starting-price-row').style.display = 'none';
    }

    const additionalServicesResult = calculateAdditionalServicesTotalAndNames();
    let totalAdditionalServicesCost = additionalServicesResult.total;
    let additionalServiceNames = additionalServicesResult.names;

    // คำนวณราคารวมทั้งหมด (ต้องคูณด้วยจำนวนรถด้วย)
    let finalPriceTotal = (finalTruckPriceForCalculation * orderDetails.quantity) + totalAdditionalServicesCost;

    // แสดงผลรายละเอียดราคา
    document.getElementById('tier-price').innerText = `${formatCurrency(priceDetails.tierCost)} บาท`;

    const serviceChargeRow = document.getElementById('service-charge-row');
    const serviceChargeSpan = document.getElementById('service-charge');
    if (priceDetails.serviceCost > 0) {
        serviceChargeSpan.innerText = `${formatCurrency(priceDetails.serviceCost)} บาท`;
        serviceChargeRow.style.display = 'flex';
    } else {
        serviceChargeRow.style.display = 'none';
    }

    const additionalChargeRow = document.getElementById('additional-charge-row');
    const additionalChargeSpan = document.getElementById('additional-charge');
    if (priceDetails.additionalCost > 0) {
        additionalChargeSpan.innerText = `${formatCurrency(priceDetails.additionalCost)} บาท`;
        additionalChargeRow.style.display = 'flex';
    } else {
        additionalChargeRow.style.display = 'none';
    }


    const additionalServicesTotalRow = document.getElementById('additional-services-total-row');
    const additionalServicesTotalSpan = document.getElementById('additional-services-total');
    const additionalServicesDetailsSpan = document.getElementById('additional-services-details');

    if (totalAdditionalServicesCost > 0) {
        if (additionalServicesTotalSpan) {
            additionalServicesTotalSpan.innerText = `${formatCurrency(totalAdditionalServicesCost)} บาท`;
        }
        if (additionalServicesDetailsSpan) {
            additionalServicesDetailsSpan.innerText = `(${additionalServiceNames.join(', ')})`;
        }
        if (additionalServicesTotalRow) {
            additionalServicesTotalRow.style.display = 'flex';
        }
    } else {
        if (additionalServicesTotalRow) {
            additionalServicesTotalRow.style.display = 'none';
        }
        if (additionalServicesDetailsSpan) {
            additionalServicesDetailsSpan.innerText = '';
        }
    }

    document.getElementById('final-price').innerText = `${formatCurrency(finalPriceTotal)} บาท`;
}


function calculateAndDisplayRouteFromCoordinates(origin, destination) {
    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
        } else {
            console.error('ไม่พบเส้นทาง: ' + status);
            document.getElementById('total-distance').innerText = "ไม่พบเส้นทาง";
            directionsRenderer.setDirections({ routes: [] });
        }
    });
}

function submitOrder() {
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const lineId = document.getElementById('line_id').value;

    const distanceKm = parseFloat(orderDetails.distance);
    // ส่ง orderDetails.truck ที่ตอนนี้มี price_ranges และ starting_price ที่ถูกต้องไป
    const priceDetails = calculateTruckPriceDetails(orderDetails.truck, distanceKm);

    let basePricePerTruckCalculated = priceDetails.calculatedBasePrice;
    let startingPriceMinimum = priceDetails.startingPrice;

    // กำหนดราคารถที่จะใช้ในการคำนวณสุดท้าย
    let finalTruckPriceForSubmission = basePricePerTruckCalculated;
    if (basePricePerTruckCalculated < startingPriceMinimum && startingPriceMinimum > 0) {
        finalTruckPriceForSubmission = startingPriceMinimum;
    }

    const additionalServicesResult = calculateAdditionalServicesTotalAndNames();
    let totalAdditionalServicesCost = additionalServicesResult.total;
    let additionalServiceNamesList = additionalServicesResult.names;

    // คำนวณราคารวมทั้งหมด (ต้องคูณด้วยจำนวนรถด้วย)
    let finalPriceTotal = (finalTruckPriceForSubmission * orderDetails.quantity) + totalAdditionalServicesCost;

    if (!name) {
        alert('กรุณากรอกชื่อ');
        return;
    }
    if (!phone) {
        alert('กรุณากรอกเบอร์โทรศัพท์');
        return;
    }

    if (orderDetails) {
        const bookingData = {
            'ชื่อ': name,
            'เบอร์โทรศัพท์': phone,
            'ID LINE': lineId,
            'สถานที่รับสินค้า': orderDetails.pickupAddress,
            'สถานที่ส่งสินค้า': orderDetails.dropoffAddress,
            'พิกัดรับสินค้า': orderDetails.pickupCoordinates,
            'พิกัดส่งสินค้า': orderDetails.dropoffCoordinates,
            'ระยะทาง (กม.)': distanceKm,
            'ประเภทรถบรรทุก': orderDetails.truck.name,
            'จำนวนรถบรรทุก': orderDetails.quantity,
            'ราคาระยะทาง (ตามกิโลเมตร)': formatCurrency(priceDetails.tierCost) + ' บาท',
            'ค่าบริการ': formatCurrency(priceDetails.serviceCost) + ' บาท',
            'ค่ากิโลเมตรเพิ่มเติม': formatCurrency(priceDetails.additionalCost) + ' บาท',
            // แสดงราคาเริ่มต้นขั้นต่ำในข้อมูลที่ส่ง หากมีการใช้
            ...(priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0 ?
                { 'ราคาเริ่มต้นขั้นต่ำที่ใช้': formatCurrency(priceDetails.startingPrice) + ' บาท' } : {}),
            'ราคาสุทธิรวมทั้งหมด': formatCurrency(finalPriceTotal) + ' บาท'
        };

        if (totalAdditionalServicesCost > 0) {
            bookingData['บริการเพิ่มเติม (รายละเอียด)'] = additionalServiceNamesList.join(', ');
            bookingData['รวมค่าบริการเพิ่มเติม'] = formatCurrency(totalAdditionalServicesCost) + ' บาท';
        }

        // คุณจะต้องเปลี่ยน URL ของ Formspree เป็นของโปรเจกต์ของคุณเอง
        fetch('https://formspree.io/f/xrbqdagb', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            displayBookingSlip(bookingData);
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง');
        });
    } else {
        alert('ไม่พบข้อมูลการสั่งซื้อ กรุณากลับไปหน้าแรก');
        window.location.href = 'index.html';
    }
}

// ฟังก์ชันสำหรับแสดงสลิปการจองใน Modal
function displayBookingSlip(bookingData) {
    const bookingSlipContent = document.getElementById('bookingSlipContent');
    const lineOaButton = document.getElementById('lineOaButton');

    const finalPriceTotal = bookingData['ราคาสุทธิรวมทั้งหมด'];
    delete bookingData['ราคาสุทธิรวมทั้งหมด']; // ลบออกจาก bookingData ชั่วคราว

    let htmlContent = `
        <style>
            .slip-container {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
                padding: 15px;
                border: 1px solid #eee;
                border-radius: 8px;
                background-color: #fff;
            }
            .slip-header {
                text-align: center;
                margin-bottom: 20px;
            }
            .slip-header h4 {
                color: #007bff;
                margin-bottom: 5px;
            }
            .slip-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px dashed #eee;
            }
            .slip-item:last-child {
                border-bottom: none;
            }
            .slip-item strong {
                flex-basis: 60%;
                text-align: left;
            }
            .slip-item span {
                flex-basis: 40%;
                text-align: right;
            }
            .slip-total {
                font-size: 16px;
                font-weight: bold;
                margin-top: 15px;
                border-top: 2px solid #333;
                padding-top: 10px;
                display: flex;
                justify-content: space-between;
                color: #007bff;
            }
            .slip-note {
                font-size: 12px;
                color: #666;
                margin-top: 20px;
                text-align: center;
            }
            @media print {
                body * {
                    visibility: hidden;
                }
                #bookingSuccessModal, #bookingSuccessModal * {
                    visibility: visible;
                }
                #bookingSuccessModal .modal-content {
                    width: 100%;
                    max-width: none;
                    margin: 0;
                    border: none;
                    box-shadow: none;
                }
                #bookingSuccessModal .modal-header,
                #bookingSuccessModal .modal-footer {
                    display: none;
                }
                .slip-container {
                    border: none;
                    padding: 0;
                    margin: 0;
                }
            }
        </style>
        <div class="slip-container">
            <div class="slip-header">
                <h4>สลิปการจองการขนส่ง</h4>
                <p>วันที่: ${new Date().toLocaleDateString('th-TH')}</p>
                <p>เวลา: ${new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
    `;

    for (const key in bookingData) {
        if (bookingData.hasOwnProperty(key)) {
            if (!key.includes('พิกัด') && key !== 'ราคาสุทธิรวมทั้งหมด') { 
                htmlContent += `
                    <div class="slip-item">
                        <strong>${key}:</strong>
                        <span>${bookingData[key]}</span>
                    </div>
                `;
            }
        }
    }

    htmlContent += `
            <div class="slip-total">
                <strong>ราคาสุทธิรวมทั้งหมด:</strong>
                <span>${finalPriceTotal}</span>
            </div>
    `;


    htmlContent += `
            <div class="slip-note">
                <p>โปรดเก็บสลิปนี้ไว้เป็นหลักฐานการจอง</p>
                <p>ทางเราจะติดต่อกลับเพื่อยืนยันการจองอีกครั้งในไม่ช้า</p>
            </div>
        </div>
    `;

    bookingSlipContent.innerHTML = htmlContent;

    lineOaButton.href = `https://line.me/R/ti/p/@390ltgch?oat_content=qr`; 

    const bookingSuccessModal = new bootstrap.Modal(document.getElementById('bookingSuccessModal'));
    bookingSuccessModal.show();
}

function printBookingSlip() {
    window.print();
}

function goToPreviousPage() {
    window.location.href = 'index.html';
}

window.onload = initCheckoutMap;
