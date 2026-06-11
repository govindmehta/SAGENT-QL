import path from 'path';
import ExcelJS from 'exceljs';

async function makeDummyExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('sales');

  worksheet.columns = [
    { header: 'item_name', key: 'item_name', width: 24 },
    { header: 'units_sold', key: 'units_sold', width: 14 },
    { header: 'sale_date', key: 'sale_date', width: 18 },
  ];

  worksheet.addRows([
    { item_name: 'Notebook Pro', units_sold: 12, sale_date: '2026-06-01' },
    { item_name: 'Laser Mouse', units_sold: 24, sale_date: '2026-06-02' },
    { item_name: 'USB-C Dock', units_sold: 0, sale_date: '2026-06-03' },
    { item_name: '27-inch Monitor', units_sold: 5, sale_date: '2026-06-04' },
    { item_name: 'Keyboard', units_sold: 18, sale_date: '2026-06-05' },
  ]);

  const outputPath = path.resolve(process.cwd(), 'test_sales.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`Created ${outputPath}`);
}

makeDummyExcel().catch((error) => {
  console.error('Failed to create test_sales.xlsx:', error);
  process.exitCode = 1;
});