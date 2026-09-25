/**
 * CAREERCOPE AI - API Client
 * Communicates ONLY with our FastAPI backend.
 * Never calls external APIs directly from frontend.
 */

// Determine backend API base URL automatically
const API_BASE_URL = window.location.origin;

const CareerAPI = {
  /**
   * Fetches backend status and configured services.
   */
  async getStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career/status`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn("Backend status check error:", err);
      return null;
    }
  },

  /**
   * Submits career analysis request to backend.
   * @param {string} career 
   * @param {string} country 
   */
  async analyzeCareer(career, country = "in") {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          career: career.trim(),
          country: country.trim().toLowerCase()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || `Server returned error ${response.status}`;
        throw new Error(message);
      }

      return await response.json();
    } catch (err) {
      console.error("API error during career analysis:", err);
      throw err;
    }
  }
};
