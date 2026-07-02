import { Page } from "@playwright/test";

export class HsbcValidatorPage {

    constructor(private page: Page) { }

    // ONE-TIME SETUP
    async performLogin() {
        console.log(`\n=== Performing One-Time HSBC Login ===`);
        await this.page.goto('https://develop.hsbc.com/user/login?destination=/tools/file-validator');

        const cookieBtn = this.page.getByRole('button', { name: 'Accept all cookies' });
        if (await cookieBtn.isVisible({ timeout: 5000 })) {
            await cookieBtn.click();
            await this.page.waitForTimeout(1000);
        }

        const emailInput = this.page.getByRole('textbox', { name: 'Email*' }).first();
        if (await emailInput.isVisible({ timeout: 5000 })) {
            // SIMULATE REAL HUMAN TYPING
            await emailInput.click();
            await emailInput.pressSequentially('Nandhini.Gopal@triconinfotech.com', { delay: 50 });

            const passwordInput = this.page.getByRole('textbox', { name: 'Password*' }).first();
            await passwordInput.click();
            await passwordInput.pressSequentially('Nandhini@2004', { delay: 50 });

            // Wait a split second to ensure the frontend registered the final character
            await this.page.waitForTimeout(500);
            await this.page.getByRole('button', { name: 'Log On' }).first().click();

            // Wait until the tool actually loads before saving state
            await this.page.getByRole('button', { name: /Browse your system/i }).waitFor({ state: 'visible', timeout: 30000 });
            console.log(`HSBC Login Successful. Ready to save state.`);
        }
    }

    // MAIN VALIDATION LOOP
    async validateXmlAndGetResult(xmlFilePath: string): Promise<string> {
        console.log(`\n=== Starting HSBC File Validation ===`);

        // Navigate to the tool.
        await this.page.goto('https://develop.hsbc.com/user/login?destination=/tools/file-validator');

        const cookieBtn = this.page.getByRole('button', { name: 'Accept all cookies' });
        if (await cookieBtn.isVisible({ timeout: 3000 })) {
            await cookieBtn.click();
            await this.page.waitForTimeout(1000);
        }

        // SMART FALLBACK (Human Typing Version)
        const emailInput = this.page.getByRole('textbox', { name: 'Email*' }).first();
        if (await emailInput.isVisible({ timeout: 3000 })) {
            console.log('HSBC session lost. Re-authenticating dynamically...');

            await emailInput.click();
            await emailInput.pressSequentially('Nandhini.Gopal@triconinfotech.com', { delay: 50 });

            const passwordInput = this.page.getByRole('textbox', { name: 'Password*' }).first();
            await passwordInput.click();
            await passwordInput.pressSequentially('Nandhini@2004', { delay: 50 });

            await this.page.waitForTimeout(500);
            await this.page.getByRole('button', { name: 'Log On' }).first().click();
        }

        // ==========================================
        // BULLETPROOF FIX: Conditionally Check ISO Box
        // ==========================================
        const isoCheckbox = this.page.locator('#futureIsoCheckbox');

        // Wait for the element to be attached in the DOM
        await isoCheckbox.waitFor({ state: 'attached', timeout: 10000 });

        // Explicitly check its current status
        const isTicked = await isoCheckbox.isChecked();

        if (!isTicked) {
            console.log(`ISO Checkbox is NOT ticked. Clicking it now...`);
            // Clicking the visible text label is much safer than force-clicking a hidden input
            await this.page.getByText('Include future ISO validation').click();
        } else {
            console.log(`ISO Checkbox is ALREADY ticked. Skipping click.`);
        }

        await this.page.waitForTimeout(1000); // Give the UI a second to register the tick
        // ==========================================

        // Trigger the file chooser and upload the XML
        const fileChooserPromise = this.page.waitForEvent('filechooser');

        // Wait for the "Browse" button. This guarantees we are on the tool page and logged in.
        const browseBtn = this.page.getByRole('button', { name: /Browse your system/i });
        await browseBtn.waitFor({ state: 'visible', timeout: 30000 });
        await browseBtn.click();

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(xmlFilePath);

        // Wait for uploading and click Validate if the button appears
        const validateBtn = this.page.getByRole('button', { name: /Validate/i });
        // Increased timeout so it survives slow sandbox uploads
        if (await validateBtn.isVisible({ timeout: 60000 })) {
            await validateBtn.click();
        }

        // Wait for processing to complete ("Open report" button/link appears)
        console.log(`Waiting for HSBC to finish testing the file...`);
        const openReportLocator = this.page.locator('a, button').filter({ hasText: /Open report|Open the validation report/i }).first();
        await openReportLocator.waitFor({ state: 'visible', timeout: 360000 });

        // ==========================================
        // DOWNLOAD LOGIC
        // ==========================================
        console.log(`Downloading the report...`);
        const downloadPromise = this.page.waitForEvent('download');

        // Using a robust locator based on the visible text in your screenshot
        const downloadBtnLocator = this.page.locator('a, button').filter({ hasText: /Download report/i }).first();
        await downloadBtnLocator.click();

        const download = await downloadPromise;
        console.log(`Download initiated: ${download.suggestedFilename()}`);


        // Click "Open report" and handle the new popup tab
        console.log(`Opening the report tab...`);
        const reportPagePromise = this.page.waitForEvent('popup');
        await openReportLocator.click();
        const reportPage = await reportPagePromise;
        await reportPage.waitForLoadState('domcontentloaded');

        await reportPage.waitForTimeout(2000);

        const fullPageText = await reportPage.locator('body').innerText();

        // Collapse any weird line breaks or extra spaces into a single searchable string
        const normalizedText = fullPageText.replace(/\s+/g, ' ');

        // Safely determine the File Level status
        let fileLevelText = 'File level - Unknown';
        if (normalizedText.match(/File level - Accepted/i)) fileLevelText = 'File level - Accepted';
        else if (normalizedText.match(/File level - Rejected/i)) fileLevelText = 'File level - Rejected';
        else if (normalizedText.match(/File level - Not applicable/i)) fileLevelText = 'File level - Not applicable';

        // Safely determine the Instruction Level status
        let instLevelText = 'Instruction level - Unknown';
        if (normalizedText.match(/Instruction level - Accepted/i)) instLevelText = 'Instruction level - Accepted';
        else if (normalizedText.match(/Instruction level - Rejected/i)) instLevelText = 'Instruction level - Rejected';
        else if (normalizedText.match(/Instruction level - Not applicable/i)) instLevelText = 'Instruction level - Not applicable';

        console.log(`Report Output -> ${fileLevelText}`);
        console.log(`Report Output -> ${instLevelText}`);

        // Strict Validation Logic
        let finalResult = 'Rejected';
        if (fileLevelText.toLowerCase().includes('accepted') && instLevelText.toLowerCase().includes('accepted')) {
            finalResult = 'Accepted';
        }

        console.log(`Final Determined Result: ${finalResult}`);

        // Cleanup
        await reportPage.close();

        return finalResult;
    }
}