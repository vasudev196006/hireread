/**
 * CAREERCOPE AI - Charts Module (Chart.js)
 * Visualizes real data returned from backend.
 */

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

const ChartManager = {
  /**
   * Render Top Skills Horizontal Bar Chart
   */
  renderSkillsChart(skillsList) {
    const canvas = document.getElementById("skillsChart");
    if (!canvas) return;
    destroyChart("skillsChart");

    if (!skillsList || skillsList.length === 0) {
      this.renderEmptyPlaceholder(canvas, "No verified skill mentions found.");
      return;
    }

    const topItems = skillsList.slice(0, 10);
    const labels = topItems.map(s => s.skill);
    const data = topItems.map(s => s.percentage);
    const counts = topItems.map(s => s.mentions);

    const ctx = canvas.getContext("2d");
    chartInstances["skillsChart"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "% of Jobs",
          data: data,
          backgroundColor: "rgba(99, 102, 241, 0.75)",
          borderColor: "#818cf8",
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.7
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                return ` ${context.parsed.x}% (${counts[idx]} mentions)`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: { color: "#94a3b8", callback: (val) => `${val}%` },
            max: 100,
            beginAtZero: true
          },
          y: {
            grid: { display: false },
            ticks: { color: "#f8fafc", font: { weight: 500 } }
          }
        }
      }
    });
  },

  /**
   * Render Jobs by Source Doughnut Chart
   */
  renderSourcesChart(sourcesMap) {
    const canvas = document.getElementById("sourcesChart");
    if (!canvas) return;
    destroyChart("sourcesChart");

    const labels = Object.keys(sourcesMap || {}).map(k => {
      if (k === "adzuna") return "Adzuna";
      if (k === "muse") return "The Muse";
      if (k === "remotive") return "Remotive";
      return k.toUpperCase();
    });
    const data = Object.values(sourcesMap || {});

    if (data.length === 0 || data.every(v => v === 0)) {
      this.renderEmptyPlaceholder(canvas, "No source data available.");
      return;
    }

    const colorPalette = ["#38bdf8", "#ec4899", "#10b981", "#8b5cf6"];
    const ctx = canvas.getContext("2d");
    chartInstances["sourcesChart"] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colorPalette.slice(0, labels.length),
          borderColor: "#0f172a",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94a3b8", boxWidth: 12, padding: 14 }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${context.parsed} jobs`
            }
          }
        }
      }
    });
  },

  /**
   * Render Top Hiring Companies Bar Chart
   */
  renderCompaniesChart(companiesMap) {
    const canvas = document.getElementById("companiesChart");
    if (!canvas) return;
    destroyChart("companiesChart");

    const entries = Object.entries(companiesMap || {}).slice(0, 7);
    if (entries.length === 0) {
      this.renderEmptyPlaceholder(canvas, "No company disclosures available.");
      return;
    }

    const labels = entries.map(([comp]) => comp.length > 20 ? comp.slice(0, 18) + '...' : comp);
    const data = entries.map(([, count]) => count);

    const ctx = canvas.getContext("2d");
    chartInstances["companiesChart"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Job Count",
          data: data,
          backgroundColor: "rgba(6, 182, 212, 0.7)",
          borderColor: "#06b6d4",
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: { color: "#94a3b8", stepSize: 1 },
            beginAtZero: true
          },
          x: {
            grid: { display: false },
            ticks: { color: "#f8fafc", maxRotation: 45, minRotation: 0 }
          }
        }
      }
    });
  },

  /**
   * Render Job Types Distribution Chart
   */
  renderJobTypesChart(jobTypesMap) {
    const canvas = document.getElementById("jobTypesChart");
    if (!canvas) return;
    destroyChart("jobTypesChart");

    const entries = Object.entries(jobTypesMap || {});
    if (entries.length === 0) {
      this.renderEmptyPlaceholder(canvas, "No job type data specified.");
      return;
    }

    const labels = entries.map(([jt]) => jt);
    const data = entries.map(([, count]) => count);
    const colors = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#ec4899"];

    const ctx = canvas.getContext("2d");
    chartInstances["jobTypesChart"] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "#0f172a",
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94a3b8", boxWidth: 12, padding: 12 }
          }
        }
      }
    });
  },

  /**
   * Helper placeholder for insufficient data
   */
  renderEmptyPlaceholder(canvas, message) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
};
