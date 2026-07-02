import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

export class TraceMonitorPage {
    constructor(private page: Page) { }

    async monitorAndDownloadTrace(finalReferenceNumber: string, txnCode: string, downloadDir: string): Promise<string> {
        await this.page.waitForTimeout(15000);
        await this.page.getByText('Core Data').click();
        await this.page.locator('div').filter({ hasText: /^Data Exchange$/ }).first().click();
        await this.page.getByRole('menu', { name: 'Inquire' }).click();
        await this.page.getByText('Monitor traces').click();
        await this.page.getByRole('link', { name: 'Launch: Monitor traces (BU)' }).click();
        await this.page.waitForLoadState('networkidle');

        let fileFound = false;
        for (let i = 0; i < 8; i++) {
            console.log(`Search attempt ${i + 1} for: ${finalReferenceNumber}`);
            await this.page.locator('text=/Filter:/').first().click();
            await this.page.waitForTimeout(1500);

            const resetButton = this.page.getByRole('button', { name: 'Reset' });
            if (await resetButton.isVisible()) {
                await resetButton.click();
                await this.page.waitForTimeout(1000);
            }

            await this.page.getByRole('textbox').first().click();
            await this.page.getByRole('textbox').first().fill('');
            await this.page.getByRole('textbox').first().fill(finalReferenceNumber);
            await this.page.getByRole('button', { name: 'Apply' }).click();
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(3000);

            const notFoundPopup = this.page.getByText('The data you are looking for could not be found');
            const okButton = this.page.getByRole('button', { name: 'Ok' });

            if (await notFoundPopup.isVisible()) {
                console.log(`Backend still processing... waiting 10 seconds.`);
                await okButton.click();
                await this.page.waitForTimeout(10000);
            } else {
                fileFound = true;
                break;
            }
        }

        if (!fileFound) {
            throw new Error(`Timeout: Kyriba never generated trace file for ${finalReferenceNumber}`);
        }

        await this.page.locator('.customDataGridCell > div').first().click();
        await this.page.waitForTimeout(1000);

        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const client = await this.page.context().newCDPSession(this.page);
        await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });

        const filesBefore = new Set(fs.readdirSync(downloadDir));
        await this.page.getByRole('menuitem', { name: 'Download files' }).click();
        console.log(`Clicked download... forcing Chrome to save to: ${downloadDir}`);

        let downloadedFileFullPath: string | null = null;
        let foundFileName: string | null = null;

        for (let i = 0; i < 45; i++) {
            await this.page.waitForTimeout(1000);
            const filesAfter = fs.readdirSync(downloadDir);
            const newFiles = filesAfter.filter(f => !filesBefore.has(f));

            for (const file of newFiles) {
                if (file.endsWith('.crdownload') || file.endsWith('.tmp')) continue;
                const fullPath = path.join(downloadDir, file);

                // SAFE CHECK: Check if file actually exists before stat
                if (fs.existsSync(fullPath)) {
                    const stats = fs.statSync(fullPath);
                    if (stats.size > 0) {
                        downloadedFileFullPath = fullPath;
                        foundFileName = file;
                        break;
                    }
                }
            }
            if (downloadedFileFullPath) break;
            console.log(`Scanning directory... (${i + 1}s)`);
        }

        if (!downloadedFileFullPath) {
            throw new Error(`Download failed. Chrome did not place the file in ${downloadDir}`);
        }

        const customFileName = `${txnCode}_${finalReferenceNumber}.TRT.zip`;
        const finalDestination = path.join(downloadDir, customFileName);
        await this.page.waitForTimeout(1500);
        fs.renameSync(downloadedFileFullPath, finalDestination);
        console.log(`Success! Found ${foundFileName} and renamed it to ${customFileName}`);

        return finalDestination;
    }
}