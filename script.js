let map;
let directionsService;
let directionsRenderer;
let allTruckData = [
    {
        type: "กระบะ",
        name: "รถกระบะตู้ทึบ",
        details: "รับน้ำหนัก 1.00 ตัน | ราคาเริ่มต้น 1,500 บาท",
        image: "https://macxtransports.com/wp-content/uploads/2023/08/1-980x766-1.webp"
    },
    {
        type: "4ล้อจัมโบ้",
        name: "รถ 4 ล้อจัมโบ้",
        details: "รับน้ำหนัก 3.00 ตัน | ราคาเริ่มต้น 2,500 บาท",
        image: "https://macxtransports.com/wp-content/uploads/2023/08/2-980x766-1.webp"
    },
    {
        type: "6ล้อ",
        name: "รถบรรทุก 6 ล้อ",
        details: "รับน้ำหนัก 4.50 ตัน | ราคาเริ่มต้น 3,500 บาท",
        image: "https://macxtransports.com/wp-content/uploads/2023/08/3-980x766-1.webp"
    },
];
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
    return amount.toLocaleString('en-US');
}

function calculateTruckPriceDetails(truckType, distanceKm) {
    let startingPrice = 0; // ค่านี้จะไม่ถูกนำมาใช้ในการคำนวณราคารวมขั้นสุดท้ายอีกต่อไป
    let pricePerKmRanges = [];

    // กำหนดเรทราคาตามประเภทรถ
    switch (truckType) {
        case "รถกระบะตู้ทึบ":
            startingPrice = 1500;
            pricePerKmRanges = [
                { max: 100, rate: 23, serviceCharge: 700 }, // ลด 1 บาท
                { max: 200, rate: 21 }, // ลด 1 บาท
                { max: 300, rate: 19 }, // ลด 1 บาท
                { max: 400, rate: 17 }, // ลด 1 บาท
                { max: 500, rate: 15 }, // ลด 1 บาท
                { max: 600, rate: 14 }, // ลด 1 บาท
                { max: 700, rate: 12 }, // ลด 1 บาท
                { max: 800, rate: 11 }, // ลด 1 บาท
                { max: 900, rate: 10 }, // ลด 1 บาท
                // สำหรับระยะทาง 900 กม. ขึ้นไป ให้ใช้ rate 11 และ additionalPerKmCharge 1 จากระยะทางทั้งหมด
                { max: Infinity, rate: 10, additionalPerKmCharge: 1, applyToTotalKm: true, overrideServiceCharge: true } // ลด 1 บาท
            ];
            break;
        case "รถ 4 ล้อจัมโบ้":
            startingPrice = 2500;
            pricePerKmRanges = [
                { max: 100, rate: 23, serviceCharge: 700 }, // ลด 1 บาท
                { max: 200, rate: 22, serviceCharge: 500 }, // ลด 1 บาท
                { max: 300, rate: 21, serviceCharge: 500 }, // ลด 1 บาท
                { max: 400, rate: 19, serviceCharge: 500 }, // ลด 1 บาท
                { max: 500, rate: 17, serviceCharge: 500 }, // ลด 1 บาท
                { max: 600, rate: 16, serviceCharge: 500 }, // ลด 1 บาท
                { max: 700, rate: 14, serviceCharge: 500 }, // ลด 1 บาท
                { max: 800, rate: 13, serviceCharge: 500 }, // ลด 1 บาท
                { max: 900, rate: 12, serviceCharge: 500 }, // ลด 1 บาท
                // สำหรับระยะทาง 900 กม. ขึ้นไป ให้ใช้ rate 13 และ additionalPerKmCharge 1 จากระยะทางทั้งหมด
                { max: Infinity, rate: 12, additionalPerKmCharge: 1, applyToTotalKm: true, overrideServiceCharge: true, serviceCharge: 500 } // ลด 1 บาท
            ];
            break;
        case "รถบรรทุก 6 ล้อ":
            startingPrice = 3500;
            pricePerKmRanges = [
                { max: 100, rate: 24, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 200, rate: 23, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 300, rate: 22, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 400, rate: 21, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 500, rate: 19, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 600, rate: 18, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 700, rate: 16, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 800, rate: 16, serviceCharge: 3000 }, // ลด 1 บาท
                { max: 900, rate: 16, serviceCharge: 3000 }, // ลด 1 บาท
                // สำหรับระยะทาง 900 กม. ขึ้นไป ให้ใช้ rate 17 และ additionalPerKmCharge 1 จากระยะทางทั้งหมด
                { max: Infinity, rate: 16, additionalPerKmCharge: 1, applyToTotalKm: true, overrideServiceCharge: true, serviceCharge: 600 } // ลด 1 บาท
            ];
            break;
        default:
            return { total: 0, tierCost: 0, serviceCost: 0, additionalCost: 0, startingPrice: 0, calculatedBasePrice: 0 };
    }

    if (distanceKm <= 0) {
        // ถ้าไม่เกิน 0 กม. ราคาจะเท่ากับ startingPrice แต่เราจะคืนค่า calculatedBasePrice เป็น 0 เพื่อให้ราคาสุทธิรวมทั้งหมดไม่ใช้ startingPrice
        return { total: startingPrice, tierCost: 0, serviceCost: 0, additionalCost: 0, startingPrice: startingPrice, calculatedBasePrice: 0 };
    }

    let tierRate = 0;
    let serviceCost = 0;
    let additionalCost = 0;
    let currentTierMax = 0; // เพื่อเก็บค่า max ของ Tier ที่พบ

    // หา Tier ที่ระยะทางตกอยู่
    let foundRange = null;
    for (const range of pricePerKmRanges) {
        if (distanceKm <= range.max || range.max === Infinity) {
            foundRange = range;
            currentTierMax = range.max;
            break;
        }
    }

    // ถ้าไม่พบ Tier ที่เหมาะสม (ไม่น่าเกิดขึ้นถ้ากำหนด Infinity ไว้สุดท้าย)
    if (!foundRange) {
        return { total: 0, tierCost: 0, serviceCost: 0, additionalCost: 0, startingPrice: 0, calculatedBasePrice: 0 };
    }

    // กำหนด rate จาก Tier ที่พบ
    tierRate = foundRange.rate;

    // ตรวจสอบเงื่อนไข 900 กม. ขึ้นไป
    if (foundRange.applyToTotalKm && distanceKm >= 900) {
        tierCost = distanceKm * foundRange.rate;
        additionalCost = distanceKm * foundRange.additionalPerKmCharge;
        if (foundRange.overrideServiceCharge) {
            serviceCost = 0; // ยกเลิก serviceCharge ถ้ามีการ override
        }
        // เพิ่มเงื่อนไขสำหรับ serviceCharge ใน Tier มากกว่า 900 กม.
        if (foundRange.serviceCharge !== undefined) {
             serviceCost = foundRange.serviceCharge;
        }

    } else {
        // คำนวณราคาตามเรทของ Tier ที่พบ คูณด้วยระยะทางทั้งหมด
        tierCost = distanceKm * tierRate;

        // คำนวณค่าบริการ (จาก serviceCharge ของ Tier ที่พบ)
        if (foundRange.serviceCharge !== undefined) {
            serviceCost = foundRange.serviceCharge;
        }
    }

    let calculatedBasePrice = tierCost + serviceCost + additionalCost;

    return {
        total: calculatedBasePrice, // ผลรวมค่า tier, service, additional
        tierCost: tierCost, // ค่าตาม rate tier
        serviceCost: serviceCost, // ค่าบริการ 700 บาท
        additionalCost: additionalCost, // ค่ากิโลเมตรเพิ่มเติม (สำหรับ >900km)
        startingPrice: startingPrice, // ราคาเริ่มต้นขั้นต่ำของรถประเภทนั้นๆ (ไม่ได้ใช้ในการคำนวณราคารวมอีกต่อไป)
        calculatedBasePrice: calculatedBasePrice // ราคารวมที่คำนวณได้จาก กม. (ก่อนเทียบกับ startingPrice)
    };
}


function initMap() {
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

    // Display initial truck options
    filterTruckOptions('all');

    // Initial state of quantity selection
    const truckQuantitySection = document.getElementById('truck-quantity-selection');
    if (truckQuantitySection) {
        truckQuantitySection.innerHTML = 'ยังไม่ได้เลือกรถบรรทุก';
    }
}

function filterTruckOptions(type) {
    const truckOptionsDiv = document.getElementById('truck-options');
    truckOptionsDiv.innerHTML = ''; // Clear previous options
    let filteredTrucks;
    if (type === 'all') {
        filteredTrucks = allTruckData;
    } else {
        filteredTrucks = allTruckData.filter(truck => {
            return truck.type === type;
        });
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
                </div>
            </div>
        `;
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
    const card = Array.from(document.getElementById('truck-options').children).find(child => child.querySelector('h6').innerText === truck.name);
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
        const priceDetails = calculateTruckPriceDetails(selectedTruck.name, distanceKm);
        let finalPriceForDisplay = priceDetails.calculatedBasePrice; // ใช้ calculatedBasePrice โดยตรง

        // ลบเงื่อนไขที่เปรียบเทียบกับ startingPrice
        // if (priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0) {
        //     finalPriceForDisplay = priceDetails.startingPrice;
        // }

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
                const priceDetails = calculateTruckPriceDetails(selectedTruck.name, parseFloat(distanceKm));
                let finalPriceForDisplay = priceDetails.calculatedBasePrice; // ใช้ calculatedBasePrice โดยตรง

                // ลบเงื่อนไขที่เปรียบเทียบกับ startingPrice
                // if (priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0) {
                //     finalPriceForDisplay = priceDetails.startingPrice;
                // }

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
    const priceDetails = calculateTruckPriceDetails(selectedTruck.name, distanceKm);
    let finalTruckPriceForStorage = priceDetails.calculatedBasePrice; // ใช้ calculatedBasePrice โดยตรง
    // ลบเงื่อนไขที่เปรียบเทียบกับ startingPrice
    // if (priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0) {
    //     finalTruckPriceForStorage = priceDetails.startingPrice;
    // }

    const orderDetails = {
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
