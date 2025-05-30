// frontend/admin_script.js
const API_BASE_URL = 'http://localhost:3000/api'; // *** สำคัญ: ต้องเปลี่ยนเป็น URL จริงของ Backend คุณเมื่อออนไลน์

let currentTruckData = []; // จะถูกโหลดจาก Backend
let currentAdditionalServicesPrices = {}; // จะถูกโหลดจาก Backend

// ฟังก์ชันสำหรับจัดรูปแบบตัวเลขให้มีเครื่องหมายคอมม่า (เผื่อใช้ในอนาคต)
function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount);
    }
    if (isNaN(amount)) {
        return 'N/A';
    }
    return amount.toLocaleString('en-US');
}

// โหลดข้อมูลการตั้งค่าจาก Backend
async function loadSettingsFromBackend() {
    try {
        // ดึงข้อมูลรถบรรทุก
        const trucksResponse = await fetch(`${API_BASE_URL}/trucks`);
        const trucksData = await trucksResponse.json();
        if (trucksResponse.ok) {
            currentTruckData = trucksData.trucks.map(truck => ({
                ...truck,
                price_ranges: JSON.parse(truck.price_ranges_json || '[]') // แปลง JSON string กลับเป็น Array
            }));
            renderTruckSettings();
        } else {
            console.error("Failed to load truck data:", trucksData.error);
            alert("ไม่สามารถโหลดข้อมูลรถบรรทุกได้จาก Server");
        }

        // ดึงข้อมูลบริการเพิ่มเติม
        const servicesResponse = await fetch(`${API_BASE_URL}/additional-services`);
        const servicesData = await servicesResponse.json();
        if (servicesResponse.ok) {
            currentAdditionalServicesPrices = servicesData.services;
            renderAdditionalServicePrices();
        } else {
            console.error("Failed to load additional services prices:", servicesData.error);
            alert("ไม่สามารถโหลดราคาบริการเพิ่มเติมได้จาก Server");
        }

    } catch (error) {
        console.error('Error loading settings from backend:', error);
        alert('ไม่สามารถเชื่อมต่อกับ Server หรือโหลดข้อมูลได้ กรุณาตรวจสอบว่า Backend Server ทำงานอยู่');
    }
}

// Render Truck Settings in Admin Panel UI
function renderTruckSettings() {
    const container = document.getElementById('truckSettingsContainer');
    container.innerHTML = ''; // Clear previous content

    currentTruckData.forEach((truck) => { // ไม่จำเป็นต้องใช้ truckIndex เพราะอ้างอิงจาก truck.id
        const div = document.createElement('div');
        div.classList.add('mb-4', 'p-3', 'border', 'rounded', 'bg-light');
        div.innerHTML = `
            <h4 class="mb-3">${truck.name} (ID: ${truck.id})</h4>
            <div class="form-group">
                <label for="truck-details-${truck.id}">รายละเอียด:</label>
                <input type="text" id="truck-details-${truck.id}" class="form-control" value="${truck.details}">
            </div>
            <div class="form-group">
                <label for="truck-image-${truck.id}">URL รูปภาพ:</label>
                <input type="text" id="truck-image-${truck.id}" class="form-control" value="${truck.image}">
                <small class="form-text text-muted">ตัวอย่าง: https://example.com/image.png</small>
            </div>
            <div class="form-group">
                <label for="truck-starting-price-${truck.id}">ราคาเริ่มต้น (บาท):</label>
                <input type="number" id="truck-starting-price-${truck.id}" class="form-control" value="${truck.starting_price}" min="0" step="100">
            </div>
            <div class="form-group">
                <label for="truck-porter-price-${truck.id}">ค่าคนยกของต่อคน (บาท):</label>
                <input type="number" id="truck-porter-price-${truck.id}" class="form-control porter-price-input" value="${truck.porter_price}" min="0" step="50">
            </div>
            <h5 class="mt-4 mb-3">เรทราคาต่อกิโลเมตร:</h5>
            <div id="price-ranges-container-${truck.id}">
                ${truck.price_ranges.map((range, rangeIndex) => `
                    <div class="form-row mb-2">
                        <div class="col">
                            <label for="truck-${truck.id}-range-max-${rangeIndex}">สูงสุด (กม.):</label>
                            <input type="number" id="truck-${truck.id}-range-max-${rangeIndex}" class="form-control" value="${range.max === Infinity ? '' : range.max}" ${range.max === Infinity ? 'placeholder="Infinity (ไม่จำกัด)"' : ''} min="0" ${range.max === Infinity ? 'disabled' : ''}>
                        </div>
                        <div class="col">
                            <label for="truck-${truck.id}-range-rate-${rangeIndex}">เรท (บาท/กม.):</label>
                            <input type="number" id="truck-${truck.id}-range-rate-${rangeIndex}" class="form-control" value="${range.rate}" min="0" step="0.01">
                        </div>
                        ${range.serviceCharge ? `
                        <div class="col">
                            <label for="truck-${truck.id}-service-charge-${rangeIndex}">ค่าบริการ:</label>
                            <input type="number" id="truck-${truck.id}-service-charge-${rangeIndex}" class="form-control" value="${range.serviceCharge}" min="0" step="100">
                        </div>` : ''}
                        ${range.additionalPerKmCharge ? `
                        <div class="col">
                            <label for="truck-${truck.id}-additional-charge-${rangeIndex}">ค่าเสริม/กม.:</label>
                            <input type="number" id="truck-${truck.id}-additional-charge-${rangeIndex}" class="form-control" value="${range.additionalPerKmCharge}" min="0" step="0.01">
                        </div>` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-success mt-3" onclick="updateTruck(${truck.id})">บันทึกการเปลี่ยนแปลง ${truck.name}</button>
        `;
        container.appendChild(div);
    });
}

// Render Additional Service Prices in Admin Panel UI
function renderAdditionalServicePrices() {
    for (const key in currentAdditionalServicesPrices) {
        if (currentAdditionalServicesPrices.hasOwnProperty(key)) {
            const inputElement = document.getElementById(`${key}_price`);
            if (inputElement) {
                inputElement.value = currentAdditionalServicesPrices[key];
            }
        }
    }
}

// Update Truck Data in Backend
async function updateTruck(truckId) {
    const truck = currentTruckData.find(t => t.id === truckId);
    if (!truck) {
        alert('ไม่พบข้อมูลรถที่จะอัปเดต');
        return;
    }

    // ดึงค่าใหม่จาก UI
    truck.details = document.getElementById(`truck-details-${truckId}`).value;
    truck.image = document.getElementById(`truck-image-${truckId}`).value;
    truck.starting_price = parseFloat(document.getElementById(`truck-starting-price-${truckId}`).value);
    truck.porter_price = parseFloat(document.getElementById(`truck-porter-price-${truckId}`).value);

    // Update price ranges (ดึงค่าจาก UI)
    truck.price_ranges.forEach((range, rangeIndex) => {
        const rateInput = document.getElementById(`truck-${truckId}-range-rate-${rangeIndex}`);
        if (rateInput) {
            range.rate = parseFloat(rateInput.value);
        }
        const serviceChargeInput = document.getElementById(`truck-${truckId}-service-charge-${rangeIndex}`);
        if (serviceChargeInput) {
            range.serviceCharge = parseFloat(serviceChargeInput.value);
        }
        const additionalChargeInput = document.getElementById(`truck-${truckId}-additional-charge-${rangeIndex}`);
        if (additionalChargeInput) {
            range.additionalPerKmCharge = parseFloat(additionalChargeInput.value);
        }
        // ไม่ต้องอัปเดต max หากเป็น Infinity หรือ disabled
        // หากต้องการให้ Admin แก้ไข max ด้วย ต้องเพิ่มฟังก์ชันการจัดการ logic
        const maxInput = document.getElementById(`truck-${truckId}-range-max-${rangeIndex}`);
        if (maxInput && range.max !== Infinity) {
             range.max = parseFloat(maxInput.value);
        }
    });

    try {
        const response = await fetch(`${API_BASE_URL}/admin/trucks/${truckId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(truck) // ส่ง Object truck ไปทั้งหมด
        });

        const data = await response.json();
        if (response.ok) {
            alert(`บันทึกข้อมูล ${truck.name} เรียบร้อยแล้ว`);
            // โหลดข้อมูลใหม่ทั้งหมดอีกครั้งเพื่อความแน่ใจว่า UI อัปเดตถูกต้อง
            loadSettingsFromBackend();
        } else {
            console.error("Failed to update truck:", data.error);
            alert(`ไม่สามารถบันทึกข้อมูล ${truck.name} ได้: ${data.message || data.error}`);
        }
    } catch (error) {
        console.error('Error updating truck:', error);
        alert('ไม่สามารถเชื่อมต่อกับ Server เพื่อบันทึกข้อมูลรถได้');
    }
}

// Save Additional Service Prices in Backend
async function saveAdditionalServicePrices() {
    const updates = {};
    for (const key in currentAdditionalServicesPrices) {
        if (currentAdditionalServicesPrices.hasOwnProperty(key)) {
            const inputElement = document.getElementById(`${key}_price`);
            if (inputElement) {
                updates[key] = parseFloat(inputElement.value);
            }
        }
    }

    try {
        for (const key in updates) {
            const response = await fetch(`${API_BASE_URL}/admin/additional-services/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ price: updates[key] })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`Failed to update ${key}:`, errorData.error);
                alert(`ไม่สามารถบันทึกราคา ${key} ได้: ${errorData.message || errorData.error}`);
                return; // หยุดถ้ามีข้อผิดพลาด
            }
        }
        alert('บันทึกราคาบริการเพิ่มเติมเรียบร้อยแล้ว');
        // โหลดข้อมูลใหม่ทั้งหมดอีกครั้งเพื่อความแน่ใจ
        loadSettingsFromBackend();
    } catch (error) {
        console.error('Error saving additional service prices:', error);
        alert('ไม่สามารถเชื่อมต่อกับ Server เพื่อบันทึกราคาบริการเพิ่มเติมได้');
    }
}

// Reset all settings to default (requires a corresponding API endpoint in Backend)
async function resetSettings() {
    if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตค่าทั้งหมด? การดำเนินการนี้จะลบข้อมูลที่กำหนดเองในฐานข้อมูลและคืนค่าเป็นค่าเริ่มต้น')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/reset-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert('รีเซ็ตข้อมูลทั้งหมดเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
                loadSettingsFromBackend(); // โหลดค่าเริ่มต้นกลับมาแสดง
            } else {
                const errorData = await response.json();
                console.error("Failed to reset data:", errorData.error);
                alert(`ไม่สามารถรีเซ็ตข้อมูลได้: ${errorData.message || errorData.error}`);
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            alert('ไม่สามารถเชื่อมต่อกับ Server เพื่อรีเซ็ตข้อมูลได้');
        }
    }
}

// โหลดการตั้งค่าเมื่อหน้าเว็บโหลดเสร็จ
window.onload = loadSettingsFromBackend;