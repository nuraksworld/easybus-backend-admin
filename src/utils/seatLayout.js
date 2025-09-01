export function generateSeatLabels(totalSeats = 45) {
  const labels = [];
  let count = 0;
  const lastRow = 5;
  const rows4 = Math.floor((totalSeats - lastRow) / 4);
  for (let r = 0; r < rows4; r++) for (let i = 0; i < 4; i++) labels.push(String(++count));
  for (let i = 0; i < lastRow; i++) labels.push(String(++count));
  while (labels.length < totalSeats) labels.push(String(++count));
  return labels;
}
