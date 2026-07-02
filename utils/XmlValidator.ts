import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { TransactionRecord } from "../types/interface";

export class XmlValidator {
    static async verifyXmlData(finalXmlPath: string, record: TransactionRecord) {
        if (!finalXmlPath || !fs.existsSync(finalXmlPath)) {
            console.log(`XML file not found at: ${finalXmlPath}`);
            return;
        }

        const txnCode = String(record['Transaction code']);
        const amount = String(record['Amount']);
        const currency = String(record['Currency']);
        const countryCode = String(record['Country code']);
        const bankName = String(record['Bank name'] || '').trim();
        const accountNum = String(record['Account']);

        console.log(`\n=== Starting XML Data Validation for ${txnCode} ===`);

        const xmlData = fs.readFileSync(finalXmlPath, 'utf8');

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseTagValue: false,
            parseAttributeValue: false
        });

        const parsedObj = parser.parse(xmlData);

        const pmtInf = parsedObj.Document?.CstmrCdtTrfInitn?.PmtInf;
        let rawTxInf = pmtInf?.CdtTrfTxInf;

        if (!rawTxInf) {
            console.log("Could not locate CdtTrfTxInf node in XML structure.");
            return;
        }

        const txInfArray = Array.isArray(rawTxInf) ? rawTxInf : [rawTxInf];

        let txInf = null;
        const cleanExcelAcc = accountNum.replace(/[^a-zA-Z0-9]/g, '');

        for (const tx of txInfArray) {
            const xmlAccRaw = tx?.CdtrAcct?.Id?.Othr?.Id || tx?.CdtrAcct?.Id?.IBAN || "";
            const cleanXmlAcc = String(xmlAccRaw).trim().replace(/[^a-zA-Z0-9]/g, '');

            if (cleanXmlAcc === cleanExcelAcc || cleanExcelAcc.includes(cleanXmlAcc) || cleanXmlAcc.includes(cleanExcelAcc)) {
                txInf = tx;
                break;
            }
        }

        if (!txInf) {
            console.log(`ERROR: Could not find any transaction matching Account [${accountNum}] in the XML file!`);
            console.log(`The XML contained ${txInfArray.length} other transactions. Did Kyriba process the wrong batch?`);
            return;
        }

        const xmlAmountNode = txInf?.Amt?.InstdAmt;
        const xmlAmount = typeof xmlAmountNode === 'object' ? xmlAmountNode['#text'] : xmlAmountNode;
        const xmlCurrency = typeof xmlAmountNode === 'object' ? xmlAmountNode['@_Ccy'] : pmtInf?.DbtrAcct?.Ccy;
        const xmlCountry = txInf?.Cdtr?.PstlAdr?.Ctry || txInf?.CdtrAgt?.FinInstnId?.PstlAdr?.Ctry;
        const xmlBankName = String(txInf?.CdtrAgt?.FinInstnId?.Nm || "").trim();

        const xmlAccountRaw = txInf?.CdtrAcct?.Id?.Othr?.Id || txInf?.CdtrAcct?.Id?.IBAN || "";
        const xmlAccount = String(xmlAccountRaw).trim();

        console.log(`\n=== Node Parsing Validation Proof [${txnCode}] ===`);

        if (Number(xmlAmount) === Number(amount)) {
            console.log(`Amount   : Excel [${amount}] == XML [${xmlAmount}]`);
        } else {
            console.log(`Amount Mismatch : Excel [${amount}] != XML [${xmlAmount}]`);
        }

        if (xmlCurrency === currency) {
            console.log(`Currency : Excel [${currency}] == XML [${xmlCurrency}]`);
        } else {
            console.log(`Currency Mismatch: Excel [${currency}] != XML [${xmlCurrency}]`);
        }

        if (xmlCountry === countryCode) {
            console.log(`Country  : Excel [${countryCode}] == XML [${xmlCountry}]`);
        } else {
            console.log(`Country Mismatch : Excel [${countryCode}] != XML [${xmlCountry}]`);
        }

        if (xmlBankName && bankName !== 'undefined' && bankName !== '') {
            if (xmlBankName.toLowerCase().includes(bankName.toLowerCase())) {
                console.log(`Bank     : Excel [${bankName}] == XML [${xmlBankName}]`);
            } else {
                console.log(`Bank Mismatch    : Excel [${bankName}] not found in XML [${xmlBankName}]`);
            }
        }

        let accountPasses = false;
        let accountMatchLogic = "Mismatch";

        const cleanXmlAccToCompare = xmlAccount.replace(/[^a-zA-Z0-9]/g, '');

        if (cleanXmlAccToCompare === cleanExcelAcc) {
            accountPasses = true;
            accountMatchLogic = "Exact Match";
        } else if (/^0+$/.test(cleanXmlAccToCompare) || cleanXmlAccToCompare === '') {
            accountPasses = true;
            accountMatchLogic = "Masked/Zeroed Match";
        } else if (cleanExcelAcc.includes(cleanXmlAccToCompare) || cleanXmlAccToCompare.includes(cleanExcelAcc)) {
            accountPasses = true;
            accountMatchLogic = "Truncated/Substring Match";
        }

        if (accountPasses) {
            console.log(`Account  : Excel [${accountNum}] == XML [${xmlAccount}] (${accountMatchLogic})`);
        } else {
            console.log(`Account Mismatch : Excel [${accountNum}] != XML [${xmlAccount}]`);
        }

        console.log(`Validation process complete for ${txnCode}!\n`);
    }
}