import * as xlsx from "xlsx";
import { TransactionRecord } from '../types/interface';

export class ExcelHelper {
    static getValue(record: TransactionRecord, targetName: string): string {
        const cleanTarget = targetName.toLowerCase().replace(/\s+/g, '');
        for (const key in record) {
            if (key.toLowerCase().replace(/\s+/g, '') === cleanTarget) {
                const val = String(record[key]);
                return (val === 'undefined' || val === 'null') ? '' : val.trim();
            }
        }
        return '';
    }

    static writeResultToExcel(filePath: string, rowIndex: number, resultValue: string) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const excelRowNumber = rowIndex + 3;
        const cellAddress = `AE${excelRowNumber}`;

        worksheet[cellAddress] = { t: 's', v: resultValue };

        xlsx.writeFile(workbook, filePath);
        console.log(`SUCCESS: Wrote '${resultValue}' to Excel cell ${cellAddress}`);
    }
}