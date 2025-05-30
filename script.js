// frontend/script.js

// เพิ่ม URL ของ Backend API
const API_BASE_URL = 'http://localhost:3000/api';

let map;
let directionsService;
let directionsRenderer;
// เปลี่ยนจาก Hardcode เป็นตัวแปรที่จะเก็บข้อมูลที่ดึงมาจาก Backend
let allTruckData = []; 
let selectedTruck = null;
let selectedQuantity = 1;
let pickupMap;
let dropoffMap;
let pickupMarker;
let dropoffMarker;
let pickupLatLng;
let dropoffLatLng;

// ฟังก์ชันสำหรับจัดรูปแบบตัวเลขให้มีเครื่องหมายคอมม่า
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount);
    }
    if (isNaN(amount)) {
        return 'N/A'; // หรือค่าเริ่มต้นที่คุณต้องการ
    }
    return amount.toLocaleString('en-US');
}

// ฟังก์ชันสำหรับคำนวณราคาค่าขนส่งตามประเภทรถและระยะทาง
// ตอนนี้จะใช้ price_ranges ที่ได้มาจากข้อมูลรถบรรทุกโดยตรง
function calculateTruckPriceDetails(truckData, distanceKm) {
    let startingPrice = parseFloat(truckData.starting_price);
    // price_ranges_json จะถูกแปลงเป็น Object/Array แล้วโดย mysql2 ใน Backend
    const pricePerKmRanges = truckData.price_ranges; 

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
        // หากไม่พบช่วงที่เหมาะสม (ไม่น่าเกิดขึ้นถ้ามี Infinity ในช่วงสุดท้าย)
        return { total: 0, tierCost: 0, serviceCost: 0, additionalCost: 0, startingPrice: 0, calculatedBasePrice: 0 };
    }

    tierRate = foundRange.rate;

    if (foundRange.applyToTotalKm && distanceKm >= 900) { // เงื่อนไข 900 กม. ขึ้นไป
        tierCost = distanceKm * foundRange.rate;
        additionalCost = distanceKm * (foundRange.additionalPerKmCharge || 0); // ใช้ 0 ถ้าไม่มีค่า
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


async function initMap() {
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: { lat: 13.7563, lng: 100.5018 },
        zoom: 10
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map
    });

    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');
    const pickupInput = document.getElementById('pickup');
    const dropoffInput = document.getElementById('dropoff');

    // Initialize Autocomplete for origin and destination
    new google.maps.places.Autocomplete(originInput);
    new google.maps.places.Autocomplete(destinationInput);
    new google.maps.places.Autocomplete(pickupInput);
    new google.maps.places.Autocomplete(dropoffInput);

    // Initialize mini-maps for pickup and dropoff
    pickupMap = new google.maps.Map(document.getElementById('pickup-map-container'), {
        center: { lat: 13.7563, lng: 100.5018 },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true
    });

    dropoffMap = new google.maps.Map(document.getElementById('dropoff-map-container'), {
        center: { lat: 13.7563, lng: 100.5018 },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true
    });

    // โหลดข้อมูลรถบรรทุกจาก Backend ก่อน
    await fetchTruckData();

    // Event listener for truck type buttons
    const truckTypeButtons = document.querySelectorAll('.truck-type-button');
    truckTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.truck-type-button.active').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const type = this.dataset.type;
            filterTruckOptions(type);
        });
    });

    // Display initial truck options (หลังจากโหลดข้อมูลแล้ว)
    filterTruckOptions('all');

    // Initial state of quantity selection
    const truckQuantitySection = document.getElementById('truck-quantity-selection');
    if (truckQuantitySection) {
        truckQuantitySection.innerHTML = 'ยังไม่ได้เลือกรถบรรทุก';
    }
}

// ฟังก์ชันใหม่สำหรับดึงข้อมูลรถบรรทุกจาก Backend
async function fetchTruckData() {
    try {
        const response = await fetch(`${API_BASE_URL}/trucks`);
        const data = await response.json();
        if (response.ok) {
            // แปลง price_ranges_json string เป็น JavaScript Object/Array
            allTruckData = data.trucks.map(truck => ({
                ...truck,
                price_ranges: JSON.parse(truck.price_ranges_json) // แปลง JSON string กลับเป็น Array
            }));
            console.log("Truck data loaded from backend:", allTruckData);
        } else {
            console.error("Failed to fetch truck data:", data.error);
            alert("ไม่สามารถโหลดข้อมูลรถบรรทุกได้จาก Server");
        }
    } catch (error) {
        console.error("Error fetching truck data:", error);
        alert("ไม่สามารถเชื่อมต่อกับ Backend Server เพื่อโหลดข้อมูลรถบรรทุกได้");
    }
}


function filterTruckOptions(type) {
    const truckOptionsDiv = document.getElementById('truck-options');
    truckOptionsDiv.innerHTML = ''; // Clear previous options
    let filteredTrucks;
    if (type === 'all') {
        filteredTrucks = allTruckData;
    } else {
        filteredTrucks = allTruckData.filter(truck => truck.type === type);
    }

    if (filteredTrucks.length === 0) {
        truckOptionsDiv.innerHTML = '<p class="text-muted text-center mt-3">ไม่พบข้อมูลรถบรรทุกสำหรับประเภทนี้</p>';
        return;
    }

    filteredTrucks.forEach(truck => {
        const card = document.createElement('div');
        card.classList.add('truck-option-card', 'mb-2', 'p-2');
        card.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-2 col-4">
                    <img src="${truck.image}" alt="${truck.name}" class="img-fluid">
                </div>
                <div class="col-md-10 col-8">
                    <h6>${truck.name}</h6>
                    <small class="truck-info">${truck.details}</small>
                    <small class="truck-starting-price" style="font-size: 0.75em !important; color: #6c757d !important; line-height: 1.4;">
                        ราคาเริ่มต้น ${formatCurrency(parseFloat(truck.starting_price))} บาท
                    </small>
                </div>
            </div>
        `; // <<< MODIFICATION HERE
        card.addEventListener('click', () => selectTruck(truck));
        truckOptionsDiv.appendChild(card);
    });
    // Reset quantity section when truck selection changes
    const truckQuantitySection = document.getElementById('truck-quantity-selection');
    if (truckQuantitySection) {
        truckQuantitySection.innerHTML = 'ยังไม่ได้เลือกรถบรรทุก';
    }
    selectedTruck = null;
    // อัปเดตราคาเป็น 0 หรือข้อความแจ้งเตือนเมื่อรถถูกรีเซ็ต
    const priceResultElement = document.getElementById('price-result');
    if (priceResultElement) {
        priceResultElement.innerText = '';
    }
}

function selectTruck(truck) {
    document.querySelectorAll('.truck-option-card.selected').forEach(card => card.classList.remove('selected'));
    // ค้นหา card ที่มี `data-id` หรือ `data-name` ตรงกับ truck.name ที่เลือก
    const card = Array.from(document.getElementById('truck-options').children).find(
        child => child.querySelector('h6')?.innerText === truck.name
    );
    if (card) {
        card.classList.add('selected');
    }
    selectedTruck = truck;
    selectedQuantity = 1; // Reset quantity to 1 when a new truck is selected
    const truckQuantitySection = document.getElementById('truck-quantity-selection');
    if (truckQuantitySection) {
        truckQuantitySection.innerHTML = `
            <h6 class="alert-heading">${truck.name}</h6>
            <p class="mb-0">เลือกจำนวนรถที่ต้องการ</p>
            <div class="quantity-controls mt-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(-1)">-</button>
                <input type="number" id="truck-quantity" class="form-control form-control-sm mx-2" value="${selectedQuantity}" min="1" style="width: 60px; text-align: center;">
                <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(1)">+</button> คัน
            </div>
        `;
        // Attach event listener to the quantity input after it's created
        const quantityInput = document.getElementById('truck-quantity');
        quantityInput.addEventListener('change', (event) => {
            const newQuantity = parseInt(event.target.value);
            if (!isNaN(newQuantity) && newQuantity >= 1) {
                selectedQuantity = newQuantity;
                // เมื่อจำนวนเปลี่ยน ให้คำนวณราคาใหม่ทันที
                recalculatePriceOnQuantityChange();
            } else {
                selectedQuantity = 1;
                quantityInput.value = 1;
                recalculatePriceOnQuantityChange();
            }
        });
    }
    // เมื่อเลือกรถใหม่ ให้คำนวณราคาใหม่ทันทีหากมีระยะทางแล้ว
    const distanceText = document.getElementById('distance-result').innerText;
    if (distanceText && distanceText.includes('ระยะทาง:')) {
        calculateDistance();
    }
}

function updateQuantity(change) {
    if (selectedTruck) {
        const quantityInput = document.getElementById('truck-quantity');
        let newQuantity = parseInt(quantityInput.value) + change;
        if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1;
        }
        quantityInput.value = newQuantity;
        selectedQuantity = newQuantity;
        // เมื่อจำนวนเปลี่ยน ให้คำนวณราคาใหม่ทันที
        recalculatePriceOnQuantityChange();
    } else {
        alert('กรุณาเลือกรถบรรทุกก่อน');
    }
}

// ฟังก์ชันใหม่เพื่อคำนวณราคาเมื่อมีการเปลี่ยนแปลงจำนวนรถ
function recalculatePriceOnQuantityChange() {
    const distanceResultElement = document.getElementById('distance-result');
    const distanceText = distanceResultElement.innerText;
    const distanceMatch = distanceText.match(/ระยะทาง: (\d+\.?\d*) กม\./);
    let distanceKm = 0;
    if (distanceMatch && distanceMatch[1]) {
        distanceKm = parseFloat(distanceMatch[1]);
    }

    if (selectedTruck && distanceKm > 0) {
        const priceDetails = calculateTruckPriceDetails(selectedTruck, distanceKm); // ส่ง selectedTruck object ไปเลย
        let finalPriceForDisplay = priceDetails.calculatedBasePrice;

        if (priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0) {
            finalPriceForDisplay = priceDetails.startingPrice;
        }

        const formattedPrice = formatCurrency(finalPriceForDisplay * selectedQuantity); // คูณด้วยจำนวนรถ
        document.getElementById('price-result').innerText = `ราคาโดยประมาณ: ${formattedPrice} บาท`;
    } else if (!selectedTruck) {
        document.getElementById('price-result').innerText = 'กรุณาเลือกรถบรรทุกเพื่อคำนวณราคา';
    } else {
        document.getElementById('price-result').innerText = ''; // Clear price if distance is 0
    }
}


function calculateDistance() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const pickupInput = document.getElementById('pickup');
    const dropoffInput = document.getElementById('dropoff');

    if (!origin || !destination) {
        alert('กรุณากรอกจุดเริ่มต้นและจุดหมายปลายทาง');
        return;
    }

    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            const route = response.routes[0];
            let totalDistance = 0;
            for (let i = 0; i < route.legs.length; i++) {
                totalDistance += route.legs[i].distance.value;
            }
            // totalDistance is in meters, convert to km and fix to 2 decimal places
            const distanceKm = (totalDistance / 1000).toFixed(2);
            document.getElementById('distance-result').innerText = `ระยะทาง: ${distanceKm} กม.`;

            pickupLatLng = route.legs[0].start_location;
            dropoffLatLng = route.legs[route.legs.length - 1].end_location;

            // อัปเดตค่าใน input field ของจุดรับ/ส่งสินค้าด้วยที่อยู่จริงที่ Maps API คืนค่ามา
            pickupInput.value = route.legs[0].start_address;
            dropoffInput.value = route.legs[route.legs.length - 1].end_address;

            updateMiniMapMarkers(pickupLatLng, dropoffLatLng);

            // ดึงข้อมูลราคาเมื่อคำนวณระยะทางได้แล้ว
            if (selectedTruck) {
                const priceDetails = calculateTruckPriceDetails(selectedTruck, parseFloat(distanceKm)); // ส่ง selectedTruck object ไปเลย
                let finalPriceForDisplay = priceDetails.calculatedBasePrice;

                // ถ้า calculatedBasePrice น้อยกว่า startingPrice และ startingPrice > 0 ให้ใช้ startingPrice
                if (priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0) {
                    finalPriceForDisplay = priceDetails.startingPrice;
                }

                const formattedPrice = formatCurrency(finalPriceForDisplay * selectedQuantity); // คูณด้วยจำนวนรถ
                document.getElementById('price-result').innerText = `ราคาโดยประมาณ: ${formattedPrice} บาท`;
            } else {
                const priceResultElement = document.getElementById('price-result');
                if (priceResultElement) {
                    priceResultElement.innerText = 'กรุณาเลือกรถบรรทุกเพื่อคำนวณราคา';
                }
            }

        } else {
            document.getElementById('distance-result').innerText = 'ไม่พบเส้นทาง';
            const priceResultElement = document.getElementById('price-result');
            if (priceResultElement) {
                priceResultElement.innerText = ''; // Clear price if no route
            }
            directionsRenderer.setDirections({ routes: [] });
            pickupLatLng = null;
            dropoffLatLng = null;
            updateMiniMapMarkers(null, null);
        }
    });
}

function updateMiniMapMarkers(pickup, dropoff) {
    // Pickup Marker
    if (pickup) {
        if (pickupMarker) {
            pickupMarker.setPosition(pickup);
        } else {
            pickupMarker = new google.maps.Marker({
                map: pickupMap,
                position: pickup,
                label: 'A'
            });
        }
        pickupMap.setCenter(pickup);
    } else if (pickupMarker) {
        pickupMarker.setMap(null);
        pickupMarker = null;
        pickupMap.setCenter({ lat: 13.7563, lng: 100.5018 });
    }

    // Dropoff Marker
    if (dropoff) {
        if (dropoffMarker) {
            dropoffMarker.setPosition(dropoff);
        } else {
            dropoffMarker = new google.maps.Marker({
                map: dropoffMap,
                position: dropoff,
                label: 'B'
            });
        }
        dropoffMap.setCenter(dropoff);
    } else if (dropoffMarker) {
        dropoffMarker.setMap(null);
        dropoffMarker = null;
        dropoffMap.setCenter({ lat: 13.7563, lng: 100.5018 });
    }
}

function goToCheckout() {
    const pickupAddress = document.getElementById('pickup').value;
    const dropoffAddress = document.getElementById('dropoff').value;

    if (!pickupAddress || !dropoffAddress) {
        alert('กรุณาระบุจุดรับและจุดส่งสินค้า');
        return;
    }

    if (!selectedTruck) {
        alert('กรุณาเลือกรถบรรทุก');
        return;
    }

    if (!pickupLatLng || !dropoffLatLng) {
        alert('กรุณาคํานวณเส้นทางก่อน');
        return;
    }

    const distanceResultElement = document.getElementById('distance-result');
    const distanceText = distanceResultElement.innerText;
    const distanceMatch = distanceText.match(/ระยะทาง: (\d+\.?\d*) กม\./);
    let distanceKm = 0;
    if (distanceMatch && distanceMatch[1]) {
        distanceKm = parseFloat(distanceMatch[1]);
    } else {
        alert('ไม่สามารถดึงข้อมูลระยะทางได้ กรุณาลองคำนวณเส้นทางอีกครั้ง');
        return;
    }

    // คำนวณราคาขั้นสุดท้ายอีกครั้งเพื่อเก็บใน localStorage อย่างถูกต้อง
    const priceDetails = calculateTruckPriceDetails(selectedTruck, distanceKm);
    let finalTruckPriceForStorage = priceDetails.calculatedBasePrice;
    if (priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0) {
        finalTruckPriceForStorage = priceDetails.startingPrice;
    }

    const orderDetails = {
        // ส่ง selectedTruck ทั้ง object ไปเลย เพื่อให้ checkout.html สามารถใช้ข้อมูล price_ranges ได้
        truck: selectedTruck, 
        quantity: selectedQuantity,
        pickupAddress: pickupAddress,
        dropoffAddress: dropoffAddress,
        pickupCoordinates: { lat: pickupLatLng.lat(), lng: pickupLatLng.lng() },
        dropoffCoordinates: { lat: dropoffLatLng.lat(), lng: dropoffLatLng.lng() },
        distance: distanceKm,
        // เพิ่มราคาต่อคันที่คำนวณได้จริงไปเก็บใน orderDetails เพื่อความถูกต้องในหน้า checkout
        calculatedBasePricePerTruck: finalTruckPriceForStorage
    };

    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
    window.location.href = 'checkout.html';
}

window.onload = initMap;
