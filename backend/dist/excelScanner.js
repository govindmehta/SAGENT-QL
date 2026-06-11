"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanLocalWorkbook = scanLocalWorkbook;
const path_1 = __importDefault(require("path"));
const exceljs_1 = __importDefault(require("exceljs"));
function normalizeCellValue(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'object') {
        return Array.isArray(value) ? value : JSON.parse(JSON.stringify(value));
    }
    return value;
}
function readWorkbookSheet(worksheet) {
    const headerRow = worksheet.getRow(1);
    const headers = Array.from({ length: headerRow.cellCount }, (_value, index) => {
        const cellValue = headerRow.getCell(index + 1).text?.trim() || String(headerRow.getCell(index + 1).value ?? '').trim();
        return cellValue || `Column ${index + 1}`;
    });
    const sampleRows = [2, 3, 4].map((rowNumber) => {
        const row = worksheet.getRow(rowNumber);
        return headers.reduce((rowObject, header, index) => {
            rowObject[header] = normalizeCellValue(row.getCell(index + 1).value);
            return rowObject;
        }, {});
    });
    return {
        sheetName: worksheet.name,
        headers,
        sampleRows,
        totalRowCount: worksheet.rowCount,
    };
}
async function scanLocalWorkbook(filePath) {
    try {
        const workbook = new exceljs_1.default.Workbook();
        const extension = path_1.default.extname(filePath).toLowerCase();
        if (extension === '.csv') {
            const worksheet = await workbook.csv.readFile(filePath);
            return readWorkbookSheet(worksheet);
        }
        if (extension === '.xlsx' || extension === '.xlsm' || extension === '.xls') {
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                return { error: 'No worksheets were found in the workbook.' };
            }
            return readWorkbookSheet(worksheet);
        }
        return { error: `Unsupported spreadsheet format: ${extension || 'unknown'}` };
    }
    catch (error) {
        return {
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
