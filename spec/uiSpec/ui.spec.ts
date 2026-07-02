import { test } from "@playwright/test";
import * as xlsx from "xlsx";
import * as path from "path";
import * as os from "os";
import { TransactionRecord } from "../../types/interface";
import { LoginPage } from "../../pages/LoginPage";
import { TransferPage } from "../../pages/TransferPage";
import { BatchProcessPage } from "../../pages/BatchProcessPage";
import { TraceMonitorPage } from "../../pages/TraceMonitorPage";
import { HsbcValidatorPage } from "../../pages/HsbcValidatorPage";
import { FileHelper } from "../../utils/FileHelper";
import { XmlValidator } from "../../utils/XmlValidator";
import { ExcelHelper } from "../../utils/ExcelHelper";

// ==========================================
// CONFIGURATION & SETUP
// ==========================================

const excelFilePath = process.env.USER_EXCEL_PATH || path.join(__dirname, "../../resource/uiTestData/Transaction.xlsx");
const workbook = xlsx.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const transactionsData: TransactionRecord[] = xlsx.utils.sheet_to_json(worksheet, { range: 1, defval: "" });

const resource = "/";
const DOWNLOAD_DIR = path.join(os.homedir(), "Downloads");

// ==========================================
// PLAYWRIGHT WORKER CONFIGURATION
// ==========================================
test.use({
    channel: 'chrome',
    launchOptions: { slowMo: 300 }
});

// ==========================================
// EXECUTION
// ==========================================
test.describe('Kyriba End-to-End Workflow', () => {

    test('Validate all Menu Items in Home Page & Login (One-Time Setup)', async ({ page, baseURL }) => {
        // 1. Log into Kyriba (Always happens)
        const url = baseURL + resource;
        const loginPage = new LoginPage(page);
        await loginPage.performLogin(url);

        // 2. SMART CHECK: Do we even have HSBC transactions today?
        const requiresHsbc = transactionsData.some(record => {
            const bankName = String(record['Bank name'] || '').toLowerCase();
            const debitAcc = String(record['Debit account'] || '').toLowerCase();
            return bankName.includes('hsbc') || debitAcc.includes('hsb');
        });

        // 3. Log into HSBC ONLY if there is at least one HSBC transaction in the Excel file
        if (requiresHsbc) {
            console.log("HSBC transactions detected. Performing HSBC Login...");
            const hsbcValidatorPage = new HsbcValidatorPage(page);
            await hsbcValidatorPage.performLogin();
        } else {
            console.log("No HSBC transactions detected today. Skipping HSBC Login!");
        }

        await page.context().storageState({ path: '.auth/state.json' });
    });

    test.describe('Automated Transactions Loop', () => {
        test.use({ storageState: '.auth/state.json' });

        test.afterEach(async ({ }, testInfo) => {
            if (testInfo.status !== 'passed') {
                const indexAnnotation = testInfo.annotations.find(a => a.type === 'ROW_INDEX');
                const rowIndex = indexAnnotation ? indexAnnotation.description : '0';

                const txnAnnotation = testInfo.annotations.find(a => a.type === 'TXN_CODE');
                const txnCode = txnAnnotation ? txnAnnotation.description : 'Unknown';

                console.log(`UI_UPDATE|ERROR|${rowIndex}|${txnCode}|Failed (Check Report)`);
            }
        });

        for (let i = 0; i < transactionsData.length; i++) {
            const record = transactionsData[i];

            if (!record['Transaction code']) continue;

            const safeTxnCode = String(record['Transaction code']).trim();

            test(`Complete Transfer Workflow for: Row ${i + 1} - ${safeTxnCode}`, async ({ page, baseURL }, testInfo) => {
                test.setTimeout(360000);

                testInfo.annotations.push({ type: 'ROW_INDEX', description: String(i) });
                testInfo.annotations.push({ type: 'TXN_CODE', description: safeTxnCode });

                console.log(`UI_UPDATE|PROCESSING|${i}|${safeTxnCode}`);

                const transferPage = new TransferPage(page);
                const batchPage = new BatchProcessPage(page);
                const tracePage = new TraceMonitorPage(page);
                const hsbcValidatorPage = new HsbcValidatorPage(page);

                // Steps 1 to 5: Standard Kyriba Processing (Always happens)
                await transferPage.fillTransferDetails(baseURL as string, record);
                const finalReferenceNumber = await batchPage.processBatchAndGetReference(safeTxnCode);

                const finalDestination = await tracePage.monitorAndDownloadTrace(
                    finalReferenceNumber, safeTxnCode, DOWNLOAD_DIR
                );

                const finalXmlPath = await FileHelper.extractZipAndGetXml(finalDestination, record, DOWNLOAD_DIR);
                await XmlValidator.verifyXmlData(finalXmlPath, record);

                // ==========================================
                // SMART CHECK: Is this specific row an HSBC transaction?
                // ==========================================
                const bankNameStr = String(record['Bank name'] || '').toLowerCase();
                const debitAccStr = String(record['Debit account'] || '').toLowerCase();
                const isHsbcTransaction = bankNameStr.includes('hsbc') || debitAccStr.includes('hsb');

                let validationResult = "";

                if (isHsbcTransaction) {
                    console.log(`Row ${i + 1} is an HSBC transaction. Validating...`);
                    validationResult = await hsbcValidatorPage.validateXmlAndGetResult(finalXmlPath);
                } else {
                    console.log(`Row ${i + 1} is NOT HSBC (${bankNameStr}). Bypassing validation...`);
                    validationResult = "N/A (Non-HSBC Bank)";
                }
                // ==========================================

                // Update the Excel file immediately with the result
                ExcelHelper.writeResultToExcel(excelFilePath, i, validationResult);
                await FileHelper.cleanupTabs(page);

                // Tell the UI it finished!
                console.log(`UI_UPDATE|SUCCESS|${i}|${safeTxnCode}|Ref: ${finalReferenceNumber} - ${validationResult}`);
            });
        }
    });
});