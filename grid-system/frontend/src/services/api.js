export const defaultServers = [
    { serverIP: '127.0.0.1:8000', endpoint: '/submit-data' },
    { serverIP: '127.0.0.1:7000', endpoint: '/ics/taskOrder/addTask' }
];

export const sendData = async (customData = null, cell = null, khu = null, additionalData = null, servers = null, serverIPs = null) => {

    try {
        // Nếu không có servers được truyền vào, sử dụng serverIPs từ tham số
        const effectiveServers = servers || (serverIPs
            ? serverIPs.map(ip => ({
                  serverIP: ip,
                  endpoint: defaultServers[0].endpoint // Sử dụng endpoint mặc định
              }))
            : defaultServers); // Nếu không có serverIPs, dùng defaultServers

        let data;

        if (customData) {
            data = customData;
        } else if (cell !== null && khu !== null) {
            data = {
                modelProcessCode: "default",
                fromSystem: `MS_${khu === 'khu4' ? 4 : 5}`,
                orderId: cell.toString(),
                taskOrderDetail: [
                    {
                        taskPath: `TASK_${cell}`,
                        shelfModel: additionalData || 'Không có dữ liệu bổ sung'
                    }
                ]
            };
        } else {
            throw new Error("Vui lòng nhập customData hoặc ít nhất là cell và khu!");
        }

        console.log("🚀 Dữ liệu gửi đi:", data, cell, khu, effectiveServers);

        const promises = effectiveServers.map(async (server) => {
            const { serverIP, endpoint } = server;
            try {
                const response = await fetch(`http://${serverIP}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const text = await response.text();
                    console.error(`❌ Lỗi gửi đến ${serverIP}${endpoint}: HTTP ${response.status}`, text);
                    throw new Error(`HTTP ${response.status} - ${text}`);
                }

                const result = await response.json();
                console.log(`✅ Gửi thành công đến ${serverIP}${endpoint}:`, result);
                return { serverIP, endpoint, success: true, result };
            } catch (error) {
                console.error(`❌ Lỗi khi gửi đến ${serverIP}${endpoint}:`, error.message);
                return { serverIP, endpoint, success: false, error: error.message };
            }
        });

        const results = await Promise.all(promises);

        const failedRequests = results.filter(result => !result.success);
        if (failedRequests.length > 0) {
            throw new Error(`Gửi thất bại đến một số server: ${failedRequests.map(r => `${r.serverIP}${r.endpoint}: ${r.error}`).join(', ')}`);
        }

        return results;
    } catch (error) {
        console.error('❌ Lỗi gửi dữ liệu:', error);
        throw error;
    }
};

export const checkServerConnection = async (serverIP, endpoint = "", isFirst = false, method = "GET") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // Timeout 3s

    try {
        if (isFirst) {
            endpoint = "/health-check";
        }

        const url = endpoint ? `http://${serverIP}${endpoint}` : `http://${serverIP}/`;
        console.log(`🔍 Kiểm tra kết nối: ${url}`);

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`❌ Lỗi kiểm tra kết nối: ${url} - HTTP ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`❌ Lỗi kết nối đến ${url}:`, error.message);
        return false;
    }
};