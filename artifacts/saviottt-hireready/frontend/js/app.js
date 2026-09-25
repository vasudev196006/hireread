/**
 * CAREERCOPE AI - Main Application Logic
 */

let currentJobListings = [];

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  // 1. Initial Status Check
  checkSourceStatuses();

  // 2. Setup Listeners
  const searchForm = document.getElementById("searchForm");
  const careerInput = document.getElementById("careerInput");
  const countrySelect = document.getElementById("countrySelect");
  const filterKeyword = document.getElementById("filterKeyword");
  const filterSource = document.getElementById("filterSource");
  const closeErrorBtn = document.getElementById("closeErrorBtn");

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const career = careerInput.value.trim();
    const country = countrySelect.value;
    if (career) {
      executeCareerAnalysis(career, country);
    }
  });

  // Popular search chips
  document.querySelectorAll(".search-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const career = chip.dataset.career;
      careerInput.value = career;
      executeCareerAnalysis(career, countrySelect.value);
    });
  });

  // Job filtering listeners
  filterKeyword.addEventListener("input", filterAndRenderJobListings);
  filterSource.addEventListener("change", filterAndRenderJobListings);

  // Error banner close
  closeErrorBtn.addEventListener("click", () => {
    document.getElementById("errorBanner").style.display = "none";
  });
}

/**
 * Checks backend and updates top status indicators
 */
async function checkSourceStatuses() {
  const statusData = await CareerAPI.getStatus();
  if (!statusData || !statusData.services) return;

  const services = statusData.services;
  updateStatusPill("statusAdzuna", services.adzuna?.configured);
  updateStatusPill("statusMuse", true); // Public endpoint is accessible
  updateStatusPill("statusRemotive", services.remotive?.configured);
  updateStatusPill("statusGemini", services.gemini?.configured);
}

function updateStatusPill(elementId, isConnected) {
  const pill = document.getElementById(elementId);
  if (!pill) return;
  if (isConnected) {
    pill.classList.remove("disconnected");
    pill.classList.add("connected");
  } else {
    pill.classList.remove("connected");
    pill.classList.add("disconnected");
  }
}

/**
 * Animated step progression for loading screen
 */
async function runLoadingAnimation() {
  const steps = [
    "stepAdzuna",
    "stepMuse",
    "stepRemotive",
    "stepCombine",
    "stepSkills",
    "stepAI"
  ];

  // Reset steps
  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.className = "check-item";
      el.innerHTML = `<i class="fa-regular fa-circle"></i> ${el.innerText.replace(/^[✓\s•]+/, '')}`;
    }
  });

  for (let i = 0; i < steps.length; i++) {
    const el = document.getElementById(steps[i]);
    if (el) {
      el.classList.add("in-progress");
      el.innerHTML = `<i class="fa-solid fa-spinner"></i> ${el.innerText.replace(/^[✓\s•]+/, '')}`;
      await new Promise(r => setTimeout(r, 180));
      el.classList.remove("in-progress");
      el.classList.add("completed");
      el.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${el.innerText.replace(/^[✓\s•]+/, '')}`;
    }
  }
}

/**
 * Core flow: calls backend, manages UI states, renders dashboard
 */
async function executeCareerAnalysis(career, country) {
  const heroSection = document.getElementById("heroSection");
  const loadingSection = document.getElementById("loadingSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const errorBanner = document.getElementById("errorBanner");
  const analyzeBtn = document.getElementById("analyzeBtn");

  // Show loading
  errorBanner.style.display = "none";
  dashboardSection.style.display = "none";
  loadingSection.style.display = "block";
  document.getElementById("loadingCareerText").textContent = `Analyzing real-time job evidence for "${career}"`;
  analyzeBtn.disabled = true;

  // Start animated checklist
  const animPromise = runLoadingAnimation();

  try {
    const [data] = await Promise.all([
      CareerAPI.analyzeCareer(career, country),
      animPromise
    ]);

    // Update real-time status pills from response
    if (data.source_statuses) {
      updateStatusPill("statusAdzuna", data.source_statuses.adzuna?.connected);
      updateStatusPill("statusMuse", data.source_statuses.muse?.connected);
      updateStatusPill("statusRemotive", data.source_statuses.remotive?.connected);
      updateStatusPill("statusGemini", data.source_statuses.gemini?.connected);
    }

    loadingSection.style.display = "none";
    renderDashboard(data);
    dashboardSection.style.display = "flex";

    // Scroll smoothly to dashboard
    dashboardSection.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    loadingSection.style.display = "none";
    showError(
      "Search Notice",
      err.message || "Failed to analyze career data. Please check connection and try again."
    );
  } finally {
    analyzeBtn.disabled = false;
  }
}

/**
 * Populates all dashboard elements with structured evidence
 */
function renderDashboard(data) {
  const stats = data.statistics;
  const gemini = data.gemini_analysis || {};

  // 1. Header Information
  document.getElementById("dashCareerTitle").textContent = data.career;
  document.getElementById("dashCountryBadge").textContent = getCountryLabel(data.country);
  
  const cacheBadge = document.getElementById("dashCacheBadge");
  cacheBadge.style.display = data.cached ? "inline-block" : "none";

  document.getElementById("dashMarketSummary").textContent = 
    gemini.market_summary || `Aggregated ${stats.total_jobs} active opportunities from connected sources.`;

  // 2. Market Signal Badge
  const signal = gemini.demand_signal || { label: "MODERATE", explanation: "Calculated based on listing frequency." };
  const signalLabel = (signal.label || "MODERATE").toUpperCase();
  const signalTextEl = document.getElementById("signalLabel");
  const signalBadge = document.getElementById("signalBadge");
  signalTextEl.textContent = signalLabel;
  document.getElementById("signalExplanation").textContent = signal.explanation || "";

  signalBadge.className = "signal-indicator";
  if (signalLabel.includes("HIGH")) {
    signalBadge.classList.add("signal-high");
  } else if (signalLabel.includes("MODERATE")) {
    signalBadge.classList.add("signal-moderate");
  } else {
    signalBadge.classList.add("signal-low");
  }

  // 3. Top Metrics
  document.getElementById("metricTotalJobs").textContent = stats.total_jobs.toLocaleString();
  document.getElementById("cntAdzuna").textContent = stats.jobs_per_source.adzuna || 0;
  document.getElementById("cntMuse").textContent = stats.jobs_per_source.muse || 0;
  document.getElementById("cntRemotive").textContent = stats.jobs_per_source.remotive || 0;

  // Salary
  const sal = stats.salary_statistics;
  if (sal && sal.jobs_with_salary > 0 && sal.salary_avg) {
    document.getElementById("metricSalaryAvg").textContent = `$${Math.round(sal.salary_avg).toLocaleString()}`;
    document.getElementById("metricSalaryMeta").textContent = 
      `Range: $${Math.round(sal.salary_min).toLocaleString()} - $${Math.round(sal.salary_max).toLocaleString()} (${sal.jobs_with_salary} jobs)`;
  } else {
    document.getElementById("metricSalaryAvg").textContent = "N/A";
    document.getElementById("metricSalaryMeta").textContent = "Undisclosed in current listings";
  }

  // Top Skill
  if (stats.top_skills && stats.top_skills.length > 0) {
    const top = stats.top_skills[0];
    document.getElementById("metricTopSkill").textContent = top.skill;
    document.getElementById("metricTopSkillPct").textContent = `${top.percentage}% appearance rate (${top.mentions} mentions)`;
  } else {
    document.getElementById("metricTopSkill").textContent = "Diverse";
    document.getElementById("metricTopSkillPct").textContent = "No single dominant skill detected";
  }

  // Visual Charts
  ChartManager.renderSkillsChart(stats.top_skills);
  ChartManager.renderSourcesChart(stats.jobs_per_source);
  ChartManager.renderCompaniesChart(stats.jobs_by_company);
  ChartManager.renderJobTypesChart(stats.jobs_by_job_type);

  // 6. AI Intelligence & Signals
  renderListItems("observedSignalsList", gemini.observed_signals || ["No specific signals observed."]);
  renderListItems("opportunitiesList", gemini.market_opportunities || ["Standard market demand."]);
  renderListItems("uncertaintiesList", gemini.market_risks_or_uncertainties || ["Standard market uncertainty."]);

  // 7. Future Outlook
  const outlook = gemini.future_outlook || {};
  document.getElementById("outlookOneYear").textContent = outlook.one_year || "Insufficient data for 1-year projection.";
  document.getElementById("outlookFiveYear").textContent = outlook.five_year || "Insufficient data for 5-year projection.";
  document.getElementById("outlookTenYear").textContent = outlook.ten_year || "Insufficient data for 10-year projection.";
  document.getElementById("confidenceVal").textContent = outlook.confidence || "Moderate";

  // 8. Limitations List
  renderListItems("limitationsList", gemini.limitations || [
    "Data gathered from Adzuna, The Muse, and Remotive.",
    "Compensation metrics depend on employer salary disclosure."
  ]);

  // 9. Job Listings Directory
  currentJobListings = data.jobs || [];
  filterAndRenderJobListings();
}

function renderListItems(listId, items) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = "";
  items.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    container.appendChild(li);
  });
}

/**
 * Filter & Render Job Listings Cards
 */
function filterAndRenderJobListings() {
  const keyword = (document.getElementById("filterKeyword").value || "").toLowerCase().trim();
  const sourceFilter = document.getElementById("filterSource").value;
  const grid = document.getElementById("jobCardsGrid");
  const countEl = document.getElementById("listingsCount");

  const filtered = currentJobListings.filter(job => {
    // Source filter
    if (sourceFilter !== "all") {
      const match = (job.sources || [job.source]).some(s => s.toLowerCase() === sourceFilter);
      if (!match) return false;
    }
    // Keyword filter
    if (keyword) {
      const inTitle = (job.title || "").toLowerCase().includes(keyword);
      const inCompany = (job.company || "").toLowerCase().includes(keyword);
      const inSkills = (job.skills || []).some(s => s.toLowerCase().includes(keyword));
      const inLoc = (job.location || "").toLowerCase().includes(keyword);
      if (!inTitle && !inCompany && !inSkills && !inLoc) return false;
    }
    return true;
  });

  countEl.textContent = `${filtered.length} listings shown`;
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748b;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
        <p>No job listings match your current filter criteria.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";

    // Primary source badge
    const mainSource = (job.sources && job.sources[0]) || job.source || "remotive";
    const sourceClass = mainSource.toLowerCase();

    // Salary badge if present
    let salaryHtml = "";
    if (job.salary_min && job.salary_max) {
      salaryHtml = `<span class="job-salary-tag">$${Math.round(job.salary_min).toLocaleString()} - $${Math.round(job.salary_max).toLocaleString()}</span>`;
    } else if (job.salary_min) {
      salaryHtml = `<span class="job-salary-tag">$${Math.round(job.salary_min).toLocaleString()}+</span>`;
    }

    // Skills tags
    const skillsHtml = (job.skills || []).slice(0, 4).map(s => 
      `<span class="job-skill-tag">${s}</span>`
    ).join("");

    // Date formatted
    const dateStr = job.publication_date ? new Date(job.publication_date).toLocaleDateString() : "Recent";

    card.innerHTML = `
      <div class="job-card-top">
        <div class="job-card-source-row">
          <span class="source-badge ${sourceClass}">${mainSource}</span>
          <span class="job-pub-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
        </div>
        <h4 class="job-card-title">${escapeHtml(job.title)}</h4>
        <div class="job-card-company"><i class="fa-regular fa-building"></i> ${escapeHtml(job.company)}</div>
        <div class="job-card-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location)}</div>
        
        <div class="job-card-tags">
          ${salaryHtml}
          ${skillsHtml}
        </div>
      </div>

      <div class="job-card-bottom">
        <span class="job-type-pill"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(job.job_type)}</span>
        <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="btn-view-job">
          <span>View Job</span>
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </div>
    `;

    grid.appendChild(card);
  });
}

function showError(title, message) {
  const banner = document.getElementById("errorBanner");
  document.getElementById("errorTitle").textContent = title;
  document.getElementById("errorMessage").textContent = message;
  banner.style.display = "block";
}

function getCountryLabel(code) {
  const map = {
    "in": "India (IN)",
    "us": "United States (US)",
    "gb": "United Kingdom (GB)",
    "ca": "Canada (CA)",
    "au": "Australia (AU)",
    "de": "Germany (DE)",
    "global": "Global / Remote"
  };
  return map[code.toLowerCase()] || code.toUpperCase();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
