"use client";

import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function ConsumptionLine({ labels, values }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Monthly Consumption',
        data: values,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)'
      }
    ]
  };
  const options = { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } } };
  return <Line data={data} options={options} />;
}

export function SupplierBar({ labels, values }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Active Suppliers',
        data: values,
        backgroundColor: 'rgba(53, 162, 235, 0.5)'
      }
    ]
  };
  const options = { responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } } };
  return <Bar data={data} options={options} />;
}


