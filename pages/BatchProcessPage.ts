import { Page } from "@playwright/test";

export class BatchProcessPage {
    constructor(private page: Page) { }

    async processBatchAndGetReference(thirdPartyName: string): Promise<string> {
        console.log(`\n=== Processing Row: ${thirdPartyName} ===`);

        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(3000);

        // ==========================================
        // SAFE FIX: HANDLE WEEKEND/NON-WORKING DAY POPUP
        // ==========================================
        const continueBtn = this.page.getByRole('button', { name: 'Continue' });
        // If the popup appears, click it. If it doesn't, skip and keep going safely.
        if (await continueBtn.isVisible({ timeout: 3000 })) {
            console.log("Non-working day warning detected. Clicking Continue...");
            await continueBtn.click();
            await this.page.waitForTimeout(1000); // Quick pause to let the popup disappear
        }
        // ==========================================

        const checkbox = this.page.locator('input.customDataGridCellCheckbox').last();
        await checkbox.waitFor({ state: 'visible', timeout: 5000 });
        await checkbox.check({ force: true });
        await this.page.waitForTimeout(1000);

        await this.page.getByRole('button', { name: 'Launch the batch process' }).click();

        const warningPopup = this.page.getByText('The selection does not contain any transaction');
        if (await warningPopup.isVisible({ timeout: 2500 })) {
            console.log(`Checkbox event missed by Kyriba. Retrying...`);
            await this.page.getByRole('button', { name: 'Continue' }).click();
            await this.page.waitForTimeout(1000);
            await checkbox.locator('..').click({ force: true });
            await this.page.waitForTimeout(1500);
            await this.page.getByRole('button', { name: 'Launch the batch process' }).click();
        }

        await this.page.getByRole('button', { name: 'Ok' }).click();
        await this.page.waitForLoadState('networkidle');

        await this.page.getByRole('button', { name: 'Save' }).click();
        await this.page.waitForLoadState('networkidle');

        await this.page.waitForTimeout(3000);
        const rawBatchNumber = await this.page.locator('.customDataGridCell').nth(3).innerText();
        const finalReferenceNumber = rawBatchNumber.replace(/_/g, '').trim();

        console.log(`Extracted Reference Number: ${finalReferenceNumber}`);
        return finalReferenceNumber;
    }
}