export const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return response;
            }

            // Nếu status là 503 (Service Unavailable) hoặc 504 (Gateway Timeout), thử lại
            if (response.status === 503 || response.status === 504) {
                retries++;
                // Tăng thời gian chờ giữa các lần thử
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                continue;
            }

            return response;
        } catch (error) {
            retries++;

            if (retries >= maxRetries) {
                throw error;
            }
        }
    }
}
// Chờ trước khi thử lại