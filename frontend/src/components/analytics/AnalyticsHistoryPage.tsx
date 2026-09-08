"use client";

import { useMemo, useState } from "react";

interface AnalyticsItem {
  id: number;
  project: string;
  date: string;
  duration: number;
  type: string;
  status: "Completed" | "Processing";
}

const analyticsData: AnalyticsItem[] = [
  {
    id: 1,
    project: "Product Promo",
    date: "2026-09-06",
    duration: 42,
    type: "Video Editing",
    status: "Completed",
  },
  {
    id: 2,
    project: "YouTube Short",
    date: "2026-09-05",
    duration: 28,
    type: "Video Editing",
    status: "Completed",
  },
  {
    id: 3,
    project: "Instagram Reel",
    date: "2026-09-04",
    duration: 35,
    type: "Video Editing",
    status: "Completed",
  },
  {
    id: 4,
    project: "College Project",
    date: "2026-09-03",
    duration: 65,
    type: "Video Editing",
    status: "Completed",
  },
  {
    id: 5,
    project: "Marketing Video",
    date: "2026-09-02",
    duration: 48,
    type: "Video Editing",
    status: "Processing",
  },
  {
    id: 6,
    project: "Travel Vlog",
    date: "2026-08-29",
    duration: 55,
    type: "Video Editing",
    status: "Completed",
  },
  {
    id: 7,
    project: "Portfolio Video",
    date: "2026-08-25",
    duration: 32,
    type: "Video Editing",
    status: "Completed",
  },
  {
    id: 8,
    project: "Tutorial Video",
    date: "2026-08-20",
    duration: 70,
    type: "Video Editing",
    status: "Completed",
  },
];

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatShortDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AnalyticsHistoryPage() {
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    let data = analyticsData;

    if (dateFilter !== "all") {
      const days = Number(dateFilter);
      const today = new Date();
      const limit = new Date();
      limit.setDate(today.getDate() - days);

      data = data.filter((item) => new Date(item.date) >= limit);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      data = data.filter((item) => item.project.toLowerCase().includes(q));
    }

    return data;
  }, [dateFilter, search]);

  const totalMinutes = filteredData.reduce((sum, item) => sum + item.duration, 0);
  const recent = filteredData.slice(0, 3);

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredData.forEach((item) => {
      grouped[item.date] = (grouped[item.date] || 0) + 1;
    });
    const dates = Object.keys(grouped).sort().slice(-7);
    return dates.map((date) => ({
      date,
      count: grouped[date] ?? 0,
      height: Math.max(Math.min((grouped[date] ?? 0) * 10, 100), 8),
    }));
  }, [filteredData]);

  function viewAnalytics(id: number) {
    const item = analyticsData.find((data) => data.id === id);
    if (!item) return;

    window.alert(
      "Analytics Details\n\n" +
        "Project: " +
        item.project +
        "\nDate: " +
        formatDate(item.date) +
        "\nDuration: " +
        formatTime(item.duration) +
        "\nType: " +
        item.type +
        "\nStatus: " +
        item.status,
    );
  }

  function handleExport() {
    window.alert("Frontend demo: Analytics report export will be connected to the backend later.");
  }

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div>
          <span className="page-label">CLIPCRAFT / ANALYTICS</span>
          <h1>Analytics History</h1>
          <p>Track your video editing activity and analytics history.</p>
        </div>

        <button className="export-btn" onClick={handleExport}>
          Export Report
        </button>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <div className="card-icon">▣</div>
          <div>
            <span>Total Projects</span>
            <h2>{filteredData.length}</h2>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">◷</div>
          <div>
            <span>Total Editing Time</span>
            <h2>{formatTime(totalMinutes)}</h2>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">▶</div>
          <div>
            <span>Videos Edited</span>
            <h2>{filteredData.length}</h2>
          </div>
        </div>
      </section>

      <section className="filter-section">
        <div>
          <h2>Analytics Overview</h2>
          <p>View your editing activity over time.</p>
        </div>

        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option value="all">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </section>

      <section className="chart-card">
        <div className="section-heading">
          <div>
            <h2>Editing Activity</h2>
            <p>Projects edited during the selected period.</p>
          </div>
        </div>

        <div className="chart">
          <div className="y-axis">
            <span>10</span>
            <span>8</span>
            <span>6</span>
            <span>4</span>
            <span>2</span>
            <span>0</span>
          </div>

          <div className="chart-area">
            <div className="grid-lines">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="bars">
              {chartData.map((bar) => (
                <div key={bar.date} className="bar" style={{ height: `${bar.height}%` }} />
              ))}
            </div>

            <div className="chart-labels">
              {chartData.map((bar) => (
                <span key={bar.date}>{formatShortDate(bar.date)}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="activity-section">
        <div className="section-title">
          <div>
            <h2>Recent Activity</h2>
            <p>Your latest editing activities.</p>
          </div>
        </div>

        <div className="activity-list">
          {recent.map((item) => (
            <div className="activity-card" key={item.id}>
              <div className="activity-top">
                <div className="activity-icon">▶</div>
                <strong>{item.project}</strong>
              </div>
              <small>
                {item.type} • {formatDate(item.date)}
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="history-section">
        <div className="section-title">
          <div>
            <h2>History</h2>
            <p>Previous projects and analytics.</p>
          </div>

          <input
            type="text"
            placeholder="Search project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>PROJECT</th>
                <th>DATE</th>
                <th>DURATION</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.project}</strong>
                  </td>
                  <td>{formatDate(item.date)}</td>
                  <td>{formatTime(item.duration)}</td>
                  <td>{item.type}</td>
                  <td>
                    <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
                  </td>
                  <td>
                    <button className="view-btn" onClick={() => viewAnalytics(item.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-history">
          {filteredData.map((item) => (
            <div className="mobile-history-card" key={item.id}>
              <div className="mobile-project">
                <strong>{item.project}</strong>
                <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
              </div>

              <div className="mobile-meta">
                <div>
                  <span>Date</span>
                  <strong>{formatDate(item.date)}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{formatTime(item.duration)}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{item.type}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{item.status}</strong>
                </div>
              </div>

              <button className="mobile-view-btn" onClick={() => viewAnalytics(item.id)}>
                View Analytics
              </button>
            </div>
          ))}
        </div>
      </section>

      {filteredData.length === 0 && <div className="empty-state">No analytics history found.</div>}
    </div>
  );
}
