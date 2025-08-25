export const defaultServers = [
    { serverIP: '127.0.0.1:7000', endpoint: '/submit-data' },
    { serverIP: '127.0.0.1:7000', endpoint: '/ics/taskOrder/addTask' },
    { serverIP: '127.0.0.1:7000', endpoint: '/ics/out/endTask ' }
];

export const sendData = async (customData = null, cell = null, khu = null, additionalData = null, servers = null, serverIPs = null) => {
    try {
        console.log('📋 Dữ liệu gửi đi:', customData);
        
        const effectiveServers = servers || (serverIPs
            ? serverIPs.map(ip => ({
                  serverIP: ip,
                  endpoint: defaultServers[0].endpoint // Sử dụng endpoint mặc định
              }))
            : defaultServers); // Nếu không có serverIPs, dùng defaultServers

        if (!customData) {
            throw new Error("Vui lòng truyền customData! Dữ liệu phải được build ở task.js");
        }
        const data = customData;

        console.log("🚀 Dữ liệu gửi đi:", data);
        effectiveServers.forEach((server, index) => {
            console.log(`   ${index + 1}. Server: ${server.serverIP}, Endpoint: ${server.endpoint}`);
        });

        const promises = effectiveServers.map(async (server) => {
            const { serverIP, endpoint } = server;
            const fullUrl = `http://${serverIP}${endpoint}`;
            
            try {
                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const text = await response.text();
                    console.error(`❌ Lỗi gửi đến ${fullUrl}: HTTP ${response.status}`, text);
                    throw new Error(`HTTP ${response.status} - ${text}`);
                }

                const result = await response.json();
                console.log(`✅ Gửi thành công đến ${fullUrl}:`, result);
                return { serverIP, endpoint, success: true, result };
            } catch (error) {
                console.error(`❌ Lỗi khi gửi đến ${fullUrl}:`, error.message);
                return { serverIP, endpoint, success: false, error: error.message };
            }
        });

        const results = await Promise.all(promises);
        console.log('📊 Kết quả từ tất cả servers:', results);

        const failedRequests = results.filter(result => !result.success);
        if (failedRequests.length > 0) {
            console.error('❌ Có requests thất bại:', failedRequests);
            throw new Error(`Gửi thất bại đến server: ${failedRequests.map(r => `${r.serverIP}${r.endpoint}: ${r.error}`).join(', ')}`);
        }

        console.log('🎉 Tất cả requests đều thành công!');
        console.log('🏁 === KẾT THÚC SENDDATA ===');
        return results;
    } catch (error) {
        console.error('❌ Lỗi gửi dữ liệu:', error);
        console.log('🏁 === KẾT THÚC SENDDATA VỚI LỖI ===');
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