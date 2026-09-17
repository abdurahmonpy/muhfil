/**
 * Medium Clone - Stats & Analytics UI Engine
 * Chart tooltip interactivity, period selector, and table sorting.
 */

document.addEventListener('DOMContentLoaded', () => {
  initStatsPeriodSelector();
  initChartTooltips();
  initTableSorting();
});

function initStatsPeriodSelector() {
  const periodButtons = document.querySelectorAll('[data-stats-period]');
  periodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      periodButtons.forEach(b => {
        b.classList.remove('bg-gray-100', 'dark:bg-[#252525]', 'font-semibold', 'text-black', 'dark:text-white');
        b.classList.add('text-gray-500');
      });
      btn.classList.add('bg-gray-100', 'dark:bg-[#252525]', 'font-semibold', 'text-black', 'dark:text-white');
      btn.classList.remove('text-gray-500');

      const period = btn.getAttribute('data-stats-period');
      if (window.showToast) window.showToast(`Updated to ${period}`);
    });
  });
}

function initChartTooltips() {
  const bars = document.querySelectorAll('.chart-bar-group');
  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  bars.forEach(bar => {
    bar.addEventListener('mouseenter', (e) => {
      const date = bar.getAttribute('data-date') || '';
      const views = bar.getAttribute('data-views') || '0';
      const reads = bar.getAttribute('data-reads') || '0';

      tooltip.innerHTML = `
        <div class="font-bold text-xs mb-1 text-gray-700 dark:text-gray-200">${date}</div>
        <div class="text-xs text-medium-green font-semibold">● ${views} views</div>
        <div class="text-xs text-blue-500 font-semibold">● ${reads} reads</div>
      `;
      tooltip.classList.remove('hidden');

      const rect = bar.getBoundingClientRect();
      const parentRect = bar.closest('.chart-container').getBoundingClientRect();
      const rawLeft = rect.left - parentRect.left + rect.width / 2 - tooltip.offsetWidth / 2;
      const maxLeft = parentRect.width - tooltip.offsetWidth - 8;
      tooltip.style.left = `${Math.max(8, Math.min(rawLeft, maxLeft))}px`;
      tooltip.style.top = `${Math.max(8, rect.top - parentRect.top - tooltip.offsetHeight - 8)}px`;
    });

    bar.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
  });
}

function initTableSorting() {
  const headers = document.querySelectorAll('[data-sort-col]');
  const tbody = document.getElementById('stats-table-body');
  if (!tbody) return;

  headers.forEach(header => {
    let asc = false;
    header.addEventListener('click', () => {
      const colIndex = parseInt(header.getAttribute('data-sort-col'), 10);
      const rows = Array.from(tbody.querySelectorAll('tr'));

      rows.sort((a, b) => {
        const aVal = parseFloat(a.children[colIndex].textContent.replace(/[^0-9.]/g, '')) || 0;
        const bVal = parseFloat(b.children[colIndex].textContent.replace(/[^0-9.]/g, '')) || 0;
        return asc ? aVal - bVal : bVal - aVal;
      });

      asc = !asc;
      rows.forEach(r => tbody.appendChild(r));
    });
  });
}
