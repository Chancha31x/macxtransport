let map;
let directionsService;
let directionsRenderer;
let orderDetails;

// เพิ่มข้อมูลประเภทรถบรรทุกที่ใช้เลือกใน Modal
const truckOptionsData = [
    {
        name: "รถกระบะตู้ทึบ",
        image: "https://macxtransports.com/wp-content/uploads/2023/08/1-980x766-1.webp", // ตรวจสอบ path รูปภาพให้ถูกต้อง
        details: "ขนาด: 2.1 x 1.6 x 1.7 เมตร | รับน้ำหนัก: 1 ตัน ราคาเริ่มต้น 1,500 บาท",
        porter_price: 450 // ราคาคนยกของต่อคนสำหรับรถกระบะ
    },
    {
        name: "รถ 4 ล้อจัมโบ้",
        image: "https://macxtransports.com/wp-content/uploads/2023/08/2-980x766-1.webp", // ตรวจสอบ path รูปภาพให้ถูกต้อง
        details: "ขนาด: 3.1 x 1.7 x 1.8 เมตร | รับน้ำหนัก: 2 ตัน ราคาเริ่มต้น 2,500 บาท",
        porter_price: 550 // ราคาคนยกของต่อคนสำหรับรถ 4 ล้อจัมโบ้
    },
    {
        name: "รถบรรทุก 6 ล้อ",
        image: "https://macxtransports.com/wp-content/uploads/2023/08/3-980x766-1.webp", // ตรวจสอบ path รูปภาพให้ถูกต้อง
        details: "ขนาด: 5.5 x 2.2 x 2.3 เมตร | รับน้ำหนัก: 7 ตัน ราคาเริ่มต้น 3,500 บาท",
        porter_price: 650 // ราคาคนยกของต่อคนสำหรับรถบรรทุก 6 ล้อ
    }
];

// ตัวแปรสำหรับเก็บสถานะและจำนวนของบริการเพิ่มเติม
let additionalServices = {
    disassemble_small: { name: "ถอดประกอบสินค้า (เล็ก)", price: 700, selected: false },
    disassemble_large: { name: "ถอดประกอบสินค้า (ใหญ่)", price: 1500, selected: false },
    product_protection: { name: "ป้องกันสินค้า", price: 600, selected: false },
    bubble_wrap: { name: "บับเบิ้ลกันกระแทก", price: 700, selected: false },
    porter_quantity: 0, // ค่าเริ่มต้นคือ 0
    porter_price_per_person: 0
};

// ฟังก์ชันสำหรับจัดรูปแบบตัวเลขให้มีเครื่องหมายคอมม่า
function formatCurrency(amount) {
    return amount.toLocaleString('en-US');
}

// ฟังก์ชันสำหรับคำนวณราคาค่าขนส่งตามประเภทรถและระยะทาง (ปรับปรุงเป็น Single-Tier Based on Highest Tier Reached)
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
        serviceCost: serviceCost, // ค่าบริการ
        additionalCost: additionalCost, // ค่ากิโลเมตรเพิ่มเติม (สำหรับ >900km)
        startingPrice: startingPrice, // ราคาเริ่มต้นขั้นต่ำของรถประเภทนั้นๆ (ไม่ได้ใช้ในการคำนวณราคารวมอีกต่อไป)
        calculatedBasePrice: calculatedBasePrice // ราคารวมที่คำนวณได้จาก กม. (ก่อนเทียบกับ startingPrice)
    };
}


function initCheckoutMap() {
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

    loadOrderDetails();
}

function loadOrderDetails() {
    const orderDetailsString = localStorage.getItem('orderDetails');
    if (orderDetailsString) {
        orderDetails = JSON.parse(orderDetailsString);

        // กำหนดราคาคนยกของตามประเภทรถที่เลือกปัจจุบัน
        const currentTruckData = truckOptionsData.find(t => t.name === orderDetails.truck.name);
        if (currentTruckData) {
            additionalServices.porter_price_per_person = currentTruckData.porter_price;
        } else {
            additionalServices.porter_price_per_person = 0; // Fallback
        }

        // อัปเดต UI ของราคาต่อคนทันทีที่โหลด
        document.getElementById('porter-price-per-person').innerText = `${formatCurrency(additionalServices.porter_price_per_person)} บาท/คน`;

        // ตั้งค่า porter_quantity ให้เป็น 0 และอัปเดตค่าใน input field ทันทีเมื่อโหลดหน้าใหม่เสมอ
        additionalServices.porter_quantity = 0;
        const porterQuantityInput = document.getElementById('porter_quantity');
        if (porterQuantityInput) {
            porterQuantityInput.value = additionalServices.porter_quantity;
        }

        // ตั้งค่าสถานะ checkbox ของบริการเพิ่มเติมตาม orderDetails ที่มีอยู่ใน localStorage
        // หากไม่มีข้อมูลใน localStorage สำหรับบริการเพิ่มเติมเหล่านี้ (เช่นเพิ่งเพิ่มเข้ามา)
        // มันจะยังคงเป็น false ซึ่งเป็นค่าเริ่มต้นที่คาดหวัง
        // หรือถ้าต้องการเก็บสถานะ checkbox ด้วย ต้องมีการบันทึกใน localStorage ในหน้าแรกด้วย
        // (ส่วนนี้ควรถูกปรับปรุงหากคุณต้องการให้สถานะของบริการเพิ่มเติมถูกส่งมาจากหน้าแรก)
        if (orderDetails.additionalServices) {
            for (const key in additionalServices) {
                if (additionalServices.hasOwnProperty(key) && orderDetails.additionalServices[key] !== undefined) {
                    if (typeof additionalServices[key].selected === 'boolean') { // สำหรับ checkbox
                        additionalServices[key].selected = orderDetails.additionalServices[key];
                        const checkbox = document.getElementById(key);
                        if (checkbox) {
                            checkbox.checked = orderDetails.additionalServices[key];
                        }
                    } else if (key === 'porter_quantity') { // สำหรับคนยกของ
                        additionalServices.porter_quantity = orderDetails.additionalServices[key];
                        const porterInput = document.getElementById('porter_quantity');
                        if (porterInput) {
                            porterInput.value = orderDetails.additionalServices[key];
                        }
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
            <div class="card truck-card ${orderDetails.truck.name === truck.name ? 'selected-truck-card' : ''}" data-truck-name="${truck.name}">
                <img src="${truck.image}" class="card-img-top" alt="${truck.name}">
                <div class="card-body">
                    <h5 class="card-title">${truck.name}</h5>
                    <p class="card-text">${truck.details}</p>
                    <button class="btn btn-primary btn-select-truck" data-truck-name="${truck.name}">เลือก</button>
                </div>
            </div>
        `;
        container.appendChild(truckCard);
    });

    // เพิ่ม Event Listener ให้กับปุ่ม "เลือก" ใน Modal
    document.querySelectorAll('.btn-select-truck').forEach(button => {
        button.addEventListener('click', (event) => {
            const selectedTruckName = event.target.dataset.truckName;
            const selectedTruckData = truckOptionsData.find(t => t.name === selectedTruckName);
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
    // อัปเดต orderDetails ด้วยข้อมูลรถใหม่
    orderDetails.truck = {
        name: newTruckData.name,
        image: newTruckData.image,
        details: newTruckData.details,
    };

    // อัปเดตราคาคนยกของตามประเภทรถใหม่
    additionalServices.porter_price_per_person = newTruckData.porter_price;

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
    // ตรวจสอบว่า checkboxId มีอยู่ใน additionalServices และเป็น checkbox จริงๆ
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
        // ค้นหารูปภาพที่ถูกต้องจาก truckOptionsData โดยใช้ชื่อรถ
        const selectedTruckDataForImage = truckOptionsData.find(t => t.name === orderDetails.truck.name);
        if (selectedTruckDataForImage) {
            document.getElementById('selected-truck-image').src = selectedTruckDataForImage.image;
        } else {
            // Fallback กรณีไม่พบรูปภาพ (เช่น หากชื่อรถไม่ตรงกับ truckOptionsData)
            document.getElementById('selected-truck-image').src = 'assets/360truck/images/truckicon/default.png';
        }

        document.getElementById('selected-truck-title').innerText = orderDetails.truck.name;
        document.getElementById('selected-truck-details').innerText = orderDetails.truck.details || `ขนาด: ${orderDetails.truck.size}`;

        const distanceKm = parseFloat(orderDetails.distance);
        document.getElementById('total-distance').innerText = `${distanceKm.toFixed(2)} กม.`;

        // ซ่อน element price-detail ที่มี id="selected-truck-name-summary" และ id="price-per-truck-summary"
        const truckPriceSummaryDiv = document.querySelector('.price-summary .price-detail #selected-truck-name-summary')?.closest('.price-detail');
        if (truckPriceSummaryDiv) {
            truckPriceSummaryDiv.style.display = 'none';
        }

        // เรียกฟังก์ชันอัปเดตราคาหลักหลังจากโหลดข้อมูลและตั้งค่า UI เริ่มต้น
        updateSummaryPrices(); // เรียกใช้เพื่อให้ราคาสรุปอัปเดตเมื่อโหลดหน้าครั้งแรก

        document.getElementById('pickup-address').innerText = orderDetails.pickupAddress;
        document.getElementById('dropoff-address').innerText = orderDetails.dropoffAddress;

        if (orderDetails.pickupCoordinates && orderDetails.dropoffCoordinates) {
            calculateAndDisplayRouteFromCoordinates(orderDetails.pickupCoordinates, orderDetails.dropoffCoordinates);
        }
    }
}
// ฟังก์ชันใหม่สำหรับคำนวณและอัปเดตราคาทั้งหมดในหน้าสรุปราคา (ปรับปรุง)
function updateSummaryPrices() {
    const distanceKm = parseFloat(orderDetails.distance);
    const priceDetails = calculateTruckPriceDetails(orderDetails.truck.name, distanceKm);

    let pricePerTruckBase = priceDetails.calculatedBasePrice; // ราคารถตาม กม. ที่คำนวณได้
    // let startingPriceMinimum = priceDetails.startingPrice; // ไม่นำมาใช้ในการคำนวณราคารวมขั้นสุดท้ายอีกต่อไป

    // ลบ Logic ที่ใช้ startingPriceMinimum ในการคำนวณราคาที่จะแสดง
    // let priceToDisplayForTruck = pricePerTruckBase;
    // let finalTruckPriceForCalculation = pricePerTruckBase;

    // // ตรวจสอบเงื่อนไขราคาเริ่มต้นขั้นต่ำ (ส่วนนี้จะไม่ถูกใช้ในการแสดงผลราคาสุทธิรวมทั้งหมดอีกต่อไป)
    // if (pricePerTruckBase < startingPriceMinimum && startingPriceMinimum > 0) {
    //     priceToDisplayForTruck = startingPriceMinimum; // ถ้าคำนวณได้น้อยกว่าขั้นต่ำ ให้แสดงขั้นต่ำ
    //     finalTruckPriceForCalculation = startingPriceMinimum; // และใช้ขั้นต่ำในการคำนวณ
    //     document.getElementById('starting-price-display').innerText = `${formatCurrency(startingPriceMinimum)} บาท`;
    //     document.getElementById('starting-price-row').style.display = 'flex';
    // } else {
    //     document.getElementById('starting-price-row').style.display = 'none';
    // }

    // ซ่อนแถว "ราคาเริ่มต้นขั้นต่ำ" เสมอ เนื่องจากไม่ได้นำมาใช้ในการคำนวณราคาสุทธิอีกต่อไป
    document.getElementById('starting-price-row').style.display = 'none';


    const additionalServicesResult = calculateAdditionalServicesTotalAndNames();
    let totalAdditionalServicesCost = additionalServicesResult.total;
    let additionalServiceNames = additionalServicesResult.names;

    // คำนวณราคารวมทั้งหมด (ใช้ pricePerTruckBase โดยตรง ซึ่งคือ tierCost + serviceCost + additionalCost)
    let finalPriceTotal = (pricePerTruckBase * orderDetails.quantity) + totalAdditionalServicesCost;

    // แสดงผลรายละเอียดราคา
    document.getElementById('tier-price').innerText = `${formatCurrency(priceDetails.tierCost)} บาท`;

    const serviceChargeRow = document.getElementById('service-charge-row');
    const serviceChargeSpan = document.getElementById('service-charge');
    const serviceChargeLabelSpan = serviceChargeRow.querySelector('span:first-child'); // เลือก span ที่เป็น label

    if (priceDetails.serviceCost > 0) {
        serviceChargeSpan.innerText = `${formatCurrency(priceDetails.serviceCost)} บาท`;
        serviceChargeRow.style.display = 'flex';
        // อัปเดต Label ของค่าบริการตามเงื่อนไข
        if (priceDetails.serviceCost === 500) {
            serviceChargeLabelSpan.innerText = 'ราคาบรรทุกสินค้า สำหรับน้ำหนักไม่เกิน 3 ตัน';
        } else if (priceDetails.serviceCost === 600) {
            serviceChargeLabelSpan.innerText = 'ราคาบรรทุกสินค้า สำหรับน้ำหนักไม่เกิน 4 ตัน';
        } else {
            serviceChargeLabelSpan.innerText = 'ค่าบริการ'; // ค่าเริ่มต้น
        }
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
    const priceDetails = calculateTruckPriceDetails(orderDetails.truck.name, distanceKm);

    let basePricePerTruckCalculated = priceDetails.calculatedBasePrice;
    // let startingPriceMinimum = priceDetails.startingPrice; // ไม่นำมาใช้ในการคำนวณราคารวมขั้นสุดท้ายอีกต่อไป

    // กำหนดราคารถที่จะใช้ในการคำนวณสุดท้าย (ใช้ basePricePerTruckCalculated โดยตรง)
    let finalTruckPriceForSubmission = basePricePerTruckCalculated;
    // if (basePricePerTruckCalculated < startingPriceMinimum && startingPriceMinimum > 0) {
    //     finalTruckPriceForSubmission = startingPriceMinimum;
    // }

    const additionalServicesResult = calculateAdditionalServicesTotalAndNames();
    let totalAdditionalServicesCost = additionalServicesResult.total;
    let additionalServiceNamesList = additionalServicesResult.names;

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
            // แสดงราคาเริ่มต้นขั้นต่ำในข้อมูลที่ส่ง หากมีการใช้ (ถูกปิดการใช้งานแล้ว)
            // ...(priceDetails.calculatedBasePrice < priceDetails.startingPrice && priceDetails.startingPrice > 0 ?
            //     { 'ราคาเริ่มต้นขั้นต่ำที่ใช้': formatCurrency(priceDetails.startingPrice) + ' บาท' } : {}),
            'ราคาสุทธิรวมทั้งหมด': formatCurrency(finalPriceTotal) + ' บาท'
        };

        if (totalAdditionalServicesCost > 0) {
            bookingData['บริการเพิ่มเติม (รายละเอียด)'] = additionalServiceNamesList.join(', ');
            bookingData['รวมค่าบริการเพิ่มเติม'] = formatCurrency(totalAdditionalServicesCost) + ' บาท';
        }

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

    // แยกราคาสุทธิออกมาก่อน
    const finalPriceTotal = bookingData['ราคาสุทธิรวมทั้งหมด'];
    // ลบออกจาก bookingData ชั่วคราวเพื่อไม่ให้ถูกวนลูปในตอนแรก
    delete bookingData['ราคาสุทธิรวมทั้งหมด'];

    let htmlContent = `
        <style>
            .slip-container {
                font-family: 'Kanit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* ใช้ Kanit ถ้ามี */
                font-size: 12px; /* ลดขนาด font หลัก */
                line-height: 1.6;
                color: #333;
                padding: 10px; /* ลด padding */
                border: 1px solid #eee;
                border-radius: 8px;
                background-color: #fff;
            }
            .slip-header {
                text-align: center;
                margin-bottom: 15px; /* ลด margin */
            }
            .slip-header h4 {
                color:rgb(255, 0, 0);
                margin-bottom: 5px;
                font-size: 1.1em; /* ลดขนาด h4 เล็กน้อย */
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
                font-size: 14px; /* ลดขนาด font ราคารวม */
                font-weight: bold;
                margin-top: 15px;
                border-top: 2px solid #333;
                padding-top: 10px;
                display: flex;
                justify-content: space-between;
                color:rgb(255, 0, 0); /* สีน้ำเงินเพื่อให้เด่นขึ้น */
            }
            .slip-note {
                font-size: 10px; /* ลดขนาด font หมายเหตุ */
                color: #666;
                margin-top: 15px; /* ลด margin */
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
                <h4>MACX TRANSPORTS Co.,Ltd.</h4>
                <p>วันที่: ${new Date().toLocaleDateString('th-TH')}</p>
                <p>เวลา: ${new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
    `;

    // วนลูปเพื่อแสดงข้อมูลอื่นๆ ยกเว้นราคาสุทธิ
    for (const key in bookingData) {
        if (bookingData.hasOwnProperty(key)) {
            let displayKey = key;
            let displayValue = bookingData[key];

            // ตรวจสอบและเปลี่ยนชื่อ Key สำหรับ "ค่าบริการ"
            if (key === 'ค่าบริการ') {
                if (bookingData[key] === '500 บาท') {
                    displayKey = 'ราคาบรรทุกสินค้า สำหรับน้ำหนักไม่เกิน 3 ตัน';
                } else if (bookingData[key] === '600 บาท') {
                    displayKey = 'ราคาบรรทุกสินค้า สำหรับน้ำหนักไม่เกิน 4 ตัน';
                }
            }

            // ไม่แสดงข้อมูลพิกัดในสลิป
            if (!displayKey.includes('พิกัด') && displayKey !== 'ราคาสุทธิรวมทั้งหมด') {
                htmlContent += `
                    <div class="slip-item">
                        <strong>${displayKey}:</strong>
                        <span>${displayValue}</span>
                    </div>
                `;
            }
        }
    }

    // เพิ่มราคาสุทธิไว้ด้านล่างสุดโดยใช้ class slip-total
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

    lineOaButton.href = `https://line.me/R/ti/p/@390ltgch?oat_content=qr`; // อย่าลืมเปลี่ยน YOUR_LINE_OA_ID_HERE เป็น Line OA ID ของคุณ

    const bookingSuccessModal = new bootstrap.Modal(document.getElementById('bookingSuccessModal'));
    bookingSuccessModal.show();
}

function printBookingSlip() {
    const slipElement = document.querySelector('#bookingSlipContent .slip-container'); // เลือก .slip-container เพื่อการ capture ที่แม่นยำขึ้น

    if (slipElement && typeof html2canvas === 'function') {
        html2canvas(slipElement, {
            useCORS: true, // ในกรณีที่มีรูปภาพจากภายนอก (แม้ว่าในสลิปปัจจุบันจะไม่มี)
            scale: 2 // เพิ่ม scale เพื่อให้ภาพคมชัดขึ้น (ปรับค่าได้ตามต้องการ)
        }).then(canvas => {
            const imageData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imageData;
            link.download = 'booking_slip.png'; // ชื่อไฟล์ที่จะดาวน์โหลด
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error('Error generating image with html2canvas:', error);
            alert('เกิดข้อผิดพลาดในการสร้างรูปภาพสลิป');
        });
    } else {
        alert('ไม่สามารถสร้างรูปภาพสลิปได้ กรุณาตรวจสอบว่า html2canvas โหลดเรียบร้อยแล้ว');
    }
}

// ฟังก์ชันนี้จะถูกใช้เมื่อผู้ใช้ต้องการย้อนกลับไปหน้าแรกเท่านั้น
function goToPreviousPage() {
    window.location.href = 'index.html';
}

window.onload = initCheckoutMap;
