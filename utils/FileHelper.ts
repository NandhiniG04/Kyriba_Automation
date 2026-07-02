import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import * as zlib from "zlib";
import { Page } from "@playwright/test";
import { TransactionRecord } from "../types/interface";

export class FileHelper {
    static async extractZipAndGetXml(finalDestination: string, record: TransactionRecord, downloadDir: string): Promise<string> {
        let finalXmlPath = '';
        const txnCode = String(record['Transaction code'] || 'UNKNOWN');
        const transferType = String(record['Transfer'] || 'UNKNOWN');
        const beneficiaryName = String(record['Name'] || 'UnknownParty');

        let payFromCountry = '';
        for (const key in record) {
            if (key.toLowerCase().replace(/\s+/g, '') === 'payfromcountry') {
                const val = String(record[key]);
                payFromCountry = (val === 'undefined' || val === 'null') ? '' : val.trim();
                break;
            }
        }

        if (!payFromCountry) {
            for (const key in record) {
                if (key.toLowerCase().replace(/\s+/g, '') === 'countrycode') {
                    const val = String(record[key]);
                    payFromCountry = (val === 'undefined' || val === 'null') ? '' : val.trim();
                    break;
                }
            }
        }

        const zipBaseName = path.basename(finalDestination, '.zip');
        const extractedFolder = path.join(downloadDir, `${zipBaseName}_extracted`);
        const mainZip = new AdmZip(finalDestination);
        mainZip.extractAllTo(extractedFolder, true);

        const extractedFiles = fs.readdirSync(extractedFolder);
        let rawContent: Buffer | string | null = null;

        const targetFile = extractedFiles.find(f =>
            f.endsWith('.xml') || ((f.includes('KYRIBA') || f.includes('payment')) && !f.endsWith('.fa'))
        );

        if (targetFile) {
            const targetFilePath = path.join(extractedFolder, targetFile);

            if (targetFile.endsWith('.xml')) {
                rawContent = fs.readFileSync(targetFilePath);
            } else {
                const buffer = fs.readFileSync(targetFilePath);

                // Read File Magic Numbers directly without using try-catch!
                if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
                    // It is a GZIP file
                    rawContent = zlib.gunzipSync(buffer);
                } else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
                    // It is a ZIP file
                    const nestedZip = new AdmZip(buffer);
                    const zipEntries = nestedZip.getEntries();
                    if (zipEntries.length > 0) {
                        rawContent = zipEntries[0].getData();
                    }
                } else {
                    // It's a standard text/xml payload
                    rawContent = buffer;
                }
            }

            if (rawContent) {
                const timestamp = Date.now();
                const rawFileName = `${transferType}_${txnCode}_${payFromCountry}_${beneficiaryName}_${timestamp}.xml`;

                // FIXED: Strip out ALL characters except letters, numbers, dashes, underscores, and dots!
                const safeFileName = rawFileName
                    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
                    .replace(/_+/g, '_'); // removes double underscores created by replacing spaces/brackets

                finalXmlPath = path.join(downloadDir, safeFileName);
                fs.writeFileSync(finalXmlPath, rawContent);
                console.log(`Success! Extracted and saved strictly as: ${finalXmlPath}`);
            }
        } else {
            console.error(`Could not find the expected payload file for ${txnCode} inside ${extractedFolder}.`);
        }

        return finalXmlPath;
    }

    static async cleanupTabs(page: Page) {
        const allPages = page.context().pages();
        for (const p of allPages) {
            if (p !== page) await p.close().catch(() => { }); // Minimal native promise catch inside map
        }
        await page.waitForTimeout(2000);
    }
}