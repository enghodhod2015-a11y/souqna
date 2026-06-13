export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('ar-YE');
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(amount || 0);
};

