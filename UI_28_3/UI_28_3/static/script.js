let socket = new WebSocket("ws://192.168.1.5:8000/ws");
let orderIdHistoryFromData2 = [];

// Ánh xạ taskPath[0] với vị trí card
const taskPathZeroMap = {
    "10000186": 2, // VỊ TRÍ 3
    "10000187": 3, // VỊ TRÍ 4
    "10000188": 1, // VỊ TRÍ 2
    "10000189": 0  // VỊ TRÍ 1
};

// Ánh xạ taskPath[1] với MS_x hoặc PA_x
const taskPathOneMap = {
    "10000254": "MS_1",
    "10000255": "MS_2",
    "10000290": "MS_3",
    "10001151": "MS_4",
    "10001142": "MS_5",
    "10001166": "MS_6",
    "10001171": "MS_7",
    "10000288": "MS_8",
    "10000287": "MS_9",
    "10000289": "MS_10",
    "10000257": "MS_11",
    "10000207": "MS_12",
    "10000303": "MS_13",
    "10000179": "MS_14",
    "10000251": "MS_15_1",
    "10000248": "MS_15_2",
    "10000245": "MS_15-3",
    "10000242": "MS_15_4",
    "10000238": "MS_15_5",
    "10001143": "MS_16",
    "10001144": "MS_17",
    "10001180": "PA_1",
    "10001168": "PA_2",
    "10001146": "PA_4",
    "10001147": "PA_3",
    "10001174": "PA_5"
};

socket.onopen = function() {
    console.log("Đã kết nối WebSocket");
};

socket.onmessage = function(event) {
    console.log("Dữ liệu thô nhận được:", event.data);

    try {
        let parsedData;
        if (typeof event.data === "string") {
            const rawData = JSON.parse(event.data);
            if (rawData.received_data && typeof rawData.received_data === "string") {
                parsedData = JSON.parse(rawData.received_data);
            } else {
                parsedData = rawData.received_data ? rawData.received_data : rawData;
            }
        } else {
            parsedData = event.data;
        }

        console.log("Parsed data:", parsedData);

        let taskDetail = parsedData.taskOrderDetail && parsedData.taskOrderDetail[0]
            ? parsedData.taskOrderDetail[0]
            : {};

        let taskPath = taskDetail.taskPath ? taskDetail.taskPath.split(',').map(item => item.trim()) : [];
        let firstTaskPath = taskPath[0] || ""; // taskPath[0] - xác định vị trí card
        let secondTaskPath = taskPath[1] || ""; // taskPath[1] - nội dung hiển thị
        let status = parsedData.status || taskDetail.status;
        let orderId = parsedData.orderId || parsedData.orderID;

        console.log("First taskPath (taskPath[0]):", firstTaskPath);
        console.log("Second taskPath (taskPath[1]):", secondTaskPath);
        console.log("Status:", status);
        console.log("OrderId:", orderId);

        let cards = document.querySelectorAll(".card");

        // Dạng 1: Có taskPath, xác định vị trí card và lưu orderId
        if (firstTaskPath && parsedData.modelProcessCode) {
            let cardIndex = taskPathZeroMap[firstTaskPath] !== undefined ? taskPathZeroMap[firstTaskPath] : -1;
            console.log("Card index (Dạng 1):", cardIndex);

            if (cardIndex >= 0 && cardIndex < cards.length && orderId) {
                orderIdHistoryFromData2.push({
                    orderId: orderId,
                    cardIndex: cardIndex
                });
                console.log("Dạng 1 - Added to orderId history:", orderIdHistoryFromData2);
            } else {
                console.log("Dạng 1 - Card index không hợp lệ hoặc thiếu orderId:", cardIndex);
            }
        }

        // Dạng 2: Có status hoặc secondTaskPath, cập nhật dựa trên orderId hoặc taskPath
        if (status || secondTaskPath) {
            let cardIndex = -1;
            if (firstTaskPath) {
                cardIndex = taskPathZeroMap[firstTaskPath] !== undefined ? taskPathZeroMap[firstTaskPath] : -1;
            } else if (orderId) {
                let matchingEntry = orderIdHistoryFromData2.find(entry => entry.orderId === orderId);
                cardIndex = matchingEntry ? matchingEntry.cardIndex : -1;
            }

            let displayText = secondTaskPath ? (taskPathOneMap[secondTaskPath] || secondTaskPath) : "";

            console.log("Card index (Dạng 2):", cardIndex);
            console.log("Display text (taskPath[1]):", displayText);

            if (cardIndex >= 0 && cardIndex < cards.length) {
                let card = cards[cardIndex];
                let cardDataIndex = parseInt(card.getAttribute("data-index"));
                if (cardDataIndex !== cardIndex) {
                    console.log(`Cảnh báo: cardIndex ${cardIndex} không khớp với data-index ${cardDataIndex}`);
                }

                // Cập nhật thuộc tính dựa trên status
                if (status) {
                    if (status === "5" || status === 5) {
                        card.classList.add('error');
                        card.classList.remove('post');
                        console.log(`Dạng 2 - Đã cập nhật thuộc tính card ${cardIndex} - Status: ${status} (error)`);
                    } else if (status === "6" || status === "20" || status == 6 || status == 20) {
                        card.classList.add('post');
                        card.classList.remove('error');
                        console.log(`Dạng 2 - Đã cập nhật thuộc tính card ${cardIndex} - Status: ${status} (post)`);
                    } else if (status === "21" || status == 21 || status === "3" || status === 3) {
                        let matchingEntry = orderIdHistoryFromData2.find(entry => entry.orderId === orderId);
                        if (matchingEntry && matchingEntry.cardIndex === cardIndex) {
                            card.classList.remove('post', 'error');
                            // Xóa displayText khi status = 21
                            let textElement = card.querySelector(".row3 .text_1");
                            if (textElement) {
                                textElement.innerText = "";
                                console.log(`Dạng 2 - Đã xóa displayText cho card ${cardIndex} - Status: ${status}, OrderId: ${orderId}`);
                            }
                            console.log(`Dạng 2 - Đã xóa thuộc tính post và error cho card ${cardIndex} - Status: ${status}, OrderId: ${orderId}`);
                        }
                    } else {
                        card.classList.remove('post', 'error');
                        console.log(`Dạng 2 - Status ${status} không khớp, xóa thuộc tính card ${cardIndex}`);
                    }
                } else {
                    card.classList.remove('post', 'error');
                    console.log(`Dạng 2 - Không có status, xóa thuộc tính card ${cardIndex}`);
                }

                // Cập nhật displayText vào row3 text_1 nếu có secondTaskPath
                if (displayText) {
                    let textElement = card.querySelector(".row3 .text_1");
                    if (textElement) {
                        textElement.innerText = displayText;
                        console.log(`Đã cập nhật displayText '${displayText}' vào row3 text_1 của VỊ TRÍ ${cardIndex + 1}`);
                    } else {
                        console.log(`Không tìm thấy phần tử row3 text_1 trong card VỊ TRÍ ${cardIndex + 1}`);
                    }
                }

                // Cập nhật bảng lịch sử nếu có secondTaskPath
                if (secondTaskPath) {
                    let now = new Date();
                    let timeString = now.getHours().toString().padStart(2, '0') + ":" +
                                    now.getMinutes().toString().padStart(2, '0') + ":" +
                                    now.getSeconds().toString().padStart(2, '0');

                    let table = card.querySelector(".history-table");
                    if (table) {
                        let newRow = table.insertRow(0);
                        let cell1 = newRow.insertCell(0);
                        let cell2 = newRow.insertCell(1);

                        cell1.innerText = timeString;
                        cell2.innerText = displayText;

                        while (table.rows.length > 5) {
                            table.deleteRow(-1);
                        }
                        console.log(`Dạng 2 - Đã cập nhật lịch sử card ${cardIndex} với taskPath[1]: ${displayText}`);
                    } else {
                        console.log("Dạng 2 - Không tìm thấy bảng trong card:", card);
                    }
                }
            } else {
                console.log("Dạng 2 - Card index không hợp lệ:", cardIndex);
            }
        } else {
            console.log("Dữ liệu không thuộc dạng 1 hoặc dạng 2 hợp lệ.");
        }

    } catch (e) {
        console.error("Lỗi khi parse dữ liệu:", e);
    }
};

socket.onerror = function(error) {
    console.error("Lỗi WebSocket:", error);
};

socket.onclose = function() {
    console.log("Ngắt kết nối WebSocket");
};