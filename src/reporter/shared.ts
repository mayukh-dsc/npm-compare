export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '…';
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function commonStyles(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #f6f8fa;
      --surface: #ffffff;
      --border: #d0d7de;
      --border-light: #e8ecf0;
      --text: #1f2328;
      --muted: #656d76;
      --link: #0969da;
      --critical-bg: #fff0f0;
      --critical-border: #d1242f;
      --critical-text: #a40e26;
      --warning-bg: #fff8e6;
      --warning-border: #bf8700;
      --warning-text: #7d4e00;
      --success-bg: #dafbe1;
      --success-border: #1a7f37;
      --success-text: #116329;
      --info-bg: #ddf4ff;
      --info-border: #0969da;
      --info-text: #0550ae;
      --neutral-bg: #f6f8fa;
      --radius: 6px;
      --shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text);
      background: var(--bg);
    }

    .container { max-width: 1400px; margin: 0 auto; padding: 24px; }

    header {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .brand { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    h1 { font-size: 22px; font-weight: 600; color: var(--text); margin-bottom: 12px; }

    .meta { display: flex; flex-wrap: wrap; gap: 12px 24px; }
    .meta span { font-size: 13px; color: var(--muted); }
    .meta strong { color: var(--text); }

    .stats-bar {
      display: flex; flex-wrap: wrap; gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 16px;
      min-width: 100px;
      box-shadow: var(--shadow);
    }
    .stat-card .value { font-size: 22px; font-weight: 700; line-height: 1; }
    .stat-card .label { font-size: 11px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-card.critical { border-color: var(--critical-border); background: var(--critical-bg); }
    .stat-card.critical .value { color: var(--critical-text); }
    .stat-card.warning { border-color: var(--warning-border); background: var(--warning-bg); }
    .stat-card.warning .value { color: var(--warning-text); }
    .stat-card.success { border-color: var(--success-border); background: var(--success-bg); }
    .stat-card.success .value { color: var(--success-text); }

    .toolbar {
      display: flex; gap: 10px; align-items: center;
      margin-bottom: 12px;
    }
    .search-input {
      flex: 1; max-width: 380px;
      padding: 7px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 13px;
      background: var(--surface);
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus { border-color: var(--link); box-shadow: 0 0 0 3px rgba(9,105,218,0.12); }

    .table-wrapper {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: auto;
      box-shadow: var(--shadow);
    }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: var(--bg); position: sticky; top: 0; z-index: 1; }
    th {
      padding: 9px 12px;
      text-align: left;
      font-weight: 600;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      cursor: pointer;
      user-select: none;
    }
    th:hover { color: var(--text); }
    td { padding: 8px 12px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--neutral-bg); }

    a { color: var(--link); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.6;
    }
    .badge-dev { background: var(--info-bg); color: var(--info-text); border: 1px solid var(--info-border); }
    .badge-prod { background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border); }
    .badge-critical { background: var(--critical-bg); color: var(--critical-text); border: 1px solid var(--critical-border); }
    .badge-warning { background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border); }
    .badge-added { background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border); }
    .badge-removed { background: var(--critical-bg); color: var(--critical-text); border: 1px solid var(--critical-border); }
    .badge-changed { background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border); }
    .badge-ok { background: var(--neutral-bg); color: var(--muted); border: 1px solid var(--border); }

    .mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12px; }
    .text-muted { color: var(--muted); }
    .text-critical { color: var(--critical-text); font-weight: 600; }
    .text-warning { color: var(--warning-text); }

    .row-critical td { background: var(--critical-bg) !important; }
    .row-added td { background: #f0fff4 !important; }
    .row-removed td { background: #fff5f5 !important; }
    .row-changed td { background: var(--warning-bg) !important; }

    .alert {
      padding: 12px 16px;
      border-radius: var(--radius);
      border: 1px solid;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .alert-critical { border-color: var(--critical-border); background: var(--critical-bg); color: var(--critical-text); }
    .alert-warning { border-color: var(--warning-border); background: var(--warning-bg); color: var(--warning-text); }
    .alert-success { border-color: var(--success-border); background: var(--success-bg); color: var(--success-text); }

    .section-title { font-size: 14px; font-weight: 600; margin: 20px 0 10px; display: flex; align-items: center; gap: 8px; }

    footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
    }

    .hidden { display: none !important; }
  `;
}

export function sortScript(): string {
  return `
    function initSort(tableId) {
      const table = document.getElementById(tableId);
      if (!table) return;
      const headers = table.querySelectorAll('th[data-sort]');
      let lastCol = null, lastDir = 1;

      headers.forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.sort;
          const tbody = table.querySelector('tbody');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          const dir = (col === lastCol) ? -lastDir : 1;
          lastCol = col; lastDir = dir;

          rows.sort((a, b) => {
            const aCell = a.querySelector('[data-' + col + ']');
            const bCell = b.querySelector('[data-' + col + ']');
            const aVal = aCell ? aCell.dataset[col] : a.cells[th.cellIndex]?.textContent ?? '';
            const bVal = bCell ? bCell.dataset[col] : b.cells[th.cellIndex]?.textContent ?? '';
            return aVal.localeCompare(bVal, undefined, { numeric: true }) * dir;
          });

          rows.forEach(r => tbody.appendChild(r));
          headers.forEach(h => h.textContent = h.textContent.replace(/ [↑↓]$/, ''));
          th.textContent += dir === 1 ? ' ↑' : ' ↓';
        });
      });
    }

    function initSearch(inputId, tableId) {
      const input = document.getElementById(inputId);
      const table = document.getElementById(tableId);
      if (!input || !table) return;
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        table.querySelectorAll('tbody tr').forEach(row => {
          row.classList.toggle('hidden', !row.textContent.toLowerCase().includes(q));
        });
      });
    }
  `;
}
