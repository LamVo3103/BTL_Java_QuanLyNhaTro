// Khởi tạo ứng dụng
document.addEventListener("DOMContentLoaded", function () {
  // Kiểm tra và khởi tạo dữ liệu nếu chưa có
  if (!localStorage.getItem("rooms")) {
    initializeData();
  }

  // Hiển thị dashboard khi trang được tải
  showSection("dashboard");
  updateDashboardStats();
  loadActivityLog();

  // Xử lý form tạo phòng
  document
    .getElementById("create-room-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      createRoom();
    });

  // Xử lý form thuê phòng
  document
    .getElementById("rent-room-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      confirmRentRoom();
    });

  // Tải danh sách phòng ban đầu
  loadRooms();
});

// Khởi tạo dữ liệu mẫu
function initializeData() {
  const sampleRooms = [
    {
      roomId: "R1",
      roomType: "SINGLE",
      currentState: "AVAILABLE",
      pricingStrategy: "NORMAL",
      customBasePrice: -1,
    },
    {
      roomId: "R2",
      roomType: "DOUBLE",
      currentState: "AVAILABLE",
      pricingStrategy: "NORMAL",
      customBasePrice: -1,
    },
    {
      roomId: "R3",
      roomType: "VIP",
      currentState: "AVAILABLE",
      pricingStrategy: "NORMAL",
      customBasePrice: -1,
    },
  ];

  localStorage.setItem("rooms", JSON.stringify(sampleRooms));
  localStorage.setItem("nextRoomId", "4");
  localStorage.setItem("notifications", JSON.stringify([]));
  localStorage.setItem("activityLog", JSON.stringify([]));
}

// Hiển thị section được chọn
function showSection(sectionId) {
  // Ẩn tất cả các section
  document.querySelectorAll(".section").forEach((section) => {
    section.style.display = "none";
  });

  // Hiển thị section được chọn
  document.getElementById(sectionId).style.display = "block";

  // Cập nhật menu active
  document.querySelectorAll(".sidebar nav ul li a").forEach((link) => {
    link.classList.remove("active");
  });

  // Thêm class active cho menu tương ứng
  const activeLink = document.querySelector(
    `.sidebar nav ul li a[onclick="showSection('${sectionId}')"]`
  );
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // Tải lại dữ liệu nếu cần
  switch (sectionId) {
    case "dashboard":
      updateDashboardStats();
      break;
    case "room-management":
      loadRooms();
      break;
    case "room-status":
      loadRoomsForStatus();
      break;
    case "tenant-management":
      loadTenants();
      break;
    case "pricing":
      loadRoomsForPricing();
      break;
    case "payment":
      loadRentedRoomsForPayment();
      break;
    case "notifications":
      loadNotifications();
      break;
  }
}

// Cập nhật thống kê dashboard
function updateDashboardStats() {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];

  document.getElementById("total-rooms").textContent = rooms.length;
  document.getElementById("available-rooms").textContent = rooms.filter(
    (room) => room.currentState === "AVAILABLE"
  ).length;
  document.getElementById("rented-rooms").textContent = rooms.filter(
    (room) => room.currentState === "RENTED"
  ).length;
  document.getElementById("maintenance-rooms").textContent = rooms.filter(
    (room) => room.currentState === "MAINTENANCE"
  ).length;
}

// Hiển thị form tạo phòng
function showRoomForm() {
  document.getElementById("room-form").style.display = "block";
}

// Ẩn form tạo phòng
function hideRoomForm() {
  document.getElementById("room-form").style.display = "none";
  document.getElementById("create-room-form").reset();
}

// Tạo phòng mới
function createRoom() {
  const roomType = document.getElementById("room-type").value;
  const customPrice = document.getElementById("custom-price").value;

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const nextRoomId = localStorage.getItem("nextRoomId") || "1";

  const newRoom = {
    roomId: `R${nextRoomId}`,
    roomType: roomType,
    currentState: "AVAILABLE",
    pricingStrategy: "NORMAL",
    customBasePrice: customPrice ? parseFloat(customPrice) : -1,
    currentTenant: null,
    dueDate: null,
  };

  rooms.push(newRoom);
  localStorage.setItem("rooms", JSON.stringify(rooms));
  localStorage.setItem("nextRoomId", (parseInt(nextRoomId) + 1).toString());

  // Thêm vào log hoạt động
  addActivityLog(`Đã tạo phòng ${newRoom.roomId} (${roomType})`);

  // Cập nhật UI
  hideRoomForm();
  loadRooms();
  updateDashboardStats();

  alert(`Đã tạo phòng ${newRoom.roomId} thành công!`);
}

// Tải danh sách phòng
function loadRooms() {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomsList = document.getElementById("rooms-list");

  roomsList.innerHTML = "";

  if (rooms.length === 0) {
    roomsList.innerHTML =
      '<tr><td colspan="6">Không có phòng nào trong hệ thống</td></tr>';
    return;
  }

  rooms.forEach((room) => {
    const row = document.createElement("tr");

    // Hiển thị thông tin cơ bản
    row.innerHTML = `
            <td>${room.roomId}</td>
            <td>${getRoomTypeName(room.roomType)}</td>
            <td>${formatCurrency(getBasePrice(room))} VND</td>
            <td>${getStateName(room.currentState)}</td>
            <td>${
              room.currentTenant
                ? `<a href="#" onclick="showTenantDetails('${room.currentTenant.id}')">${room.currentTenant.name}</a>`
                : "Không có"
            }</td>
            <td>
                <button onclick="editRoom('${
                  room.roomId
                }')"><i class="fas fa-edit"></i></button>
                <button onclick="deleteRoom('${
                  room.roomId
                }')"><i class="fas fa-trash"></i></button>
            </td>
        `;

    roomsList.appendChild(row);
  });
}

// Tải danh sách người thuê
function loadTenants() {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const tenantsList = document.getElementById("tenants-list");

  tenantsList.innerHTML = "";

  // Lấy tất cả người thuê từ các phòng
  const tenants = [];
  rooms.forEach((room) => {
    if (room.currentTenant) {
      tenants.push({
        ...room.currentTenant,
        roomId: room.roomId,
        dueDate: room.dueDate,
        currentRent: calculateRent(room), // Thêm giá thuê hiện tại
      });
    }
  });

  if (tenants.length === 0) {
    tenantsList.innerHTML =
      '<tr><td colspan="8">Không có người thuê nào</td></tr>';
    return;
  }

  tenants.forEach((tenant) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${tenant.name}</td>
            <td>${tenant.phone}</td>
            <td>${tenant.id}</td>
            <td>${tenant.address}</td>
            <td><a href="#" onclick="showRoomDetails('${tenant.roomId}')">${
      tenant.roomId
    }</a></td>
            <td>${formatDate(tenant.dueDate)}</td>
            <td>${formatCurrency(tenant.currentRent)} VND</td>
            <td>
                <button onclick="showTenantDetails('${
                  tenant.id
                }')"><i class="fas fa-info-circle"></i></button>
            </td>
        `;
    tenantsList.appendChild(row);
  });
}

// Hiển thị chi tiết người thuê
function showTenantDetails(tenantId) {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const room = rooms.find(
    (r) => r.currentTenant && r.currentTenant.id === tenantId
  );

  if (!room || !room.currentTenant) return;

  // Hiển thị modal hoặc alert với thông tin chi tiết
  const tenant = room.currentTenant;
  const tenantDetails = `
        <h3>Thông tin chi tiết người thuê</h3>
        <p><strong>Tên:</strong> ${tenant.name}</p>
        <p><strong>SĐT:</strong> ${tenant.phone}</p>
        <p><strong>CMND/CCCD:</strong> ${tenant.id}</p>
        <p><strong>Địa chỉ thường trú:</strong> ${tenant.address}</p>
        <p><strong>Phòng đang thuê:</strong> ${room.roomId}</p>
        <p><strong>Ngày đến hạn:</strong> ${formatDate(room.dueDate)}</p>
        <p><strong>Giá thuê hiện tại:</strong> ${formatCurrency(
          calculateRent(room)
        )} VND</p>
    `;

  alert(tenantDetails); // Có thể thay bằng modal đẹp hơn
}

// Tải phòng cho quản lý trạng thái
function loadRoomsForStatus() {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomSelect = document.getElementById("room-select");

  roomSelect.innerHTML = '<option value="">-- Chọn phòng --</option>';

  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.roomId;
    option.textContent = `${room.roomId} - ${getRoomTypeName(
      room.roomType
    )} (${getStateName(room.currentState)})`;
    roomSelect.appendChild(option);
  });

  // Hiển thị chi tiết phòng khi chọn
  roomSelect.addEventListener("change", function () {
    const roomId = this.value;
    if (roomId) {
      showRoomDetails(roomId);
    } else {
      document.getElementById("room-details-content").innerHTML =
        "<p>Vui lòng chọn một phòng để xem chi tiết</p>";
    }
  });
}

// Hiển thị chi tiết phòng
function showRoomDetails(roomId) {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const room = rooms.find((r) => r.roomId === roomId);

  if (!room) return;

  const detailsContent = document.getElementById("room-details-content");

  let detailsHTML = `
        <h4>Thông tin phòng ${room.roomId}</h4>
        <p><strong>Loại phòng:</strong> ${getRoomTypeName(room.roomType)}</p>
        <p><strong>Trạng thái:</strong> ${getStateName(room.currentState)}</p>
        <p><strong>Giá cơ bản:</strong> ${formatCurrency(
          getBasePrice(room)
        )} VND</p>
        <p><strong>Chiến lược giá:</strong> ${getPricingStrategyName(
          room.pricingStrategy
        )}</p>
        <p><strong>Giá thuê hiện tại:</strong> ${formatCurrency(
          calculateRent(room)
        )} VND</p>
    `;

  if (room.currentState === "RENTED" && room.currentTenant) {
    detailsHTML += `
            <h4>Thông tin người thuê</h4>
            <p><strong>Tên:</strong> ${room.currentTenant.name}</p>
            <p><strong>SĐT:</strong> ${room.currentTenant.phone}</p>
            <p><strong>CMND/CCCD:</strong> ${room.currentTenant.id}</p>
            <p><strong>Địa chỉ:</strong> ${room.currentTenant.address}</p>
            <p><strong>Ngày đến hạn:</strong> ${formatDate(room.dueDate)}</p>
        `;
  }

  detailsContent.innerHTML = detailsHTML;
}

// Thuê phòng
function rentRoom() {
  const roomId = document.getElementById("room-select").value;
  if (!roomId) {
    alert("Vui lòng chọn phòng");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const room = rooms.find((r) => r.roomId === roomId);

  if (!room) return;

  if (room.currentState !== "AVAILABLE") {
    alert("Phòng này không thể cho thuê vì không ở trạng thái trống");
    return;
  }

  // Hiển thị form nhập thông tin người thuê
  document.getElementById("tenant-form").style.display = "block";

  // Đặt ngày mặc định là 30 ngày sau
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 30);
  document.getElementById("due-date").valueAsDate = dueDate;
}

// Ẩn form thuê phòng
function hideTenantForm() {
  document.getElementById("tenant-form").style.display = "none";
  document.getElementById("rent-room-form").reset();
}

// Xác nhận thuê phòng
function confirmRentRoom() {
  const roomId = document.getElementById("room-select").value;
  const tenantName = document.getElementById("tenant-name").value;
  const tenantPhone = document.getElementById("tenant-phone").value;
  const tenantId = document.getElementById("tenant-id").value;
  const tenantAddress = document.getElementById("tenant-address").value;
  const dueDate = document.getElementById("due-date").value;

  if (
    !roomId ||
    !tenantName ||
    !tenantPhone ||
    !tenantId ||
    !tenantAddress ||
    !dueDate
  ) {
    alert("Vui lòng điền đầy đủ thông tin");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);

  if (roomIndex === -1) return;

  // Cập nhật thông tin phòng
  rooms[roomIndex].currentState = "RENTED";
  rooms[roomIndex].currentTenant = {
    id: tenantId,
    name: tenantName,
    phone: tenantPhone,
    address: tenantAddress,
  };
  rooms[roomIndex].dueDate = dueDate;

  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm thông báo
  addNotification(`Phòng ${roomId} đã được thuê bởi ${tenantName}`);
  addActivityLog(`Đã cho thuê phòng ${roomId} cho ${tenantName}`);

  // Cập nhật UI
  hideTenantForm();
  loadRoomsForStatus();
  showRoomDetails(roomId);
  updateDashboardStats();
  if (document.getElementById("tenant-management").style.display === "block") {
    loadTenants();
  }

  alert(`Đã cho thuê phòng ${roomId} thành công!`);
}

// Trả phòng
function vacateRoom() {
  const roomId = document.getElementById("room-select").value;
  if (!roomId) {
    alert("Vui lòng chọn phòng");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);

  if (roomIndex === -1) return;

  if (rooms[roomIndex].currentState !== "RENTED") {
    alert("Chỉ có thể trả phòng đang được thuê");
    return;
  }

  const tenantName = rooms[roomIndex].currentTenant.name;

  // Cập nhật thông tin phòng
  rooms[roomIndex].currentState = "AVAILABLE";
  rooms[roomIndex].currentTenant = null;
  rooms[roomIndex].dueDate = null;

  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm thông báo
  addNotification(`Phòng ${roomId} đã được trả bởi ${tenantName}`);
  addActivityLog(`Đã nhận trả phòng ${roomId} từ ${tenantName}`);

  // Cập nhật UI
  loadRoomsForStatus();
  showRoomDetails(roomId);
  updateDashboardStats();
  if (document.getElementById("tenant-management").style.display === "block") {
    loadTenants();
  }

  alert(`Đã nhận trả phòng ${roomId} thành công!`);
}

// Đưa phòng vào bảo trì
function maintainRoom() {
  const roomId = document.getElementById("room-select").value;
  if (!roomId) {
    alert("Vui lòng chọn phòng");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);

  if (roomIndex === -1) return;

  // Chỉ cho phép bảo trì từ trạng thái trống
  if (rooms[roomIndex].currentState !== "AVAILABLE") {
    alert("Chỉ có thể đưa phòng trống vào bảo trì");
    return;
  }

  // Cập nhật thông tin phòng
  rooms[roomIndex].currentState = "MAINTENANCE";

  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm thông báo
  addNotification(`Phòng ${roomId} đã được đưa vào bảo trì`);
  addActivityLog(`Đã đưa phòng ${roomId} vào trạng thái bảo trì`);

  // Cập nhật UI
  loadRoomsForStatus();
  showRoomDetails(roomId);
  updateDashboardStats();

  alert(`Đã đưa phòng ${roomId} vào bảo trì thành công!`);
}

// Đưa phòng trở lại trạng thái trống
function makeAvailable() {
  const roomId = document.getElementById("room-select").value;
  if (!roomId) {
    alert("Vui lòng chọn phòng");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);

  if (roomIndex === -1) return;

  // Chỉ cho phép từ bảo trì về trống
  if (rooms[roomIndex].currentState !== "MAINTENANCE") {
    alert("Chỉ có thể đưa phòng bảo trì trở lại trạng thái trống");
    return;
  }

  // Cập nhật thông tin phòng
  rooms[roomIndex].currentState = "AVAILABLE";

  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm thông báo
  addNotification(`Phòng ${roomId} đã sẵn sàng cho thuê`);
  addActivityLog(`Đã đưa phòng ${roomId} từ bảo trì về trạng thái trống`);

  // Cập nhật UI
  loadRoomsForStatus();
  showRoomDetails(roomId);
  updateDashboardStats();

  alert(`Đã đưa phòng ${roomId} về trạng thái trống thành công!`);
}

// Tải phòng cho quản lý giá
function loadRoomsForPricing() {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomSelect = document.getElementById("pricing-room-select");

  roomSelect.innerHTML = '<option value="">-- Chọn phòng --</option>';

  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.roomId;
    option.textContent = `${room.roomId} - ${getRoomTypeName(
      room.roomType
    )} (${getPricingStrategyName(room.pricingStrategy)})`;
    roomSelect.appendChild(option);
  });

  // Hiển thị chi tiết giá khi chọn
  roomSelect.addEventListener("change", function () {
    const roomId = this.value;
    if (roomId) {
      showPricingDetails(roomId);
    } else {
      document.getElementById("pricing-details-content").innerHTML =
        "<p>Vui lòng chọn một phòng để xem chi tiết giá</p>";
    }
  });
}

// Hiển thị chi tiết giá
function showPricingDetails(roomId) {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const room = rooms.find((r) => r.roomId === roomId);

  if (!room) return;

  const detailsContent = document.getElementById("pricing-details-content");

  detailsContent.innerHTML = `
        <h4>Thông tin giá phòng ${room.roomId}</h4>
        <p><strong>Loại phòng:</strong> ${getRoomTypeName(room.roomType)}</p>
        <p><strong>Giá cơ bản:</strong> ${formatCurrency(
          getBasePrice(room)
        )} VND</p>
        <p><strong>Chiến lược giá hiện tại:</strong> ${getPricingStrategyName(
          room.pricingStrategy
        )}</p>
        <p><strong>Giá thuê hiện tại:</strong> ${formatCurrency(
          calculateRent(room)
        )} VND</p>
    `;
}

// Cập nhật chiến lược giá
function updatePricingStrategy() {
  const roomId = document.getElementById("pricing-room-select").value;
  const strategy = document.getElementById("pricing-strategy").value;

  if (!roomId) {
    alert("Vui lòng chọn phòng");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);

  if (roomIndex === -1) return;

  // Cập nhật chiến lược giá
  rooms[roomIndex].pricingStrategy = strategy;
  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm vào log hoạt động
  addActivityLog(
    `Đã cập nhật chiến lược giá cho phòng ${roomId} thành ${getPricingStrategyName(
      strategy
    )}`
  );

  // Cập nhật UI
  showPricingDetails(roomId);

  alert(`Đã cập nhật chiến lược giá cho phòng ${roomId} thành công!`);
}

// Tải phòng đang thuê cho thanh toán
function loadRentedRoomsForPayment() {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const rentedRooms = rooms.filter((room) => room.currentState === "RENTED");
  const roomSelect = document.getElementById("payment-room-select");

  roomSelect.innerHTML = '<option value="">-- Chọn phòng --</option>';

  rentedRooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.roomId;
    option.textContent = `${room.roomId} - ${
      room.currentTenant.name
    } (Đến hạn: ${formatDate(room.dueDate)})`;
    roomSelect.appendChild(option);
  });

  // Hiển thị chi tiết thanh toán khi chọn
  roomSelect.addEventListener("change", function () {
    const roomId = this.value;
    if (roomId) {
      showPaymentDetails(roomId);
    } else {
      document.getElementById("payment-details-content").innerHTML =
        "<p>Vui lòng chọn một phòng đang được thuê để xem chi tiết thanh toán</p>";
    }
  });
}

// Hiển thị chi tiết thanh toán
function showPaymentDetails(roomId) {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const room = rooms.find((r) => r.roomId === roomId);

  if (!room || !room.currentTenant) return;

  const detailsContent = document.getElementById("payment-details-content");

  // Tính số ngày còn lại đến hạn
  const today = new Date();
  const dueDate = new Date(room.dueDate);
  const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  detailsContent.innerHTML = `
        <h4>Thông tin thanh toán phòng ${room.roomId}</h4>
        <p><strong>Người thuê:</strong> ${room.currentTenant.name}</p>
        <p><strong>SĐT:</strong> ${room.currentTenant.phone}</p>
        <p><strong>CMND/CCCD:</strong> ${room.currentTenant.id}</p>
        <p><strong>Ngày đến hạn:</strong> ${formatDate(room.dueDate)}</p>
        <p><strong>Số ngày còn lại:</strong> ${daysRemaining} ngày</p>
        <p><strong>Giá thuê hiện tại:</strong> ${formatCurrency(
          calculateRent(room)
        )} VND</p>
    `;
}

// Giả lập thanh toán
function simulatePayment() {
  const roomId = document.getElementById("payment-room-select").value;
  if (!roomId) {
    alert("Vui lòng chọn phòng");
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);

  if (roomIndex === -1) return;

  if (rooms[roomIndex].currentState !== "RENTED") {
    alert("Chỉ có thể thanh toán cho phòng đang được thuê");
    return;
  }

  // Cập nhật ngày đến hạn mới (thêm 1 tháng)
  const currentDueDate = new Date(rooms[roomIndex].dueDate);
  const newDueDate = new Date(currentDueDate);
  newDueDate.setMonth(newDueDate.getMonth() + 1);

  rooms[roomIndex].dueDate = newDueDate.toISOString().split("T")[0];
  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm thông báo
  addNotification(
    `Đã ghi nhận thanh toán cho phòng ${roomId}. Ngày đến hạn mới: ${formatDate(
      newDueDate
    )}`
  );
  addActivityLog(`Đã ghi nhận thanh toán cho phòng ${roomId}`);

  // Cập nhật UI
  loadRentedRoomsForPayment();
  showPaymentDetails(roomId);
  if (document.getElementById("tenant-management").style.display === "block") {
    loadTenants();
  }

  alert(
    `Đã ghi nhận thanh toán cho phòng ${roomId} thành công! Ngày đến hạn mới: ${formatDate(
      newDueDate
    )}`
  );
}

// Tải thông báo
function loadNotifications() {
  const notifications = JSON.parse(localStorage.getItem("notifications")) || [];
  const notificationsList = document.getElementById("notifications-list");

  notificationsList.innerHTML = "";

  if (notifications.length === 0) {
    notificationsList.innerHTML = "<li>Không có thông báo nào</li>";
    return;
  }

  // Hiển thị thông báo mới nhất đầu tiên
  notifications.reverse().forEach((notification) => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fas fa-bell"></i> ${
      notification.message
    } <small>${formatDateTime(notification.timestamp)}</small>`;
    notificationsList.appendChild(li);
  });
}

// Xóa tất cả thông báo
function clearNotifications() {
  localStorage.setItem("notifications", JSON.stringify([]));
  loadNotifications();
}

// Tải log hoạt động
function loadActivityLog() {
  const activityLog = JSON.parse(localStorage.getItem("activityLog")) || [];
  const activityList = document.getElementById("activity-log");

  activityList.innerHTML = "";

  if (activityLog.length === 0) {
    activityList.innerHTML = "<li>Không có hoạt động nào gần đây</li>";
    return;
  }

  // Hiển thị hoạt động mới nhất đầu tiên
  activityLog.reverse().forEach((activity) => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fas fa-history"></i> ${
      activity.message
    } <small>${formatDateTime(activity.timestamp)}</small>`;
    activityList.appendChild(li);
  });
}

// Thêm thông báo mới
function addNotification(message) {
  const notifications = JSON.parse(localStorage.getItem("notifications")) || [];

  notifications.push({
    message: message,
    timestamp: new Date().toISOString(),
  });

  localStorage.setItem("notifications", JSON.stringify(notifications));

  // Nếu đang ở trang thông báo thì cập nhật UI
  if (document.getElementById("notifications").style.display === "block") {
    loadNotifications();
  }
}

// Thêm vào log hoạt động
function addActivityLog(message) {
  const activityLog = JSON.parse(localStorage.getItem("activityLog")) || [];

  activityLog.push({
    message: message,
    timestamp: new Date().toISOString(),
  });

  localStorage.setItem("activityLog", JSON.stringify(activityLog));

  // Nếu đang ở dashboard thì cập nhật UI
  if (document.getElementById("dashboard").style.display === "block") {
    loadActivityLog();
  }
}

// Chỉnh sửa thông tin phòng
function editRoom(roomId) {
  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const room = rooms.find((r) => r.roomId === roomId);

  if (!room) return;

  const newPrice = prompt(
    `Nhập giá mới cho phòng ${roomId} (để trống hoặc 0 để dùng giá mặc định):`,
    room.customBasePrice > 0 ? room.customBasePrice : ""
  );

  if (newPrice === null) return; // Người dùng bấm cancel

  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);
  if (roomIndex === -1) return;

  // Cập nhật giá
  rooms[roomIndex].customBasePrice =
    newPrice && parseFloat(newPrice) > 0 ? parseFloat(newPrice) : -1;
  localStorage.setItem("rooms", JSON.stringify(rooms));

  // Thêm vào log hoạt động
  addActivityLog(`Đã cập nhật giá phòng ${roomId}`);

  // Cập nhật UI
  loadRooms();

  alert(`Đã cập nhật giá phòng ${roomId} thành công!`);
}

// Xóa phòng
function deleteRoom(roomId) {
  if (!confirm(`Bạn có chắc chắn muốn xóa phòng ${roomId}?`)) {
    return;
  }

  const rooms = JSON.parse(localStorage.getItem("rooms")) || [];
  const updatedRooms = rooms.filter((r) => r.roomId !== roomId);

  // Nếu không còn phòng nào, reset nextRoomId về 1
  if (updatedRooms.length === 0) {
    localStorage.setItem("nextRoomId", "1");
  } else {
    // Nếu vẫn còn phòng, tìm số lớn nhất và set nextRoomId
    const maxId = Math.max(
      ...updatedRooms.map((r) => parseInt(r.roomId.substring(1)))
    );
    localStorage.setItem("nextRoomId", (maxId + 1).toString());
  }

  localStorage.setItem("rooms", JSON.stringify(updatedRooms));

  // Thêm vào log hoạt động
  addActivityLog(`Đã xóa phòng ${roomId}`);

  // Cập nhật UI
  loadRooms();
  updateDashboardStats();
  if (document.getElementById("tenant-management").style.display === "block") {
    loadTenants();
  }

  alert(`Đã xóa phòng ${roomId} thành công!`);
}
// Các hàm helper
function getRoomTypeName(roomType) {
  switch (roomType) {
    case "SINGLE":
      return "Phòng đơn";
    case "DOUBLE":
      return "Phòng đôi";
    case "VIP":
      return "Phòng VIP";
    default:
      return roomType;
  }
}

function getStateName(state) {
  switch (state) {
    case "AVAILABLE":
      return "Trống";
    case "RENTED":
      return "Đang thuê";
    case "MAINTENANCE":
      return "Bảo trì";
    default:
      return state;
  }
}

function getPricingStrategyName(strategy) {
  switch (strategy) {
    case "NORMAL":
      return "Giá thường";
    case "PROMOTION":
      return "Giá khuyến mãi (-10%)";
    case "VIP":
      return "Giá VIP (+15%)";
    default:
      return strategy;
  }
}

function getBasePrice(room) {
  return room.customBasePrice > 0
    ? room.customBasePrice
    : room.roomType === "SINGLE"
    ? 2000000
    : room.roomType === "DOUBLE"
    ? 3500000
    : 6000000;
}

function calculateRent(room) {
  const basePrice = getBasePrice(room);

  switch (room.pricingStrategy) {
    case "PROMOTION":
      return basePrice * 0.9; // Giảm 10%
    case "VIP":
      return basePrice * 1.15; // Tăng 15%
    default:
      return basePrice; // Giá thường
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("vi-VN");
}
