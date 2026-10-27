import Login from "./components/Login";
import { useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const formatNumber = (value) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "—";
    }

    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
    }).format(Number(value));
};

const isNumericColumn = (rows, column) => {
    const values = rows
        .map((row) => row[column])
        .filter((value) => value !== null && value !== undefined && value !== "");

    return (
        values.length > 0 &&
        values.every(
            (value) =>
                typeof value === "number" ||
                (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
        )
    );
};

function App() {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem("datavista_user")) || null;
        } catch {
            return null;
        }
    });

    const handleLogin = (userData) => {
        sessionStorage.setItem("datavista_user", JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = () => {
        sessionStorage.removeItem("datavista_user");
        setUser(null);
    };

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [dataset, setDataset] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [selectedX, setSelectedX] = useState("");
    const [selectedY, setSelectedY] = useState("");
    const [chartType, setChartType] = useState("bar");
    const [activeTab, setActiveTab] = useState("overview");

    const rows = analysis?.data ?? [];
    const columns = analysis?.columns ?? [];
    const numericColumns = analysis?.numeric_columns ?? [];
    const preview = dataset?.preview ?? [];

    const filteredRows = useMemo(() => {
        if (!search.trim()) return rows;

        const query = search.toLowerCase();

        return rows.filter((row) =>
            columns.some((column) =>
                String(row[column] ?? "").toLowerCase().includes(query)
            )
        );
    }, [rows, columns, search]);

    const missingCells = useMemo(
        () =>
            rows.reduce(
                (total, row) =>
                    total +
                    columns.filter(
                        (column) =>
                            row[column] === null ||
                            row[column] === undefined ||
                            row[column] === ""
                    ).length,
                0
            ),
        [rows, columns]
    );

    const categoricalColumns = useMemo(
        () =>
            columns.filter(
                (column) => !numericColumns.includes(column)
            ),
        [columns, numericColumns]
    );

    const chartData = useMemo(() => {
        if (!rows.length || !selectedX) return [];

        const groups = new Map();

        rows.forEach((row) => {
            const label = row[selectedX];

            if (label === null || label === undefined || label === "") return;

            const key = String(label);

            if (!groups.has(key)) {
                groups.set(key, { count: 0, total: 0, values: 0 });
            }

            const group = groups.get(key);
            group.count += 1;

            if (selectedY && row[selectedY] !== null && row[selectedY] !== "") {
                const value = Number(row[selectedY]);

                if (Number.isFinite(value)) {
                    group.total += value;
                    group.values += 1;
                }
            }
        });

        let result = Array.from(groups.entries()).map(([label, group]) => ({
            label,
            value: selectedY
                ? group.values
                    ? group.total / group.values
                    : 0
                : group.count,
            count: group.count,
        }));

        result.sort((a, b) => b.value - a.value);

        // Keep charts readable when a column contains thousands of unique values.
        if (result.length > 30) result = result.slice(0, 30);

        if (chartType === "line") {
            result.reverse();
        }

        return result;
    }, [rows, selectedX, selectedY, chartType]);

    const uploadAndAnalyze = async (selectedFile) => {
        if (!selectedFile) return;

        if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
            setError("Please select a CSV file.");
            return;
        }

        setLoading(true);
        setError("");
        setNotice("");
        setDataset(null);
        setAnalysis(null);
        setFile(selectedFile);
        setSearch("");

        try {
            const uploadForm = new FormData();
            uploadForm.append("file", selectedFile);

            const uploadResponse = await fetch(`${API_BASE}/upload-csv`, {
                method: "POST",
                body: uploadForm,
            });

            const uploadResult = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadResult.detail || "CSV upload failed.");
            }

            setDataset(uploadResult);

            const analysisForm = new FormData();
            analysisForm.append("file", selectedFile);

            const analysisResponse = await fetch(`${API_BASE}/analyze-csv`, {
                method: "POST",
                body: analysisForm,
            });

            const analysisResult = await analysisResponse.json();

            if (!analysisResponse.ok) {
                throw new Error(analysisResult.detail || "Analysis failed.");
            }

            setAnalysis(analysisResult);

            const nums = analysisResult.numeric_columns ?? [];
            const cats = (analysisResult.columns ?? []).filter(
                (column) => !nums.includes(column)
            );

            setSelectedX(cats[0] || nums[0] || "");
            setSelectedY(nums[0] || "");
            setChartType(cats.length && nums.length ? "bar" : "histogram");
            setActiveTab("overview");
            setNotice("Your dataset has been analyzed successfully.");
        } catch (err) {
            setError(
                err.message?.includes("Failed to fetch")
                    ? "Backend connect nahi ho raha. Check karo FastAPI server localhost:8000 par running hai."
                    : err.message || "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0];

        if (selectedFile) uploadAndAnalyze(selectedFile);

        // Allows selecting the same file again.
        event.target.value = "";
    };

    const downloadCSV = () => {
        if (!filteredRows.length) return;

        const escapeCSV = (value) => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
        };

        const content = [
            columns.map(escapeCSV).join(","),
            ...filteredRows.map((row) =>
                columns.map((column) => escapeCSV(row[column])).join(",")
            ),
        ].join("\n");

        const blob = new Blob(["\uFEFF", content], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${file?.name?.replace(/\.csv$/i, "") || "datavista"}-filtered.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const downloadSummary = () => {
        if (!analysis) return;

        const summary = {
            filename: analysis.filename,
            rows: analysis.rows,
            column_count: analysis.column_count,
            numeric_summary: analysis.numeric_summary,
            missing_cells: missingCells,
        };

        const blob = new Blob([JSON.stringify(summary, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "datavista-summary.json";
        link.click();
        URL.revokeObjectURL(url);
    };

    const chartLayout = {
        autosize: true,
        height: 390,
        margin: { t: 24, r: 20, b: 100, l: 65 },
        paper_bgcolor: "rgba(255,255,255,0)",
        plot_bgcolor: "rgba(255,255,255,0)",
        font: { family: "Inter, Arial, sans-serif", color: "#73879b", size: 12 },
        xaxis: {
            automargin: true,
            tickangle: chartData.length > 8 ? -35 : 0,
            gridcolor: "#edf3f8",
        },
        yaxis: {
            automargin: true,
            gridcolor: "#edf3f8",
            zerolinecolor: "#e2edf5",
        },
        showlegend: false,
    };

    const plotData = useMemo(() => {
        if (!chartData.length) return [];

        if (chartType === "pie") {
            return [
                {
                    type: "pie",
                    labels: chartData.map((item) => item.label),
                    values: chartData.map((item) => item.value),
                    hole: 0.48,
                    textinfo: "percent",
                    hovertemplate: "%{label}<br>%{value}<extra></extra>",
                    marker: {
                        colors: [
                            "#63b9ed",
                            "#8dcdf2",
                            "#299bd8",
                            "#b5e2f8",
                            "#4f8edc",
                            "#a9bff0",
                        ],
                    },
                },
            ];
        }

        if (chartType === "histogram") {
            const values = rows
                .map((row) => Number(row[selectedX]))
                .filter(Number.isFinite);

            return [
                {
                    type: "histogram",
                    x: values,
                    nbinsx: 20,
                    marker: { color: "#63b9ed" },
                    hovertemplate: "Range: %{x}<br>Count: %{y}<extra></extra>",
                },
            ];
        }

        return [
            {
                type: chartType === "line" ? "scatter" : "bar",
                mode: chartType === "line" ? "lines+markers" : undefined,
                x: chartData.map((item) => item.label),
                y: chartData.map((item) => item.value),
                type: chartType === "line" ? "scatter" : "bar",
                marker: {
                    color: "#63b9ed",
                    line: { color: "#ffffff", width: 1 },
                    ...(chartType === "bar" ? { cornerradius: 5 } : {}),
                },
                line: { color: "#299bd8", width: 3 },
                hovertemplate: "%{x}<br>%{y:,.2f}<extra></extra>",
            },
        ];
    }, [chartData, chartType, rows, selectedX]);

    const displayRows = filteredRows.slice(0, 100);

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-icon">D</div>
                    <div>
                        <h2>DataVista</h2>
                        <span>DATA INTELLIGENCE</span>
                    </div>
                </div>

                <div className="sidebar-label">WORKSPACE</div>

                <button
                    className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                >
                    <span>▦</span> Overview
                </button>
                <button className="logout-button" onClick={handleLogout}>
                    ↪ Logout
                </button>
                <button
                    className={`nav-item ${activeTab === "explore" ? "active" : ""}`}
                    onClick={() => setActiveTab("explore")}
                >
                    <span>⌁</span> Explore data
                </button>

                <button
                    className={`nav-item ${activeTab === "insights" ? "active" : ""}`}
                    onClick={() => setActiveTab("insights")}
                >
                    <span>✧</span> Insights
                </button>

                <div className="sidebar-bottom">
                    <div className="sidebar-help">
                        <div className="help-icon">✦</div>
                        <strong>Your data, clearer.</strong>
                        <p>Turn raw CSV files into useful visual stories.</p>
                    </div>
                    <div className="sidebar-status">
                        <span className="status-dot" /> Local analytics workspace
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div>
                        <span className="breadcrumb">Workspace / </span>
                        <strong>
                            {activeTab === "overview"
                                ? "Overview"
                                : activeTab === "explore"
                                    ? "Explore data"
                                    : "Insights"}
                        </strong>
                    </div>
                    <div className="topbar-right">
                        <span className="live-status"><span /> Workspace ready</span>
                        <div className="avatar">DV</div>
                    </div>
                </header>

                <div className="page-content">
                    <section className="welcome-row">
                        <div>
                            <div className="eyebrow">YOUR DATA WORKSPACE</div>
                            <h1>Make your data <span>make sense.</span></h1>
                            <p>Upload a CSV. Discover patterns. Explore your data with clarity.</p>
                        </div>
                        <button
                            className="button button-primary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                        >
                            + Upload dataset
                        </button>
                    </section>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        hidden
                        onChange={handleFileChange}
                    />

                    <section className="upload-card">
                        <div
                            className="drop-zone"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                const droppedFile = event.dataTransfer.files?.[0];
                                if (droppedFile) uploadAndAnalyze(droppedFile);
                            }}
                        >
                            <div className="upload-illustration">
                                <div className="upload-cloud">↑</div>
                            </div>
                            <div className="upload-copy">
                                <h3>{file ? file.name : "Bring your data to life"}</h3>
                                <p>
                                    {file
                                        ? "Choose another CSV anytime to start a new analysis."
                                        : "Drop your CSV file here, or browse from your computer."}
                                </p>
                                <span>CSV FILES · UP TO 100 COLUMNS</span>
                            </div>
                            <button
                                className="button button-outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                            >
                                {loading ? "Analyzing..." : "Browse files"}
                            </button>
                        </div>
                    </section>

                    {error && (
                        <div className="notice notice-error" role="alert">
                            <strong>Something needs attention</strong>
                            <p>{error}</p>
                        </div>
                    )}

                    {notice && !error && (
                        <div className="notice notice-success" role="status">
                            {notice}
                        </div>
                    )}

                    {loading && (
                        <div className="loading-panel">
                            <div className="loading-spinner" />
                            <strong>Reading your dataset...</strong>
                            <p>Preparing metrics, summaries and visualizations.</p>
                        </div>
                    )}

                    {!analysis && !loading && (
                        <section className="getting-started">
                            <div className="section-heading">
                                <div>
                                    <h2>Your analytics dashboard</h2>
                                    <p>Your metrics and charts will appear here after upload.</p>
                                </div>
                                <span className="subtle-pill">WAITING FOR DATA</span>
                            </div>
                            <div className="empty-state-grid">
                                <article className="empty-state-card">
                                    <div className="empty-icon">▤</div>
                                    <h3>Dataset overview</h3>
                                    <p>Understand row counts, columns and missing values.</p>
                                </article>
                                <article className="empty-state-card">
                                    <div className="empty-icon">⌁</div>
                                    <h3>Interactive charts</h3>
                                    <p>Compare groups and explore numeric patterns.</p>
                                </article>
                                <article className="empty-state-card">
                                    <div className="empty-icon">✧</div>
                                    <h3>Data insights</h3>
                                    <p>Review descriptive statistics and data quality.</p>
                                </article>
                            </div>
                        </section>
                    )}

                    {analysis && (
                        <>
                            <section className="metrics-grid">
                                <article className="metric-card">
                                    <div className="metric-top"><span>Total rows</span><span>▤</span></div>
                                    <div className="metric-value">{formatNumber(analysis.rows)}</div>
                                    <div className="metric-foot">Records in dataset</div>
                                </article>
                                <article className="metric-card">
                                    <div className="metric-top"><span>Total columns</span><span>▦</span></div>
                                    <div className="metric-value">{formatNumber(analysis.column_count)}</div>
                                    <div className="metric-foot">Available fields</div>
                                </article>
                                <article className="metric-card">
                                    <div className="metric-top"><span>Numeric fields</span><span>∑</span></div>
                                    <div className="metric-value">{formatNumber(numericColumns.length)}</div>
                                    <div className="metric-foot">Fields ready to analyze</div>
                                </article>
                                <article className="metric-card">
                                    <div className="metric-top"><span>Missing cells</span><span>◇</span></div>
                                    <div className="metric-value">{formatNumber(missingCells)}</div>
                                    <div className="metric-foot">Blank or null values</div>
                                </article>
                            </section>

                            <section className="panel chart-panel">
                                <div className="section-heading">
                                    <div>
                                        <h2>Visual exploration</h2>
                                        <p>Choose fields and a chart type to explore your data.</p>
                                    </div>
                                    <span className="subtle-pill">INTERACTIVE</span>
                                </div>

                                <div className="chart-controls">
                                    <label>
                                        <span>Group / X-axis</span>
                                        <select
                                            value={selectedX}
                                            onChange={(event) => setSelectedX(event.target.value)}
                                        >
                                            {columns.map((column) => (
                                                <option key={column} value={column}>{column}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        <span>Numeric field / Y-axis</span>
                                        <select
                                            value={selectedY}
                                            onChange={(event) => setSelectedY(event.target.value)}
                                        >
                                            <option value="">Count records</option>
                                            {numericColumns.map((column) => (
                                                <option key={column} value={column}>{column}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        <span>Chart style</span>
                                        <select
                                            value={chartType}
                                            onChange={(event) => setChartType(event.target.value)}
                                        >
                                            <option value="bar">Bar chart</option>
                                            <option value="line">Line chart</option>
                                            <option value="pie">Donut chart</option>
                                            <option value="histogram">Histogram</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="chart-caption">
                                    <div>
                                        <strong>{selectedY ? `Average ${selectedY}` : `Records by ${selectedX}`}</strong>
                                        <span>
                                            {chartType === "histogram"
                                                ? "Numeric value distribution"
                                                : `${chartData.length} groups shown · maximum 30 for readability`}
                                        </span>
                                    </div>
                                    <span className="chart-legend"><i /> Dataset</span>
                                </div>

                                <div className="chart-container">
                                    {plotData.length ? (
                                        <Plot
                                            data={plotData}
                                            layout={chartLayout}
                                            config={{
                                                responsive: true,
                                                displaylogo: false,
                                                modeBarButtonsToRemove: ["lasso2d", "select2d"],
                                            }}
                                            style={{ width: "100%", height: "390px" }}
                                            useResizeHandler
                                        />
                                    ) : (
                                        <div className="chart-empty">
                                            Select a valid field to display a chart.
                                        </div>
                                    )}
                                </div>

                                {chartData.length === 30 && (
                                    <p className="chart-note">
                                        Showing up to 30 groups. Choose a column with fewer unique values for a clearer comparison.
                                    </p>
                                )}
                            </section>

                            <section className="insights-grid">
                                <article className="panel summary-panel">
                                    <div className="section-heading">
                                        <div>
                                            <h2>Quick insights</h2>
                                            <p>Automatically calculated from your dataset.</p>
                                        </div>
                                        <span className="insight-sparkle">✧</span>
                                    </div>

                                    <div className="insight-list">
                                        <div className="insight-item">
                                            <span className="insight-bullet">01</span>
                                            <div>
                                                <strong>Dataset size</strong>
                                                <p>{formatNumber(analysis.rows)} records across {analysis.column_count} columns.</p>
                                            </div>
                                        </div>
                                        <div className="insight-item">
                                            <span className="insight-bullet">02</span>
                                            <div>
                                                <strong>Numeric coverage</strong>
                                                <p>{numericColumns.length} numeric fields can be explored with summary statistics.</p>
                                            </div>
                                        </div>
                                        <div className="insight-item">
                                            <span className="insight-bullet">03</span>
                                            <div>
                                                <strong>Data quality</strong>
                                                <p>
                                                    {missingCells === 0
                                                        ? "No missing cells detected in the loaded dataset."
                                                        : `${formatNumber(missingCells)} missing cells detected. Review the table to locate them.`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="insight-item">
                                            <span className="insight-bullet">04</span>
                                            <div>
                                                <strong>High-cardinality columns</strong>
                                                <p>
                                                    {categoricalColumns.filter(
                                                        (column) => new Set(rows.map((row) => row[column])).size > 30
                                                    ).length
                                                        ? "Some categorical fields contain many unique values; charts show a limited set to stay readable."
                                                        : "Categorical fields have manageable numbers of unique values for grouping."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="button button-outline summary-download" onClick={downloadSummary}>
                                        ↓ Export summary
                                    </button>
                                </article>

                                <article className="panel summary-panel">
                                    <div className="section-heading">
                                        <div>
                                            <h2>Numeric summary</h2>
                                            <p>Overview of your numeric columns.</p>
                                        </div>
                                    </div>

                                    {numericColumns.length ? (
                                        <div className="numeric-summary-list">
                                            {numericColumns.slice(0, 8).map((column) => {
                                                const stats = analysis.numeric_summary?.[column] ?? {};

                                                return (
                                                    <div className="numeric-summary-item" key={column}>
                                                        <div className="numeric-summary-heading">
                                                            <strong title={column}>{column}</strong>
                                                            <span>Average: {formatNumber(stats.average)}</span>
                                                        </div>
                                                        <div className="numeric-stats">
                                                            <span>Min <b>{formatNumber(stats.minimum)}</b></span>
                                                            <span>Max <b>{formatNumber(stats.maximum)}</b></span>
                                                            <span>Total <b>{formatNumber(stats.total)}</b></span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="chart-empty">
                                            No numeric columns were detected in this dataset.
                                        </div>
                                    )}
                                </article>
                            </section>

                            <section className="panel data-table-panel">
                                <div className="section-heading table-heading">
                                    <div>
                                        <h2>Dataset explorer</h2>
                                        <p>
                                            Search all loaded records. Showing {formatNumber(displayRows.length)} of {formatNumber(filteredRows.length)} matching rows.
                                        </p>
                                    </div>
                                    <button className="button button-outline" onClick={downloadCSV}>
                                        ↓ Export CSV
                                    </button>
                                </div>

                                <div className="table-toolbar">
                                    <div className="table-search">
                                        <span>⌕</span>
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search across all columns..."
                                        />
                                    </div>
                                    <span className="table-count">
                                        {formatNumber(filteredRows.length)} matching records
                                    </span>
                                </div>

                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                {columns.map((column) => (
                                                    <th key={column}>{column}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayRows.map((row, index) => (
                                                <tr key={index}>
                                                    {columns.map((column) => (
                                                        <td key={column}>
                                                            {row[column] === null ||
                                                                row[column] === undefined ||
                                                                row[column] === ""
                                                                ? <span className="missing-value">Missing</span>
                                                                : String(row[column])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {!displayRows.length && (
                                        <div className="chart-empty">No records match your search.</div>
                                    )}
                                </div>
                                <div className="table-footnote">
                                    For performance, the table displays at most 100 rows at a time. Export CSV to save all filtered records.
                                </div>
                            </section>

                            <section className="panel getting-started">
                                <div className="section-heading">
                                    <div>
                                        <h2>Dataset details</h2>
                                        <p>Columns detected in the uploaded file.</p>
                                    </div>
                                </div>
                                <div className="column-chips">
                                    {columns.map((column) => (
                                        <span className="column-chip" key={column}>
                                            {column}
                                            <small>{numericColumns.includes(column) ? "NUMERIC" : "TEXT / CATEGORY"}</small>
                                        </span>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    <footer className="app-footer">
                        <span>DataVista · Data made clearer.</span>
                        <span>Local analysis · Your CSV stays in this workspace</span>
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default App;
