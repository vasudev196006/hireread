/**
 * CAREERCOPE AI - Geographic Demand World Map (Leaflet.js + OpenStreetMap)
 */

let mapInstance = null;
let markersGroup = null;

// Geographic coordinate reference for cities & countries
const GEO_COORDINATES = {
  // Countries
  "in": [20.5937, 78.9629, "India"],
  "india": [20.5937, 78.9629, "India"],
  "us": [37.0902, -95.7129, "United States"],
  "united states": [37.0902, -95.7129, "United States"],
  "gb": [55.3781, -3.4360, "United Kingdom"],
  "united kingdom": [55.3781, -3.4360, "United Kingdom"],
  "ca": [56.1304, -106.3468, "Canada"],
  "canada": [56.1304, -106.3468, "Canada"],
  "au": [-25.2744, 133.7751, "Australia"],
  "australia": [-25.2744, 133.7751, "Australia"],
  "de": [51.1657, 10.4515, "Germany"],
  "germany": [51.1657, 10.4515, "Germany"],
  "global": [25.0, 10.0, "Global Remote"],

  // Cities
  "bengaluru": [12.9716, 77.5946, "Bengaluru, India"],
  "bangalore": [12.9716, 77.5946, "Bengaluru, India"],
  "mumbai": [19.0760, 72.8777, "Mumbai, India"],
  "delhi": [28.7041, 77.1025, "Delhi, India"],
  "new delhi": [28.6139, 77.2090, "New Delhi, India"],
  "hyderabad": [17.3850, 78.4867, "Hyderabad, India"],
  "pune": [18.5204, 73.8567, "Pune, India"],
  "chennai": [13.0827, 80.2707, "Chennai, India"],
  "gurgaon": [28.4595, 77.0266, "Gurgaon, India"],
  "gurugram": [28.4595, 77.0266, "Gurugram, India"],
  "noida": [28.5355, 77.3910, "Noida, India"],
  "kolkata": [22.5726, 88.3639, "Kolkata, India"],

  "san francisco": [37.7749, -122.4194, "San Francisco, USA"],
  "new york": [40.7128, -74.0060, "New York, USA"],
  "seattle": [47.6062, -122.3321, "Seattle, USA"],
  "austin": [30.2672, -97.7431, "Austin, USA"],
  "chicago": [41.8781, -87.6298, "Chicago, USA"],
  "boston": [42.3601, -71.0589, "Boston, USA"],
  "los angeles": [34.0522, -118.2437, "Los Angeles, USA"],
  
  "london": [51.5074, -0.1278, "London, UK"],
  "manchester": [53.4808, -2.2426, "Manchester, UK"],
  "edinburgh": [55.9533, -3.1883, "Edinburgh, UK"],

  "berlin": [52.5200, 13.4050, "Berlin, Germany"],
  "munich": [48.1351, 11.5820, "Munich, Germany"],
  "frankfurt": [50.1109, 8.6821, "Frankfurt, Germany"],

  "toronto": [43.6532, -79.3832, "Toronto, Canada"],
  "vancouver": [49.2827, -123.1207, "Vancouver, Canada"],
  "sydney": [-33.8688, 151.2093, "Sydney, Australia"],
  "melbourne": [-37.8136, 144.9631, "Melbourne, Australia"]
};

const MapManager = {
  initMap() {
    if (mapInstance) return;

    const mapContainer = document.getElementById("careerMap");
    if (!mapContainer) return;

    // Default center
    mapInstance = L.map("careerMap", {
      center: [20.5937, 78.9629],
      zoom: 3,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: true
    });

    // Dark styled OpenStreetMap CartoDB Tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(mapInstance);

    markersGroup = L.featureGroup().addTo(mapInstance);
  },

  /**
   * Render job demand geographically
   */
  renderLocations(citiesMap, countryCode, totalJobs, jobsList) {
    this.initMap();
    if (!mapInstance || !markersGroup) return;

    // Clear previous markers
    markersGroup.clearLayers();

    const locationEntries = Object.entries(citiesMap || {});
    const bounds = [];

    // Helper to find skills in a location
    const getSkillsForLoc = (locName) => {
      const locLower = locName.toLowerCase();
      const relevant = (jobsList || []).filter(j => (j.location || "").toLowerCase().includes(locLower));
      const sMap = {};
      relevant.forEach(j => (j.skills || []).forEach(s => sMap[s] = (sMap[s] || 0) + 1));
      return Object.entries(sMap).sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    };

    locationEntries.forEach(([locStr, count]) => {
      const locClean = locStr.toLowerCase().trim();
      let coords = null;
      let displayName = locStr;

      // Match city
      for (const [key, val] of Object.entries(GEO_COORDINATES)) {
        if (locClean.includes(key)) {
          coords = [val[0], val[1]];
          displayName = val[2];
          break;
        }
      }

      // Fallback to selected country centroid if unmapped city
      if (!coords && GEO_COORDINATES[countryCode.toLowerCase()]) {
        coords = [
          GEO_COORDINATES[countryCode.toLowerCase()][0] + (Math.random() - 0.5) * 4,
          GEO_COORDINATES[countryCode.toLowerCase()][1] + (Math.random() - 0.5) * 4
        ];
        displayName = `${locStr} (${countryCode.toUpperCase()})`;
      }

      if (coords) {
        bounds.push(coords);
        const pct = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : 0;
        const topSkills = getSkillsForLoc(locStr);

        // Size radius by relative weight
        const radius = Math.max(10, Math.min(32, 10 + (count / Math.max(1, totalJobs)) * 40));
        const color = count > 5 ? "#6366f1" : (count > 2 ? "#06b6d4" : "#10b981");

        const circle = L.circleMarker(coords, {
          radius: radius,
          fillColor: color,
          color: "#fff",
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.65
        });

        // Popup content
        const popupHtml = `
          <div class="map-popup">
            <h5>${displayName}</h5>
            <p><strong>Jobs Analyzed:</strong> ${count} (${pct}% of total)</p>
            ${topSkills.length > 0 ? `<p><strong>Key Skills:</strong> ${topSkills.join(", ")}</p>` : ''}
            <p style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">Verified real listings from connected sources.</p>
          </div>
        `;

        circle.bindPopup(popupHtml);
        markersGroup.addLayer(circle);
      }
    });

    // If no city points matched, add country centroid marker
    if (bounds.length === 0 && GEO_COORDINATES[countryCode.toLowerCase()]) {
      const c = GEO_COORDINATES[countryCode.toLowerCase()];
      const fallbackCircle = L.circleMarker([c[0], c[1]], {
        radius: 18,
        fillColor: "#6366f1",
        color: "#fff",
        weight: 1.5,
        fillOpacity: 0.6
      }).bindPopup(`
        <div class="map-popup">
          <h5>${c[2]}</h5>
          <p><strong>Total Postings:</strong> ${totalJobs}</p>
          <p style="font-size: 0.75rem;">National-level concentration</p>
        </div>
      `);
      markersGroup.addLayer(fallbackCircle);
      bounds.push([c[0], c[1]]);
    }

    // Adjust viewport to fit active locations
    setTimeout(() => {
      mapInstance.invalidateSize();
      if (bounds.length > 0) {
        mapInstance.fitBounds(bounds, { maxZoom: 6, padding: [40, 40] });
      }
    }, 200);
  }
};
