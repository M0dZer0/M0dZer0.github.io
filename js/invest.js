// Daily update area:
// 1. Keep the field names unchanged.
// 2. Append a new row at the bottom every day.
// 3. Amount unit is CNY. The page will recalculate totals automatically.
const INVEST_DAILY_DATA = [
  { date: '2026-05-31', eastMoney: 248600, ths: 132400, gold: 86900, margin: 121000 },
  { date: '2026-06-01', eastMoney: 249850, ths: 132980, gold: 87250, margin: 120700 },
  { date: '2026-06-02', eastMoney: 251420, ths: 133260, gold: 87480, margin: 120200 },
  { date: '2026-06-03', eastMoney: 250780, ths: 132940, gold: 87820, margin: 119900 },
  { date: '2026-06-04', eastMoney: 252860, ths: 134180, gold: 88100, margin: 119300 },
  { date: '2026-06-05', eastMoney: 254200, ths: 134950, gold: 88360, margin: 118900 },
  { date: '2026-06-06', eastMoney: 253600, ths: 135420, gold: 88740, margin: 118500 },
  { date: '2026-06-07', eastMoney: 255320, ths: 136260, gold: 88980, margin: 118100 },
  { date: '2026-06-08', eastMoney: 256540, ths: 137150, gold: 89310, margin: 117800 },
  { date: '2026-06-09', eastMoney: 258120, ths: 137880, gold: 89760, margin: 117300 }
];

const METRICS = [
  {
    key: 'total',
    label: '总资产',
    color: '#ff6479',
    getValue(record) {
      return record.eastMoney + record.ths + record.gold - record.margin;
    }
  },
  {
    key: 'eastMoney',
    label: '东方财富',
    color: '#ff8a5b',
    getValue(record) {
      return record.eastMoney;
    }
  },
  {
    key: 'ths',
    label: '同花顺',
    color: '#ffbc47',
    getValue(record) {
      return record.ths;
    }
  },
  {
    key: 'gold',
    label: '黄金',
    color: '#5cc8ff',
    getValue(record) {
      return record.gold;
    }
  },
  {
    key: 'margin',
    label: '融资余额',
    color: '#7b86ff',
    getValue(record) {
      return record.margin;
    }
  }
];

const donutMetrics = [
  { key: 'eastMoney', label: '东方财富' },
  { key: 'ths', label: '同花顺' },
  { key: 'gold', label: '黄金' },
  { key: 'margin', label: '融资余额' }
];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0
});

document.addEventListener('DOMContentLoaded', () => {
  const dashboard = document.querySelector('.invest-page');
  if (!dashboard) {
    return;
  }

  const sortedRecords = [...INVEST_DAILY_DATA]
    .map((record) => ({ ...record, dateObject: parseDate(record.date) }))
    .sort((left, right) => left.dateObject - right.dateObject);

  if (!sortedRecords.length) {
    return;
  }

  const previousMonthClose = findPreviousMonthClose(sortedRecords);
  const latestRecord = sortedRecords[sortedRecords.length - 1];
  const previousRecord = sortedRecords[sortedRecords.length - 2] || latestRecord;
  const metricsByKey = Object.fromEntries(
    METRICS.map((metric) => [metric.key, buildMetricState(metric, sortedRecords, previousMonthClose, previousRecord)])
  );

  renderSummary(metricsByKey.total, latestRecord, previousMonthClose);
  renderOverview(metricsByKey.total, latestRecord, metricsByKey);
  renderCards(metricsByKey);
  bindModal(metricsByKey);
});

function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function findPreviousMonthClose(records) {
  const latest = records[records.length - 1].dateObject;
  const targetYear = latest.getMonth() === 0 ? latest.getFullYear() - 1 : latest.getFullYear();
  const targetMonth = latest.getMonth() === 0 ? 11 : latest.getMonth() - 1;
  const previousMonthRecords = records.filter((record) => {
    return record.dateObject.getFullYear() === targetYear && record.dateObject.getMonth() === targetMonth;
  });

  return previousMonthRecords[previousMonthRecords.length - 1] || records[0];
}

function buildMetricState(metric, records, previousMonthClose, previousRecord) {
  const latestRecord = records[records.length - 1];
  const currentValue = metric.getValue(latestRecord);
  const yesterdayValue = metric.getValue(previousRecord);
  const monthBaseValue = metric.getValue(previousMonthClose);
  const monthSeries = records
    .filter((record) => record.dateObject >= previousMonthClose.dateObject)
    .map((record) => ({
      date: record.date,
      value: metric.getValue(record),
      delta: metric.getValue(record) - monthBaseValue
    }));

  return {
    ...metric,
    currentValue,
    dailyChange: currentValue - yesterdayValue,
    monthlyChange: currentValue - monthBaseValue,
    baselineDate: previousMonthClose.date,
    latestDate: latestRecord.date,
    series: monthSeries
  };
}

function renderSummary(totalMetric, latestRecord, previousMonthClose) {
  const summaryElement = document.getElementById('invest-summary-text');
  if (!summaryElement) {
    return;
  }

  summaryElement.textContent =
    '截至 ' +
    latestRecord.date +
    '，当前净总资产为 ' +
    formatCurrency(totalMetric.currentValue) +
    '，较昨日 ' +
    formatSignedCurrency(totalMetric.dailyChange) +
    '，较 ' +
    previousMonthClose.date +
    ' 的月末基准 ' +
    formatSignedCurrency(totalMetric.monthlyChange) +
    '。';
}

function renderOverview(totalMetric, latestRecord, metricsByKey) {
  setText('monthly-pnl-value', formatSignedCurrency(totalMetric.monthlyChange));
  setTrend('monthly-pnl-value', totalMetric.monthlyChange);

  setText('monthly-pnl-reference', '较上月最后一天 ' + totalMetric.baselineDate);
  setText('overview-total-assets', formatCurrency(totalMetric.currentValue));
  setText('overview-total-daily-change', formatSignedCurrency(totalMetric.dailyChange));
  setTrend('overview-total-daily-change', totalMetric.dailyChange);
  setText('overview-latest-date', latestRecord.date);
  setText('composition-total', formatCurrency(totalMetric.currentValue));

  renderDonut(metricsByKey);
}

function renderCards(metricsByKey) {
  document.querySelectorAll('[data-invest-target]').forEach((card) => {
    const key = card.dataset.investTarget;
    const metric = metricsByKey[key];

    if (!metric) {
      return;
    }

    const valueElement = card.querySelector('[data-role="value"]');
    const dailyChangeElement = card.querySelector('[data-role="daily-change"]');
    const monthlyChangeElement = card.querySelector('[data-role="monthly-change"]');

    if (valueElement) {
      valueElement.textContent = formatCurrency(metric.currentValue);
    }

    if (dailyChangeElement) {
      dailyChangeElement.textContent = formatSignedCurrency(metric.dailyChange);
      applyTrendClass(dailyChangeElement, metric.dailyChange);
    }

    if (monthlyChangeElement) {
      monthlyChangeElement.textContent = formatSignedCurrency(metric.monthlyChange);
      applyTrendClass(monthlyChangeElement, metric.monthlyChange);
    }
  });
}

function renderDonut(metricsByKey) {
  const donutElement = document.getElementById('composition-chart');
  const legendElement = document.getElementById('composition-legend');

  if (!donutElement || !legendElement) {
    return;
  }

  const segments = donutMetrics.map((item) => {
    const metric = metricsByKey[item.key];
    return {
      key: item.key,
      label: item.label,
      color: metric.color,
      value: Math.max(metric.currentValue, 0)
    };
  });

  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let cursor = 0;

  donutElement.style.setProperty(
    '--chart-slices',
    'conic-gradient(' +
      segments
        .map((segment) => {
          const start = cursor;
          cursor += (segment.value / total) * 100;
          return segment.color + ' ' + start.toFixed(2) + '% ' + cursor.toFixed(2) + '%';
        })
        .join(', ') +
      ')'
  );

  legendElement.innerHTML = segments
    .map((segment) => {
      const share = ((segment.value / total) * 100).toFixed(1) + '%';
      return (
        '<div class="composition-legend__item">' +
        '<div class="composition-legend__meta">' +
        '<span class="composition-legend__swatch" style="background:' + segment.color + '"></span>' +
        '<div>' +
        '<span class="composition-legend__label">' + segment.label + '</span>' +
        '<span class="composition-legend__share">占比 ' + share + '</span>' +
        '</div>' +
        '</div>' +
        '<strong class="composition-legend__value">' + formatCurrency(segment.value) + '</strong>' +
        '</div>'
      );
    })
    .join('');
}

function bindModal(metricsByKey) {
  const modalElement = document.getElementById('invest-modal');
  const closeButtons = document.querySelectorAll('[data-modal-close]');

  if (!modalElement) {
    return;
  }

  document.querySelectorAll('[data-invest-target]').forEach((card) => {
    card.addEventListener('click', () => {
      const metric = metricsByKey[card.dataset.investTarget];
      if (!metric) {
        return;
      }
      openModal(modalElement, metric);
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => closeModal(modalElement));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modalElement.hidden) {
      closeModal(modalElement);
    }
  });
}

function openModal(modalElement, metric) {
  setText('invest-modal-title', metric.label);
  setText('invest-modal-kicker', '最近一个月变化趋势');
  setText('invest-modal-reference', '基准日 ' + metric.baselineDate + '，图中纵轴为较上月末变动金额');
  setText('invest-modal-value', formatCurrency(metric.currentValue));
  setText('invest-modal-change', formatSignedCurrency(metric.monthlyChange));
  setTrend('invest-modal-change', metric.monthlyChange);
  renderLineChart(metric);

  modalElement.hidden = false;
  modalElement.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalElement) {
  modalElement.hidden = true;
  modalElement.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderLineChart(metric) {
  const svg = document.getElementById('invest-line-chart');
  const axisElement = document.getElementById('invest-modal-axis');

  if (!svg || !axisElement) {
    return;
  }

  const chartWidth = 760;
  const chartHeight = 320;
  const padding = { top: 24, right: 28, bottom: 42, left: 68 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const points = metric.series;
  const deltas = points.map((point) => point.delta);
  const trendColor = getTrendColor(metric.monthlyChange);
  let minValue = Math.min(...deltas, 0);
  let maxValue = Math.max(...deltas, 0);

  if (minValue === maxValue) {
    minValue -= 1000;
    maxValue += 1000;
  }

  const xAt = (index) => {
    if (points.length === 1) {
      return padding.left + plotWidth / 2;
    }
    return padding.left + (plotWidth * index) / (points.length - 1);
  };

  const yAt = (value) => {
    return padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
  };

  const polylinePoints = points.map((point, index) => xAt(index) + ',' + yAt(point.delta)).join(' ');
  const areaPoints =
    padding.left +
    ',' +
    (padding.top + plotHeight) +
    ' ' +
    polylinePoints +
    ' ' +
    xAt(points.length - 1) +
    ',' +
    (padding.top + plotHeight);

  const tickValues = [maxValue, (maxValue + minValue) / 2, minValue];
  const zeroLineY = yAt(0);

  svg.innerHTML = [
    '<defs>',
    '<linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="' + trendColor + '" stop-opacity="0.32"></stop>',
    '<stop offset="100%" stop-color="' + trendColor + '" stop-opacity="0"></stop>',
    '</linearGradient>',
    '</defs>',
    tickValues
      .map((tick) => {
        const y = yAt(tick);
        return (
          '<line class="chart-grid-line" x1="' +
          padding.left +
          '" y1="' +
          y +
          '" x2="' +
          (padding.left + plotWidth) +
          '" y2="' +
          y +
          '"></line>' +
          '<text class="chart-axis-label" x="' +
          (padding.left - 14) +
          '" y="' +
          (y + 4) +
          '" text-anchor="end">' +
          escapeHtml(formatSignedShort(tick)) +
          '</text>'
        );
      })
      .join(''),
    '<line class="chart-zero-line" x1="' +
      padding.left +
      '" y1="' +
      zeroLineY +
      '" x2="' +
      (padding.left + plotWidth) +
      '" y2="' +
      zeroLineY +
      '"></line>',
    '<polygon class="chart-area" points="' + areaPoints + '"></polygon>',
    '<polyline class="chart-line" stroke="' + trendColor + '" points="' + polylinePoints + '"></polyline>',
    points
      .map((point, index) => {
        return (
          '<circle class="chart-dot" cx="' +
          xAt(index) +
          '" cy="' +
          yAt(point.delta) +
          '" r="4.5" stroke="' +
          trendColor +
          '"></circle>'
        );
      })
      .join(''),
    buildXLabels(points, xAt, chartHeight, padding.bottom)
  ].join('');

  axisElement.innerHTML =
    '<span>起点 ' +
    escapeHtml(metric.baselineDate) +
    '</span>' +
    '<span>终点 ' +
    escapeHtml(metric.latestDate) +
    '</span>' +
    '<span>本月累计 ' +
    escapeHtml(formatSignedCurrency(metric.monthlyChange)) +
    '</span>';

  Array.from(axisElement.children).forEach((child) => {
    if (child.textContent.indexOf('本月累计') !== -1) {
      applyTrendClass(child, metric.monthlyChange);
    }
  });
}

function getTrendColor(value) {
  if (value > 0) {
    return '#ff667d';
  }
  if (value < 0) {
    return '#4fce8f';
  }
  return '#99a4b4';
}

function buildXLabels(points, xAt, chartHeight, bottomPadding) {
  const labelIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));
  return labelIndexes
    .map((index) => {
      const label = points[index].date.slice(5);
      return (
        '<text class="chart-x-label" x="' +
        xAt(index) +
        '" y="' +
        (chartHeight - bottomPadding / 2 + 10) +
        '" text-anchor="middle">' +
        escapeHtml(label) +
        '</text>'
      );
    })
    .join('');
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.round(value));
}

function formatSignedCurrency(value) {
  if (value === 0) {
    return '±' + formatCurrency(0).replace(/^[-+]?/, '');
  }
  return (value > 0 ? '+' : '-') + formatCurrency(Math.abs(value)).replace(/^[-+]?/, '');
}

function formatSignedShort(value) {
  const absoluteValue = Math.abs(Math.round(value));
  const baseText = absoluteValue >= 10000
    ? (absoluteValue / 10000).toFixed(1).replace(/\.0$/, '') + '万'
    : absoluteValue.toLocaleString('zh-CN');

  if (value === 0) {
    return '0';
  }
  return (value > 0 ? '+' : '-') + baseText;
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

function setTrend(id, value) {
  const element = document.getElementById(id);
  if (element) {
    applyTrendClass(element, value);
  }
}

function applyTrendClass(element, value) {
  element.classList.remove('trend-up', 'trend-down', 'trend-flat');
  if (value > 0) {
    element.classList.add('trend-up');
  } else if (value < 0) {
    element.classList.add('trend-down');
  } else {
    element.classList.add('trend-flat');
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
