import { config } from '../config';

export const extractDataFromContent = async (
  content: string | { mimeType: string; data: string },
  fileName?: string
): Promise<any> => {
  try {
    console.log(`[extractDataFromContent] 连接 ${config.apiBaseUrl} 处理`);
    const response = await fetch(`${config.apiBaseUrl}/api/analyze-inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content, fileName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Backend API Error:", error);
    throw error;
  }
};
